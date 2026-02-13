import sqlite3
import json
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

class SwapStorage:
    """SQLite storage for swap records"""
    
    def __init__(self, db_path: str = "swaps.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema"""
        with self._get_connection() as conn:
            # Legacy swaps table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS swaps (
                    swap_id TEXT PRIMARY KEY,
                    depix_amount REAL,
                    btc_amount REAL,
                    hashlock TEXT,
                    timelock INTEGER,
                    status TEXT,
                    depix_txid TEXT,
                    btc_txid TEXT,
                    created_at INTEGER
                )
            """)
            
            # New atomic swap offers table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS swap_offers (
                    swap_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    initiator_asset TEXT NOT NULL,
                    initiator_amount REAL NOT NULL,
                    acceptor_asset TEXT NOT NULL,
                    acceptor_amount REAL NOT NULL,
                    initiator_address TEXT NOT NULL,
                    acceptor_address TEXT,
                    hashlock TEXT NOT NULL,
                    secret TEXT,
                    initiator_timelock INTEGER NOT NULL,
                    acceptor_timelock INTEGER NOT NULL,
                    initiator_txid TEXT,
                    acceptor_txid TEXT,
                    created_at INTEGER NOT NULL,
                    accepted_at INTEGER,
                    completed_at INTEGER
                )
            """)
            conn.commit()
    
    @contextmanager
    def _get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    # Legacy swap methods
    def save_swap(self, swap_data: Dict[str, Any]):
        """Save or update swap record"""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO swaps 
                (swap_id, depix_amount, btc_amount, hashlock, timelock, status, depix_txid, btc_txid, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                swap_data["swap_id"],
                swap_data["depix_amount"],
                swap_data["btc_amount"],
                swap_data["hashlock"],
                swap_data["timelock"],
                swap_data["status"],
                swap_data.get("depix_txid"),
                swap_data.get("btc_txid"),
                swap_data["created_at"]
            ))
            conn.commit()
    
    def get_swap(self, swap_id: str) -> Optional[Dict[str, Any]]:
        """Get swap by ID"""
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM swaps WHERE swap_id = ?", (swap_id,)).fetchone()
            return dict(row) if row else None
    
    def get_all_swaps(self) -> List[Dict[str, Any]]:
        """Get all swaps"""
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM swaps ORDER BY created_at DESC").fetchall()
            return [dict(row) for row in rows]
    
    def get_pending_swaps(self) -> List[Dict[str, Any]]:
        """Get pending swaps"""
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM swaps WHERE status IN ('pending', 'locked') ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]
    
    # New atomic swap offer methods
    def create_offer(self, offer_data: Dict[str, Any]):
        """Create new swap offer"""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO swap_offers 
                (swap_id, status, initiator_asset, initiator_amount, acceptor_asset, acceptor_amount,
                 initiator_address, hashlock, secret, initiator_timelock, acceptor_timelock, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                offer_data["swap_id"],
                offer_data["status"],
                offer_data["initiator_asset"],
                offer_data["initiator_amount"],
                offer_data["acceptor_asset"],
                offer_data["acceptor_amount"],
                offer_data["initiator_address"],
                offer_data["hashlock"],
                offer_data.get("secret"),
                offer_data["initiator_timelock"],
                offer_data["acceptor_timelock"],
                offer_data["created_at"]
            ))
            conn.commit()
    
    def update_offer(self, swap_id: str, updates: Dict[str, Any]):
        """Update swap offer"""
        with self._get_connection() as conn:
            set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
            values = list(updates.values()) + [swap_id]
            conn.execute(f"UPDATE swap_offers SET {set_clause} WHERE swap_id = ?", values)
            conn.commit()
    
    def get_offer(self, swap_id: str) -> Optional[Dict[str, Any]]:
        """Get offer by ID"""
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM swap_offers WHERE swap_id = ?", (swap_id,)).fetchone()
            return dict(row) if row else None
    
    def get_all_offers(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all offers, optionally filtered by status"""
        with self._get_connection() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM swap_offers WHERE status = ? ORDER BY created_at DESC",
                    (status,)
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM swap_offers ORDER BY created_at DESC").fetchall()
            return [dict(row) for row in rows]
    
    def get_open_offers(self) -> List[Dict[str, Any]]:
        """Get offers that can be accepted"""
        return self.get_all_offers(status="offered")
    
    def get_active_offers(self) -> List[Dict[str, Any]]:
        """Get offers in progress"""
        with self._get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM swap_offers 
                WHERE status IN ('accepted', 'initiator_locked', 'acceptor_locked', 'initiator_claimed')
                ORDER BY created_at DESC
            """).fetchall()
            return [dict(row) for row in rows]
