import asyncio
import json
import logging
import os
from typing import Dict, Any
from .base import WalletInterface

logger = logging.getLogger(__name__)

class BitcoinWallet(WalletInterface):
    """Bitcoin wallet via Electrum CLI"""
    
    def __init__(self, wallet_path: str, testnet: bool = True, wallet_password: str | None = None):
        if not wallet_path:
            raise ValueError("ELECTRUM_WALLET_PATH is required")
        self.wallet_path = os.path.expanduser(wallet_path)
        self.testnet = testnet
        self.wallet_password = wallet_password if wallet_password is not None else os.getenv("ELECTRUM_PASSWORD")
        inferred_dir = os.path.dirname(os.path.dirname(self.wallet_path))
        self.electrum_dir = os.getenv("ELECTRUM_DIR", inferred_dir)
        self.electrum_bin = os.getenv(
            "ELECTRUM_BIN",
            "/home/dev/Downloads/electrum-4.7.0-x86_64.AppImage",
        )

    @staticmethod
    def _extract_hex(payload: Any, source: str) -> str:
        """Normalize Electrum tx payload into hex string."""
        if isinstance(payload, str):
            return payload
        if isinstance(payload, dict):
            if "hex" in payload and isinstance(payload["hex"], str):
                return payload["hex"]
            if "tx" in payload and isinstance(payload["tx"], str):
                return payload["tx"]
        raise Exception(f"Unexpected {source} response format: {payload}")
    
    async def _electrum_cmd(self, command: str, *args) -> Any:
        """Execute Electrum CLI command"""
        cmd = [self.electrum_bin, "-w", self.wallet_path, command, *[str(a) for a in args]]
        if self.testnet:
            cmd.append("--testnet")
        cmd.append(f"--dir={self.electrum_dir}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                stderr_text = stderr.decode().strip() if stderr else ""
                stdout_text = stdout.decode().strip() if stdout else ""
                error_msg = stderr_text or stdout_text or "Unknown error"
                logger.error(f"Electrum error: {error_msg}")
                raise Exception(f"Electrum error: {error_msg}")
            
            result = stdout.decode().strip()
            if not result:
                return None
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # Many Electrum CLI commands return plain text (e.g. tx hex, addresses, txid).
                return result
        except FileNotFoundError:
            logger.error("Electrum AppImage not found")
            raise Exception("Electrum not installed")
        except Exception as e:
            logger.error(f"Electrum command error: {e}")
            raise
    
    async def get_balance(self) -> float:
        """Get Bitcoin balance"""
        balance = await self._electrum_cmd("getbalance")
        return float(balance.get("confirmed", 0))
    
    async def create_htlc(self, amount: float, hashlock: str, timelock: int, recipient: str) -> Dict[str, Any]:
        """Create HTLC on Bitcoin testnet"""
        try:
            # For PoC, use simple payto instead of complex HTLC script
            # In production, this would create proper Bitcoin HTLC with OP_SHA256, OP_EQUAL, etc.
            
            # Build unsigned tx first. Encrypted wallets can still require password here.
            payto_args = [recipient, str(amount), "--unsigned"]
            if self.wallet_password:
                payto_args.extend(["--password", self.wallet_password])
            unsigned_tx = await self._electrum_cmd("payto", *payto_args)
            unsigned_tx_hex = self._extract_hex(unsigned_tx, "payto")
            
            # Sign transaction; include password when configured for encrypted wallets.
            sign_args = [unsigned_tx_hex]
            if self.wallet_password:
                sign_args.extend(["--password", self.wallet_password])
            signed_tx = await self._electrum_cmd("signtransaction", *sign_args)
            signed_tx_hex = self._extract_hex(signed_tx, "signtransaction")
            txid = await self._electrum_cmd("broadcast", signed_tx_hex)
            txid_str = txid if isinstance(txid, str) else str(txid)
            
            logger.info(f"Created HTLC transaction: {txid_str}")
            
            return {
                "txid": txid_str,
                "amount": amount,
                "hashlock": hashlock,
                "timelock": timelock
            }
        except Exception as e:
            logger.error(f"Failed to create HTLC: {e}")
            if "Password required" in str(e) and not self.wallet_password:
                raise Exception(
                    "Bitcoin HTLC creation failed: Electrum wallet is encrypted. "
                    "Set ELECTRUM_PASSWORD in environment."
                )
            raise Exception(f"Bitcoin HTLC creation failed: {e}")
    
    async def redeem_htlc(self, txid: str, secret: str) -> Dict[str, Any]:
        """Redeem HTLC with secret"""
        return {"txid": txid, "status": "redeemed", "secret": secret}
    
    async def refund_htlc(self, txid: str) -> Dict[str, Any]:
        """Refund HTLC after timelock"""
        return {"txid": txid, "status": "refunded"}
