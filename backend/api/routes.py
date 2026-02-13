from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import logging
from .models import CreateSwapRequest, SwapResponse, BalanceResponse, RedeemSwapRequest
from htlc import HTLCEngine, SwapRecord, SwapStatus
from db import SwapStorage
from wallets import BitcoinWallet, DepixWallet

logger = logging.getLogger(__name__)

router = APIRouter()

# Global instances (in production, use dependency injection)
storage = SwapStorage()
htlc_engine = HTLCEngine()

# Wallet instances will be initialized in main.py
bitcoin_wallet: BitcoinWallet = None
depix_wallet: DepixWallet = None

def set_wallets(btc_wallet: BitcoinWallet, dpx_wallet: DepixWallet):
    global bitcoin_wallet, depix_wallet
    bitcoin_wallet = btc_wallet
    depix_wallet = dpx_wallet

@router.get("/balances", response_model=BalanceResponse)
async def get_balances():
    """Get current wallet balances"""
    try:
        depix_balance = 0.0
        btc_balance = 0.0
        
        try:
            depix_balance = await depix_wallet.get_balance()
        except Exception as e:
            logger.warning(f"Failed to get Depix balance: {e}")
        
        try:
            btc_balance = await bitcoin_wallet.get_balance()
        except Exception as e:
            logger.warning(f"Failed to get Bitcoin balance: {e}")
        
        return BalanceResponse(
            depix_balance=depix_balance,
            btc_balance=btc_balance
        )
    except Exception as e:
        logger.error(f"Balance check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/swaps", response_model=SwapResponse)
async def create_swap(request: CreateSwapRequest):
    """Create new atomic swap"""
    try:
        # Generate HTLC parameters
        secret = htlc_engine.generate_secret()
        hashlock = htlc_engine.create_hashlock(secret)
        timelock = htlc_engine.create_timelock(hours=24)
        
        # Create swap record
        swap_id = str(uuid.uuid4())
        swap = SwapRecord(
            swap_id=swap_id,
            depix_amount=request.depix_amount,
            btc_amount=request.btc_amount,
            secret=secret,
            hashlock=hashlock,
            timelock=timelock
        )
        
        # Lock Depix
        depix_htlc = await depix_wallet.create_htlc(
            request.depix_amount,
            hashlock,
            timelock,
            request.depix_recipient
        )
        swap.depix_txid = depix_htlc["txid"]

        try:
            # Lock Bitcoin
            btc_htlc = await bitcoin_wallet.create_htlc(
                request.btc_amount,
                hashlock,
                timelock,
                request.btc_recipient
            )
            swap.btc_txid = btc_htlc["txid"]
        except Exception as btc_err:
            # Persist partial state so operators can track and handle recovery/refund.
            swap.status = SwapStatus.FAILED
            storage.save_swap(swap.to_dict())
            raise Exception(f"Bitcoin lock failed after Depix lock. swap_id={swap_id}. error={btc_err}")
        
        swap.status = SwapStatus.LOCKED
        
        # Save to database
        storage.save_swap(swap.to_dict())
        
        return SwapResponse(**swap.to_dict())
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/swaps/{swap_id}", response_model=SwapResponse)
async def get_swap(swap_id: str):
    """Get swap status"""
    swap = storage.get_swap(swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    
    return SwapResponse(**swap)

@router.get("/swaps", response_model=List[SwapResponse])
async def list_swaps():
    """List all swaps"""
    swaps = storage.get_all_swaps()
    return [SwapResponse(**swap) for swap in swaps]

@router.post("/swaps/{swap_id}/redeem")
async def redeem_swap(swap_id: str, request: RedeemSwapRequest):
    """Redeem swap with secret"""
    swap = storage.get_swap(swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    
    # Verify secret
    if not htlc_engine.verify_secret(bytes.fromhex(request.secret), swap["hashlock"]):
        raise HTTPException(status_code=400, detail="Invalid secret")
    
    # Redeem both HTLCs
    await depix_wallet.redeem_htlc(swap["depix_txid"], request.secret)
    await bitcoin_wallet.redeem_htlc(swap["btc_txid"], request.secret)
    
    swap["status"] = SwapStatus.COMPLETED.value
    storage.save_swap(swap)
    
    return {"status": "completed", "swap_id": swap_id}

@router.post("/swaps/{swap_id}/refund")
async def refund_swap(swap_id: str):
    """Refund swap after timelock"""
    swap = storage.get_swap(swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    
    if not htlc_engine.is_timelock_expired(swap["timelock"]):
        raise HTTPException(status_code=400, detail="Timelock not expired")
    
    # Refund both HTLCs
    await depix_wallet.refund_htlc(swap["depix_txid"])
    await bitcoin_wallet.refund_htlc(swap["btc_txid"])
    
    swap["status"] = SwapStatus.REFUNDED.value
    storage.save_swap(swap)
    
    return {"status": "refunded", "swap_id": swap_id}
