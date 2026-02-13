# Depix ↔ Bitcoin Atomic Swap Frontend

Modern React + TypeScript + Vite frontend for the atomic swap PoC.

## Features

- Real-time balance display for Depix and Bitcoin
- Create atomic swaps with HTLC
- View swap history and status
- Auto-refresh every 10 seconds
- Responsive design

## Development

```bash
# Install dependencies (already done)
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Edit `frontend/.env` to change the API URL:

```
VITE_API_URL=http://your-api-host:8001/api/v1
```

## Tech Stack

- React 18
- TypeScript
- Vite
- CSS3 (no external UI libraries for minimal bundle)
