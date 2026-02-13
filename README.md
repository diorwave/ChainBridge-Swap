# Depix ↔ Bitcoin Atomic Swap PoC

Proof-of-concept for trustless atomic swaps between Depix tokens (Liquid Network) and Bitcoin using Hash Time-Locked Contracts (HTLC).

## Features

- Trustless cross-chain swaps between Bitcoin testnet and Liquid Network
- HTLC-based atomic swap protocol (both succeed or both fail)
- Web interface for creating and managing swap offers
- Support for Electrum (Bitcoin) and Elements (Liquid) wallets
- Real-time swap status tracking

## Project Structure

```
├── backend/
│   ├── wallets/          # Wallet integration (elementsd, Electrum)
│   │   ├── bitcoin.py    # Bitcoin wallet via Electrum
│   │   └── depix.py      # Depix wallet via Elements RPC
│   ├── htlc/             # HTLC logic and swap engine
│   ├── api/              # FastAPI REST endpoints
│   └── db/               # SQLite for swap state
├── frontend/             # React + TypeScript web interface
└── tests/                # Test scenarios
```

## Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- **elementsd** (Liquid Network daemon) - [Install Guide](https://github.com/ElementsProject/elements)
- **Electrum** (Bitcoin wallet) - [Download](https://electrum.org/)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Setup Wallets

#### Bitcoin Wallet (Electrum)

```bash
# Create testnet wallet
electrum --testnet create

# Get testnet coins from faucet
# Use: https://testnet-faucet.mempool.co/
electrum --testnet getunusedaddress
```

#### Depix Wallet (Elements/Liquid)

```bash
# Start elementsd (Liquid testnet)
elementsd -chain=liquidtestnet -daemon

# Create wallet
elements-cli -chain=liquidtestnet createwallet "new wallet"

# Load wallet
elements-cli -chain=liquidtestnet loadwallet "wallet name"

# Get new address for receiving Depix tokens
elements-cli -chain=liquidtestnet getnewaddress
```

### 3. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Elementd (Liquid Network) Configuration
ELEMENTD_RPC_USER=depixrpc
ELEMENTD_RPC_PASSWORD=your_password_here
ELEMENTD_RPC_HOST=127.0.0.1
ELEMENTD_RPC_PORT=7041
ELEMENTD_WALLET=depixswap

# Depix Asset ID (custom asset on Liquid)
DEPIX_ASSET_ID=02f22f8d9c76ab41661a2729e4752e2c5d1a263012141b86ea98af5472df5189

# Electrum Configuration
ELECTRUM_WALLET_PATH=wallet path
ELECTRUM_TESTNET=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_SECRET_KEY=change-this-in-production

# HTLC Configuration
HTLC_TIMELOCK_HOURS=24
```

Also configure frontend:

```bash
cd frontend
cp .env.example .env
# Edit frontend/.env if needed (default: http://localhost:8000)
```

## Running

### Start Backend

```bash
# Make sure elementsd is running
elementsd -chain=liquidtestnet -daemon

# Load wallet
elements-cli -chain=liquidtestnet loadwallet "wallet name"

# Start FastAPI backend
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## Usage

### Creating a Swap Offer

1. Open the web interface at `http://localhost:3000`
2. Check your wallet balances
3. Click "Create Offer"
4. Specify:
   - What you're offering (BTC or Depix)
   - Amount
   - What you want in return
5. Submit the offer

### Accepting a Swap

1. Browse available offers
2. Click "Accept" on an offer
3. The HTLC contracts are created on both chains
4. Complete the swap by revealing the secret

### Swap States

- `pending` - Offer created, waiting for counterparty
- `accepted` - Both parties agreed, HTLCs being created
- `locked` - Funds locked in HTLCs on both chains
- `completed` - Swap successful, funds exchanged
- `refunded` - Timelock expired, funds returned

## Wallet Management

### Electrum Commands

```bash
# Check balance
electrum --testnet getbalance

# Get receiving address
electrum --testnet getunusedaddress

# List addresses
electrum --testnet listaddresses
```

### Elements Commands

```bash
# Check balance
elements-cli -chain=liquidtestnet getbalance

# Get new address
elements-cli -chain=liquidtestnet getnewaddress

# Check Depix asset balance
elements-cli -chain=liquidtestnet getbalance "*" 1 false "02f22f8d9c76ab41661a2729e4752e2c5d1a263012141b86ea98af5472df5189"
```

## API Endpoints

### Health & Balance

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1234567890
}
```

#### `GET /balances`
Get current wallet balances for both Bitcoin and Depix.

**Response:**
```json
{
  "btc_balance": 0.00195291,
  "depix_balance": 100.0
}
```

---

### Atomic Swap Endpoints (Recommended)

These endpoints implement the full atomic swap protocol with proper HTLC sequencing.

#### `POST /atomic/offers`
**Step 1:** Create a new swap offer (Initiator/Alice).

**Request:**
```json
{
  "initiator_asset": "btc",
  "initiator_amount": 0.001,
  "acceptor_asset": "depix",
  "acceptor_amount": 50.0,
  "initiator_address": "tb1q..."
}
```

**Response:**
```json
{
  "swap_id": "uuid",
  "status": "offered",
  "initiator_asset": "btc",
  "initiator_amount": 0.001,
  "acceptor_asset": "depix",
  "acceptor_amount": 50.0,
  "initiator_address": "tb1q...",
  "hashlock": "hash...",
  "initiator_timelock": 1234567890,
  "acceptor_timelock": 1234567890,
  "created_at": 1234567890
}
```

#### `GET /atomic/offers`
List all swap offers. Optional query parameter: `?status=offered`

**Response:**
```json
[
  {
    "swap_id": "uuid",
    "status": "offered",
    "initiator_asset": "btc",
    "initiator_amount": 0.001,
    ...
  }
]
```

#### `GET /atomic/offers/open`
List only open offers that can be accepted (status = "offered").

#### `GET /atomic/offers/{swap_id}`
Get details of a specific swap offer.

#### `POST /atomic/offers/{swap_id}/accept`
**Step 2:** Accept a swap offer (Acceptor/Bob).

**Request:**
```json
{
  "acceptor_address": "VTpz..."
}
```

**Response:**
```json
{
  "swap_id": "uuid",
  "status": "accepted",
  "acceptor_address": "VTpz...",
  "accepted_at": 1234567890,
  ...
}
```

#### `POST /atomic/offers/{swap_id}/lock-initiator`
**Step 3:** Initiator (Alice) locks their funds in HTLC.

Creates HTLC transaction on the initiator's blockchain (BTC or Depix).

**Response:**
```json
{
  "swap_id": "uuid",
  "status": "initiator_locked",
  "initiator_txid": "abc123...",
  ...
}
```

#### `POST /atomic/offers/{swap_id}/lock-acceptor`
**Step 4:** Acceptor (Bob) locks their funds in HTLC.

Creates HTLC transaction on the acceptor's blockchain. Can only be called after initiator has locked.

**Response:**
```json
{
  "swap_id": "uuid",
  "status": "acceptor_locked",
  "acceptor_txid": "def456...",
  ...
}
```

#### `POST /atomic/offers/{swap_id}/claim-initiator`
**Step 5:** Initiator (Alice) claims acceptor's funds using the secret.

This reveals the secret on the blockchain, allowing Bob to claim Alice's funds.

**Response:**
```json
{
  "status": "claimed",
  "message": "Initiator claimed funds. Secret is now public!",
  "secret": "abc123...",
  "swap_id": "uuid"
}
```

#### `POST /atomic/offers/{swap_id}/claim-acceptor`
**Step 6:** Acceptor (Bob) claims initiator's funds using the revealed secret.

Completes the atomic swap.

**Response:**
```json
{
  "status": "completed",
  "message": "Swap completed successfully!",
  "swap_id": "uuid"
}
```

---

### Legacy Swap Endpoints

These endpoints provide a simplified swap interface (for backward compatibility).

#### `POST /swaps`
Create a new atomic swap (simplified version).

**Request:**
```json
{
  "depix_amount": 50.0,
  "btc_amount": 0.001,
  "btc_recipient": "tb1q...",
  "depix_recipient": "VTpz..."
}
```

**Response:**
```json
{
  "swap_id": "uuid",
  "depix_amount": 50.0,
  "btc_amount": 0.001,
  "hashlock": "hash...",
  "timelock": 1234567890,
  "status": "locked",
  "depix_txid": "abc123...",
  "btc_txid": "def456...",
  "created_at": 1234567890
}
```

#### `GET /swaps`
List all swaps.

#### `GET /swaps/{swap_id}`
Get specific swap details.

#### `POST /swaps/{swap_id}/redeem`
Redeem swap with secret.

**Request:**
```json
{
  "swap_id": "uuid",
  "secret": "abc123..."
}
```

#### `POST /swaps/{swap_id}/refund`
Refund swap after timelock expires.

---

### Swap Status Flow

```
offered → accepted → initiator_locked → acceptor_locked → 
initiator_claimed → completed

OR

offered → cancelled
locked → refunded (if timelock expires)
```

### Status Descriptions

- `offered` - Swap offer created, waiting for acceptor
- `accepted` - Acceptor agreed to swap terms
- `initiator_locked` - Initiator's funds locked in HTLC
- `acceptor_locked` - Acceptor's funds locked in HTLC
- `initiator_claimed` - Initiator claimed funds (secret revealed)
- `completed` - Both parties claimed funds, swap successful
- `refunded` - Timelock expired, funds returned
- `cancelled` - Swap cancelled before completion

## Troubleshooting

### Electrum wallet not showing balance

```bash
# Check if wallet is synced
electrum --testnet getinfo

# Restart daemon
electrum --testnet daemon stop
electrum --testnet daemon start
```

### Elements wallet not loaded

```bash
# List available wallets
elements-cli -chain=liquidtestnet listwalletdir

# Load wallet
elements-cli -chain=liquidtestnet loadwallet "depixswap"
```

### Disk space issues

If running full nodes, blockchain data can be large:
- Bitcoin testnet: ~30GB
- Liquid testnet: ~10GB

Consider using pruned mode or SPV wallets like Electrum.

## Security Notes

- This is a PoC for testing only
- Use testnet coins only
- Change default passwords in production
- Verify HTLC scripts before deploying to mainnet
- Ensure proper timelock values for mainnet

## License

MIT
