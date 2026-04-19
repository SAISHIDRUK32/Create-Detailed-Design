# AURA-Auction Frontend

React + TypeScript + Vite application for the AURA smart auction system.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` and add your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:5173

## Demo Mode

If Supabase is not configured, the app runs in **Demo Mode** with:
- Mock authentication (demo@aura.com / demo123)
- Sample auctions stored in localStorage
- All features work locally

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/    # Reusable UI components
│   │   ├── config/        # Supabase client config
│   │   ├── context/       # React Context (Auth, Auction)
│   │   └── pages/         # Page components
│   ├── styles/            # CSS styles
│   └── main.tsx           # App entry point
├── index.html
├── package.json
└── vite.config.ts
```

## Features

- Real-time bidding with Supabase Realtime
- User authentication (Supabase Auth)
- Live auction streaming
- Watchlist management
- Seller/Buyer dashboards
- Anti-snipe protection
- MaxHeap visualization (DSA)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
