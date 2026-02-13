import os
import sys
import logging
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api import router, set_wallets
from api.atomic_routes import router as atomic_router, set_wallets as set_atomic_wallets
from wallets import BitcoinWallet, DepixWallet

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Depix ↔ Bitcoin Atomic Swap API",
    description="PoC for atomic swaps between Depix and Bitcoin with two-party coordination",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize wallets
electrum_password = os.getenv("ELECTRUM_PASSWORD")
logger.info("ELECTRUM_PASSWORD loaded: %s", "yes" if electrum_password else "no")

bitcoin_wallet = BitcoinWallet(
    wallet_path=os.getenv("ELECTRUM_WALLET_PATH"),
    testnet=os.getenv("ELECTRUM_TESTNET", "true").lower() == "true",
    wallet_password=electrum_password,
)

depix_wallet = DepixWallet(
    rpc_user=os.getenv("ELEMENTD_RPC_USER"),
    rpc_password=os.getenv("ELEMENTD_RPC_PASSWORD"),
    rpc_host=os.getenv("ELEMENTD_RPC_HOST", "127.0.0.1"),
    rpc_port=int(os.getenv("ELEMENTD_RPC_PORT", "7041"))
)

# Set wallets in routes
set_wallets(bitcoin_wallet, depix_wallet)
set_atomic_wallets(bitcoin_wallet, depix_wallet)

# Include API routes
app.include_router(router, prefix="/api/v1", tags=["Legacy Swaps"])
app.include_router(atomic_router, prefix="/api/v1", tags=["Atomic Swaps"])

@app.get("/")
async def root():
    return {
        "message": "Depix ↔ Bitcoin Atomic Swap API v2.0",
        "features": [
            "Two-party atomic swaps",
            "Offer/Accept workflow",
            "HTLC with proper ordering",
            "Secret reveal mechanism"
        ],
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8001"))
    )
