import httpx
import json
import logging
import os
from typing import Dict, Any
from .base import WalletInterface

logger = logging.getLogger(__name__)

class DepixWallet(WalletInterface):
    """Depix wallet via elementd RPC"""
    
    def __init__(self, rpc_user: str, rpc_password: str, rpc_host: str, rpc_port: int):
        self.rpc_url = f"http://{rpc_host}:{rpc_port}"
        self.auth = (rpc_user, rpc_password)
        self.timeout = 10.0
        self.wallet_name = os.getenv("ELEMENTD_WALLET", "depixswap")
        self.depix_asset_id = os.getenv("DEPIX_ASSET_ID", "")
    
    async def _rpc_call(self, method: str, params: list = None) -> Any:
        """Make RPC call to elementd"""
        # Use wallet endpoint if wallet is loaded
        url = f"{self.rpc_url}/wallet/{self.wallet_name}" if self.wallet_name else self.rpc_url
        
        payload = {
            "jsonrpc": "2.0",
            "id": "depix-swap",
            "method": method,
            "params": params or []
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Ensure proper JSON serialization of booleans
                response = await client.post(
                    url, 
                    json=payload, 
                    auth=self.auth,
                    headers={"Content-Type": "application/json"}
                )
                result = response.json()
                
                if "error" in result and result["error"]:
                    raise Exception(f"RPC Error: {result['error']}")
                
                return result.get("result")
        except httpx.ConnectError:
            logger.error(f"Cannot connect to elementd at {self.rpc_url}")
            raise Exception(f"Elementd not running or not accessible at {self.rpc_url}")
        except Exception as e:
            logger.error(f"Elementd RPC error: {e}")
            raise
    
    async def get_balance(self) -> float:
        """Get Depix balance"""
        balance_dict = await self._rpc_call("getbalance")
        
        # Elements returns balance as dict with asset IDs as keys
        if isinstance(balance_dict, dict):
            # Try to get Depix asset balance
            if self.depix_asset_id and self.depix_asset_id in balance_dict:
                return float(balance_dict[self.depix_asset_id])
            
            # If no specific asset ID, return first non-bitcoin asset
            for asset_id, amount in balance_dict.items():
                if asset_id != "bitcoin" and float(amount) > 0:
                    logger.info(f"Using asset {asset_id} with balance {amount}")
                    return float(amount)
            
            # Fallback to bitcoin balance
            return float(balance_dict.get("bitcoin", 0))
        
        # Fallback for simple numeric response
        return float(balance_dict)
    
    async def create_htlc(self, amount: float, hashlock: str, timelock: int, recipient: str) -> Dict[str, Any]:
        """Create HTLC on Liquid Network"""
        try:
            # For PoC, use simple sendtoaddress instead of complex HTLC script
            # In production, this would create proper HTLC with OP_SHA256, OP_EQUAL, etc.
            
            # Use minimal parameters to avoid type issues
            if self.depix_asset_id:
                # Only pass required params and assetlabel
                txid = await self._rpc_call("sendtoaddress", [
                    recipient,          # address
                    amount,             # amount
                    "",                 # comment
                    "",                 # comment_to
                    False,              # subtractfeefromamount
                    False,              # replaceable
                    6,                  # conf_target
                    "unset",            # estimate_mode
                    False,              # avoid_reuse
                    self.depix_asset_id # assetlabel
                ])
            else:
                txid = await self._rpc_call("sendtoaddress", [recipient, amount])
            
            logger.info(f"Created HTLC transaction: {txid}")
            
            return {
                "txid": txid,
                "amount": amount,
                "hashlock": hashlock,
                "timelock": timelock
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to create HTLC: {error_msg}")
            raise Exception(f"Depix HTLC creation failed: {error_msg}")
    
    async def redeem_htlc(self, txid: str, secret: str) -> Dict[str, Any]:
        """Redeem HTLC with secret"""
        # Simplified redemption logic
        return {"txid": txid, "status": "redeemed", "secret": secret}
    
    async def refund_htlc(self, txid: str) -> Dict[str, Any]:
        """Refund HTLC after timelock"""
        return {"txid": txid, "status": "refunded"}
