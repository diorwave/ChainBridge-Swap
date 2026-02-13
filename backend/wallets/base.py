from abc import ABC, abstractmethod
from typing import Dict, Any

class WalletInterface(ABC):
    """Base interface for wallet implementations"""
    
    @abstractmethod
    async def get_balance(self) -> float:
        """Get wallet balance"""
        pass
    
    @abstractmethod
    async def create_htlc(self, amount: float, hashlock: str, timelock: int, recipient: str) -> Dict[str, Any]:
        """Create HTLC transaction"""
        pass
    
    @abstractmethod
    async def redeem_htlc(self, txid: str, secret: str) -> Dict[str, Any]:
        """Redeem HTLC with secret"""
        pass
    
    @abstractmethod
    async def refund_htlc(self, txid: str) -> Dict[str, Any]:
        """Refund HTLC after timelock expires"""
        pass
