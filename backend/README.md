# AURA-Auction Backend (Supabase)

## What is Supabase?

Supabase is a Backend-as-a-Service that provides:
- **PostgreSQL Database** - Stores all your data (users, auctions, bids)
- **Authentication** - Login, Register, OAuth (Google, GitHub, etc.)
- **Real-time** - Live updates when data changes
- **Storage** - Upload auction images
- **Edge Functions** - Server-side code (for DSA logic)

## Setup Instructions

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project" (free tier available)
3. Create a new project (save your database password!)

### Step 2: Get Your Credentials
After project is created, go to:
- **Settings** > **API**
- Copy these values:
  - `Project URL` (e.g., https://xxxxx.supabase.co)
  - `anon public` key (safe for frontend)
  - `service_role` key (keep secret, for backend only)

### Step 3: Create Database Tables
Go to **SQL Editor** in Supabase dashboard and run the SQL from:
`supabase/migrations/001_initial_schema.sql`

### Step 4: Enable Real-time
1. Go to **Database** > **Replication**
2. Enable replication for: `auctions`, `bids`, `profiles`

### Step 5: Configure Frontend
Create `frontend/.env` with your credentials:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Folder Structure

```
backend/
├── supabase/
│   ├── migrations/     # Database schema SQL files
│   │   └── 001_initial_schema.sql
│   └── functions/      # Edge Functions (optional server code)
│       └── place-bid/  # Bid validation with MaxHeap
├── dsa/
│   ├── MaxHeap.ts      # Max-Heap data structure
│   └── BidManager.ts   # Bid management logic
└── README.md
```

## How Data Flows

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│  Supabase   │────▶│ PostgreSQL  │
│  Frontend   │◀────│   Client    │◀────│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │              Real-time
       │              Subscriptions
       ▼                   │
┌─────────────┐            │
│   User's    │◀───────────┘
│   Browser   │
└─────────────┘
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to auth.users) |
| `auctions` | All auction listings |
| `bids` | Bid history for each auction |
| `watchlist` | User's saved auctions |
| `chat_messages` | Live auction chat |

## DSA Implementation

The MaxHeap is used for:
- O(1) access to highest bid
- O(log n) bid insertion
- Fraud detection
- Anti-snipe protection

In Supabase, you can use Edge Functions to run server-side logic,
or run the DSA code client-side for real-time updates.
