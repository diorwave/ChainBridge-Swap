from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import time
import logging
from .models import (
    CreateOfferRequest, AcceptOfferRequest, LockFundsRequest, ClaimFundsRequest,
    SwapOfferResponse, SwapStatus, SwapRole
)
from htlc import HTLCEngine
from db import SwapStorage
from wallets import BitcoinWallet, DepixWallet

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/atomic", tags=["Atomic Swaps"])

# Global instances
storage = SwapStorage()
htlc_engine = HTLCEngine()

# Wallet instances (set from main.py)
bitcoin_wallet: BitcoinWallet = None
depix_wallet: DepixWallet = None

def set_wallets(btc_wallet: BitcoinWallet, dpx_wallet: DepixWallet):
    global bitcoin_wallet, depix_wallet
    bitcoin_wallet = btc_wallet
    depix_wallet = dpx_wallet

@router.post("/offers", response_model=SwapOfferResponse)
async def create_offer(request: CreateOfferRequest):
    """
    Step 1: Alice creates a swap offer
    
    Alice specifies:
    - What she's offering (BTC or Depix)
    - What she wants in return
    - Her receiving address
    """
    try:
        # Generate HTLC parameters
        secret = htlc_engine.generate_secret()
        hashlock = htlc_engine.create_hashlock(secret)
        
        # Initiator locks for 24 hours, acceptor for 12 hours
        initiator_timelock = htlc_engine.create_timelock(hours=24)
        acceptor_timelock = htlc_engine.create_timelock(hours=12)
        
        swap_id = str(uuid.uuid4())
        
        offer_data = {
            "swap_id": swap_id,
            "status": SwapStatus.OFFERED.value,
            "initiator_asset": request.initiator_asset.lower(),
            "initiator_amount": request.initiator_amount,
            "acceptor_asset": request.acceptor_asset.lower(),
            "acceptor_amount": request.acceptor_amount,
            "initiator_address": request.initiator_address,
            "hashlock": hashlock,
            "secret": secret.hex(),  # Store secret for initiator
            "initiator_timelock": initiator_timelock,
            "acceptor_timelock": acceptor_timelock,
            "created_at": int(time.time())
        }
        
        storage.create_offer(offer_data)
        
        logger.info(f"Created swap offer: {swap_id}")
        
        return SwapOfferResponse(**{k: v for k, v in offer_data.items() if k != 'secret'})
    
    except Exception as e:
        logger.error(f"Failed to create offer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/offers", response_model=List[SwapOfferResponse])
async def list_offers(status: str = None):
    """
    List swap offers
    
    Query params:
    - status: Filter by status (offered, accepted, etc.)
    """
    try:
        if status:
            offers = storage.get_all_offers(status=status)
        else:
            offers = storage.get_all_offers()
        
        return [SwapOfferResponse(**{k: v for k, v in offer.items() if k != 'secret'}) 
                for offer in offers]
    
    except Exception as e:
        logger.error(f"Failed to list offers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/offers/open", response_model=List[SwapOfferResponse])
async def list_open_offers():
    """
    List offers that can be accepted (status = offered)
    """
    try:
        offers = storage.get_open_offers()
        return [SwapOfferResponse(**{k: v for k, v in offer.items() if k != 'secret'}) 
                for offer in offers]
    
    except Exception as e:
        logger.error(f"Failed to list open offers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/offers/{swap_id}", response_model=SwapOfferResponse)
async def get_offer(swap_id: str):
    """Get specific swap offer"""
    offer = storage.get_offer(swap_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    return SwapOfferResponse(**{k: v for k, v in offer.items() if k != 'secret'})

@router.post("/offers/{swap_id}/accept", response_model=SwapOfferResponse)
async def accept_offer(swap_id: str, request: AcceptOfferRequest):
    """
    Step 2: Bob accepts a swap offer
    
    Bob provides his receiving address and commits to the swap
    """
    try:
        offer = storage.get_offer(swap_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer["status"] != SwapStatus.OFFERED.value:
            raise HTTPException(status_code=400, detail=f"Offer cannot be accepted (status: {offer['status']})")
        
        # Update offer with acceptor info
        storage.update_offer(swap_id, {
            "status": SwapStatus.ACCEPTED.value,
            "acceptor_address": request.acceptor_address,
            "accepted_at": int(time.time())
        })
        
        logger.info(f"Offer accepted: {swap_id}")
        
        updated_offer = storage.get_offer(swap_id)
        return SwapOfferResponse(**{k: v for k, v in updated_offer.items() if k != 'secret'})
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to accept offer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/offers/{swap_id}/lock-initiator", response_model=SwapOfferResponse)
async def lock_initiator_funds(swap_id: str):
    """
    Step 3: Alice locks her funds (INITIATOR LOCKS FIRST)
    
    Alice creates HTLC with her asset (BTC or Depix)
    """
    try:
        offer = storage.get_offer(swap_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer["status"] != SwapStatus.ACCEPTED.value:
            raise HTTPException(status_code=400, detail=f"Cannot lock funds (status: {offer['status']})")
        
        # Alice locks her asset
        asset = offer["initiator_asset"]
        amount = offer["initiator_amount"]
        recipient = offer["acceptor_address"]
        hashlock = offer["hashlock"]
        timelock = offer["initiator_timelock"]
        
        if asset == "btc":
            result = await bitcoin_wallet.create_htlc(amount, hashlock, timelock, recipient)
            txid = result["txid"]
        elif asset == "depix":
            result = await depix_wallet.create_htlc(amount, hashlock, timelock, recipient)
            txid = result["txid"]
        else:
            raise HTTPException(status_code=400, detail=f"Unknown asset: {asset}")
        
        storage.update_offer(swap_id, {
            "status": SwapStatus.INITIATOR_LOCKED.value,
            "initiator_txid": txid
        })
        
        logger.info(f"Initiator locked funds: {swap_id}, txid: {txid}")
        
        updated_offer = storage.get_offer(swap_id)
        return SwapOfferResponse(**{k: v for k, v in updated_offer.items() if k != 'secret'})
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to lock initiator funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/offers/{swap_id}/lock-acceptor", response_model=SwapOfferResponse)
async def lock_acceptor_funds(swap_id: str):
    """
    Step 4: Bob locks his funds (ACCEPTOR LOCKS SECOND)
    
    Bob verifies Alice's HTLC and creates his own
    """
    try:
        offer = storage.get_offer(swap_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer["status"] != SwapStatus.INITIATOR_LOCKED.value:
            raise HTTPException(status_code=400, detail=f"Initiator must lock first (status: {offer['status']})")
        
        # Bob locks his asset
        asset = offer["acceptor_asset"]
        amount = offer["acceptor_amount"]
        recipient = offer["initiator_address"]
        hashlock = offer["hashlock"]
        timelock = offer["acceptor_timelock"]
        
        if asset == "btc":
            result = await bitcoin_wallet.create_htlc(amount, hashlock, timelock, recipient)
            txid = result["txid"]
        elif asset == "depix":
            result = await depix_wallet.create_htlc(amount, hashlock, timelock, recipient)
            txid = result["txid"]
        else:
            raise HTTPException(status_code=400, detail=f"Unknown asset: {asset}")
        
        storage.update_offer(swap_id, {
            "status": SwapStatus.ACCEPTOR_LOCKED.value,
            "acceptor_txid": txid
        })
        
        logger.info(f"Acceptor locked funds: {swap_id}, txid: {txid}")
        
        updated_offer = storage.get_offer(swap_id)
        return SwapOfferResponse(**{k: v for k, v in updated_offer.items() if k != 'secret'})
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to lock acceptor funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/offers/{swap_id}/claim-initiator")
async def claim_initiator(swap_id: str):
    """
    Step 5: Alice claims Bob's funds (REVEALS SECRET)
    
    Alice uses her secret to claim Bob's asset
    Secret becomes public on blockchain
    """
    try:
        offer = storage.get_offer(swap_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer["status"] != SwapStatus.ACCEPTOR_LOCKED.value:
            raise HTTPException(status_code=400, detail=f"Both parties must lock first (status: {offer['status']})")
        
        # Alice claims with her secret
        secret = offer["secret"]
        acceptor_txid = offer["acceptor_txid"]
        
        # In production, this would broadcast a transaction with the secret
        # For PoC, we just mark as claimed
        
        storage.update_offer(swap_id, {
            "status": SwapStatus.INITIATOR_CLAIMED.value
        })
        
        logger.info(f"Initiator claimed funds: {swap_id}, secret revealed")
        
        return {
            "status": "claimed",
            "message": "Initiator claimed funds. Secret is now public!",
            "secret": secret,
            "swap_id": swap_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to claim initiator funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/offers/{swap_id}/claim-acceptor")
async def claim_acceptor(swap_id: str):
    """
    Step 6: Bob claims Alice's funds (USES REVEALED SECRET)
    
    Bob extracts secret from blockchain and claims Alice's asset
    SWAP COMPLETE!
    """
    try:
        offer = storage.get_offer(swap_id)
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer["status"] != SwapStatus.INITIATOR_CLAIMED.value:
            raise HTTPException(status_code=400, detail=f"Initiator must claim first (status: {offer['status']})")
        
        # Bob uses the revealed secret
        secret = offer["secret"]
        initiator_txid = offer["initiator_txid"]
        
        # In production, Bob would extract secret from blockchain
        # and use it to claim Alice's HTLC
        
        storage.update_offer(swap_id, {
            "status": SwapStatus.COMPLETED.value,
            "completed_at": int(time.time())
        })
        
        logger.info(f"Acceptor claimed funds: {swap_id}. SWAP COMPLETE!")
        
        return {
            "status": "completed",
            "message": "Swap completed successfully!",
            "swap_id": swap_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to claim acceptor funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))
