from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class SwapRole(str, Enum):
    INITIATOR = "initiator"  # Alice - creates offer, locks first
    ACCEPTOR = "acceptor"    # Bob - accepts offer, locks second

class SwapStatus(str, Enum):
    OFFERED = "offered"              # Alice created offer
    ACCEPTED = "accepted"            # Bob accepted
    INITIATOR_LOCKED = "initiator_locked"  # Alice locked her asset
    ACCEPTOR_LOCKED = "acceptor_locked"    # Bob locked his asset
    INITIATOR_CLAIMED = "initiator_claimed"  # Alice claimed (revealed secret)
    COMPLETED = "completed"          # Bob claimed, swap done
    REFUNDED = "refunded"           # Timelock expired
    CANCELLED = "cancelled"         # Manually cancelled

class CreateOfferRequest(BaseModel):
    """Alice creates a swap offer"""
    initiator_asset: str = Field(..., description="Asset Alice is offering (btc or depix)")
    initiator_amount: float = Field(..., gt=0, description="Amount Alice is offering")
    acceptor_asset: str = Field(..., description="Asset Alice wants (btc or depix)")
    acceptor_amount: float = Field(..., gt=0, description="Amount Alice wants")
    initiator_address: str = Field(..., description="Alice's receiving address")

class AcceptOfferRequest(BaseModel):
    """Bob accepts a swap offer"""
    acceptor_address: str = Field(..., description="Bob's receiving address")

class LockFundsRequest(BaseModel):
    """Lock funds in HTLC"""
    pass  # No additional data needed, uses swap context

class ClaimFundsRequest(BaseModel):
    """Claim funds from HTLC"""
    secret: Optional[str] = Field(None, description="Secret (only for initiator's first claim)")

class SwapOfferResponse(BaseModel):
    swap_id: str
    status: SwapStatus
    initiator_asset: str
    initiator_amount: float
    acceptor_asset: str
    acceptor_amount: float
    initiator_address: str
    acceptor_address: Optional[str] = None
    hashlock: str
    initiator_timelock: int
    acceptor_timelock: int
    initiator_txid: Optional[str] = None
    acceptor_txid: Optional[str] = None
    created_at: int
    accepted_at: Optional[int] = None

class BalanceResponse(BaseModel):
    depix_balance: float
    btc_balance: float

# Legacy models for backward compatibility
class CreateSwapRequest(BaseModel):
    depix_amount: float = Field(..., gt=0, description="Amount of Depix to swap")
    btc_amount: float = Field(..., gt=0, description="Amount of BTC to swap")
    btc_recipient: str = Field(..., description="Bitcoin recipient address")
    depix_recipient: str = Field(..., description="Depix recipient address")

class SwapResponse(BaseModel):
    swap_id: str
    depix_amount: float
    btc_amount: float
    hashlock: str
    timelock: int
    status: str
    depix_txid: Optional[str] = None
    btc_txid: Optional[str] = None
    created_at: int

class RedeemSwapRequest(BaseModel):
    swap_id: str
    secret: str
