import hashlib
import os
import time
from typing import Dict, Any, Optional
from enum import Enum

class SwapStatus(Enum):
    PENDING = "pending"
    LOCKED = "locked"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class HTLCEngine:
    """Core HTLC swap engine"""
    
    @staticmethod
    def generate_secret() -> bytes:
        """Generate random 32-byte secret"""
        return os.urandom(32)
    
    @staticmethod
    def create_hashlock(secret: bytes) -> str:
        """Create SHA256 hashlock from secret"""
        return hashlib.sha256(secret).hexdigest()
    
    @staticmethod
    def verify_secret(secret: bytes, hashlock: str) -> bool:
        """Verify secret matches hashlock"""
        return hashlib.sha256(secret).hexdigest() == hashlock
    
    @staticmethod
    def create_timelock(hours: int = 24) -> int:
        """Create timelock (Unix timestamp)"""
        return int(time.time()) + (hours * 3600)
    
    @staticmethod
    def is_timelock_expired(timelock: int) -> bool:
        """Check if timelock has expired"""
        return int(time.time()) > timelock

class SwapRecord:
    """Record of an atomic swap"""
    
    def __init__(
        self,
        swap_id: str,
        depix_amount: float,
        btc_amount: float,
        secret: bytes,
        hashlock: str,
        timelock: int
    ):
        self.swap_id = swap_id
        self.depix_amount = depix_amount
        self.btc_amount = btc_amount
        self.secret = secret
        self.hashlock = hashlock
        self.timelock = timelock
        self.status = SwapStatus.PENDING
        self.depix_txid: Optional[str] = None
        self.btc_txid: Optional[str] = None
        self.created_at = int(time.time())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "swap_id": self.swap_id,
            "depix_amount": self.depix_amount,
            "btc_amount": self.btc_amount,
            "hashlock": self.hashlock,
            "timelock": self.timelock,
            "status": self.status.value,
            "depix_txid": self.depix_txid,
            "btc_txid": self.btc_txid,
            "created_at": self.created_at
        }
