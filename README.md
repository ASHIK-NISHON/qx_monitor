# QX Monitor

A real-time analytics app for monitoring and analyzing Qubic QX smart contract events. Track transactions, detect whale activity, and explore wallet segments.

## Overview

QX Monitor provides a focused interface to visualize events from the Qubic QX decentralized exchange smart contract. Data flows from the Qubic blockchain via EasyConnect to Supabase and is displayed in the app (Overview, Events, Wallets & Segments, Settings).

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Qubic Blockchain│────▶│ EasyConnect │────▶│ Supabase Edge Fn │────▶│   Supabase  │
│   (QX Contract) │     │             │     │   (qx-webhook)   │     │  (Database) │
└─────────────────┘     └─────────────┘     └──────────────────┘     └─────────────┘
                                                                             │
                                                                             ▼
                                                                    ┌─────────────────┐
                                                                    │   QX Monitor    │
                                                                    │   (React App)   │
                                                                    └─────────────────┘
```

### Data Flow

1. **Qubic Blockchain** - QX smart contract executes transactions (buy/sell orders, transfers, asset issuance)
2. **EasyConnect** - Monitors the blockchain and sends QX events directly to the Supabase webhook
3. **Supabase Edge Function** - Webhook endpoint (`/qx-webhook`) receives EasyConnect payloads, parses them, and stores events
4. **Supabase Database** - Persists all QX events in the `qx_events` table
5. **QX Monitor** - Fetches and displays data in real-time with React Query

## Features

### 📊 Overview
- **KPI Cards** - Total events, unique wallets, whale transactions, and highest volume events
- **Events Over Time Chart** - Activity breakdown by QX action types over 24 hours
- **Recent Activity** - Live feed of the latest QX events

### 📋 Events
- **Event Table** - Paginated list of all QX events with filtering and search
- **Event Details** - Click any event to view full transaction details
- **Whale Tagging** - Events above configured thresholds are tagged as "Whale"

### 👛 Wallets & Segments
- **Wallet List** - All unique wallets that have interacted with QX
- **Transaction History** - Recent transactions per wallet
- **Wallet Details** - Balance, transaction stats, asset holdings via Qubic RPC API

### ⚙️ Settings
- **Whale Detection Thresholds** - Configure per-token thresholds for whale detection
- **Custom Tokens** - Add new tokens with custom threshold amounts

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| State Management | React Query (TanStack Query) |
| Database | Supabase (PostgreSQL) |
| Backend | Supabase Edge Functions (Deno) |
| Charts | Recharts |
| Routing | React Router v6 |
| Notifications | Sonner (Toast) |

## Database Schema

### `qx_events` Table
Stores all QX smart contract events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tx_id` | TEXT | Transaction ID |
| `source_id` | TEXT | Source wallet address |
| `dest_id` | TEXT | Destination wallet address |
| `amount` | TEXT | Transaction amount |
| `tick_number` | INTEGER | Qubic tick number |
| `timestamp` | INTEGER | Unix timestamp |
| `procedure_type_name` | TEXT | QX action type (AddToBidOrder, AddToAskOrder, etc.) |
| `procedure_type_value` | INTEGER | Numeric procedure type |
| `asset_name` | TEXT | Token/asset name |
| `issuer_address` | TEXT | Asset issuer address |
| `price` | INTEGER | Order price |
| `number_of_shares` | INTEGER | Number of shares/tokens |
| `money_flew` | BOOLEAN | Whether funds were transferred |
| `input_hex` | TEXT | Raw input data |
| `signature_hex` | TEXT | Transaction signature |
| `raw_payload` | JSONB | Complete raw event data |

### `wallets` Table
Tracks unique wallet addresses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `address` | TEXT | Wallet address |
| `first_seen_at` | TIMESTAMP | First transaction timestamp |
| `last_seen_at` | TIMESTAMP | Most recent transaction |
| `transaction_count` | INTEGER | Total transaction count |

## QX Transaction Types

QX Monitor tracks these QX smart contract operations:

| Action | Description |
|--------|-------------|
| `AddToBidOrder` | Place a buy order |
| `AddToAskOrder` | Place a sell order |
| `RemoveFromBidOrder` | Cancel a buy order |
| `RemoveFromAskOrder` | Cancel a sell order |
| `TransferShareOwnershipAndPossession` | Transfer asset ownership |
| `TransferShareManagementRights` | Transfer management rights |
| `IssueAsset` | Create a new asset |


## Setup & Installation

### Prerequisites
- Node.js 18+
- Supabase account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ASHIK-NISHON/QX-console.git
   cd QX-console
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   Navigate to `http://localhost:8080`

### Environment Configuration

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

Replace the placeholders with your actual Supabase project URL and anonymous/public key. You can find these in your Supabase project settings under API.


## Webhook Integration

Events are sent directly from **EasyConnect** to the Supabase Edge Function. Configure EasyConnect to POST to your webhook URL.

### Edge Function Endpoint
```
POST https://<your-project-ref>.supabase.co/functions/v1/qx-webhook
```

### Expected Payload (EasyConnect format)
The webhook expects events in the nested structure sent by EasyConnect, for example:
- **Root**: `ProcedureTypeValue`, `ProcedureTypeName`
- **RawTransaction**: `transaction` (sourceId, destId, amount, tickNumber, txId, inputHex, signatureHex, …), `timestamp`, `moneyFlew`
- **ParsedTransaction** (optional): `IssuerAddress`, `AssetName`, `Price`, `NumberOfShares`

Single object or array of events are supported.

## Qubic RPC API Integration

QX Monitor fetches additional wallet details from the Qubic RPC API:
- **Base URL**: `https://rpc.qubic.org`
- **Balance Endpoint**: `POST /v1/balances`
- **Latest Tick**: `GET /v1/latestTick`

## Project Structure

```
src/
├── components/
│   ├── layout/           # Layout components (Sidebar, Header, DashboardLayout)
│   ├── ui/               # shadcn/ui components
│   ├── AdvancedWalletDialog.tsx
│   ├── EventDetailDialog.tsx
│   ├── EventsOverTimeChart.tsx
│   └── KPICard.tsx
├── contexts/
│   └── SettingsContext.tsx      # Whale threshold settings
├── hooks/
│   ├── useQxEvents.ts           # Fetch QX events from Supabase
│   ├── useWallets.ts            # Fetch wallet data
│   ├── useKPIStats.ts           # Calculate KPI statistics
│   ├── useWhaleDetection.ts     # Whale detection logic
│   └── useAdvancedWalletDetails.ts
├── lib/
│   ├── qubicWalletAnalyzer.ts   # Qubic RPC API client
│   └── utils.ts
├── pages/
│   ├── Overview.tsx
│   ├── Events.tsx
│   ├── WalletsSegments.tsx
│   └── Settings.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts     # Supabase client initialization
│       └── types.ts      # Auto-generated database types
└── types/
    └── qxEvent.ts        # QX event type definitions

supabase/
├── config.toml           # Supabase configuration
└── functions/
    └── qx-webhook/       # Edge function for receiving events
        └── index.ts
```


---


**QX Monitor** demo:  https://qx-monitor.vercel.app/ 
*Live demo receives updates via EasyConnect.*

---
