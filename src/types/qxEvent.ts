export interface QxEventDB {
  id: string;
  procedure_type_value: number;
  procedure_type_name: string;
  source_id: string;
  dest_id: string;
  amount: string;
  tick_number: number;
  tx_id: string;
  input_type: number | null;
  input_hex: string | null;
  signature_hex: string | null;
  timestamp: number;
  money_flew: boolean;
  issuer_address: string | null;
  asset_name: string | null;
  price: number | null;
  number_of_shares: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface WalletDB {
  id: string;
  address: string;
  first_seen_at: string;
  last_seen_at: string;
  transaction_count: number;
  latest_tick_number: number;
}

// Transformed event for display
export interface DisplayEvent {
  id: string;
  type: string; // ProcedureTypeName
  token: string; // AssetName or "QUBIC"
  from: string; // source_id
  to: string; // dest_id
  amount: string; // formatted amount
  time: string; // relative time
  timestamp: string; // formatted timestamp
  timestampMs?: number; // raw timestamp in milliseconds for calculations
  createdAt?: string; // original created_at for reference
  tickNo: string; // formatted tick number
  label?: string;
  // Additional details from raw data
  price?: number;
  numberOfShares?: number;
  txId: string;
  moneyFlew: boolean;
  inputHex?: string;
  signatureHex?: string;
  issuerAddress?: string;
}

// Helper to format amount with commas
export function formatAmount(amount: string | number, token: string): string {
  const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
  return `${numAmount.toLocaleString()} ${token}`;
}

// Helper to format tick number with commas
export function formatTickNo(tickNo: number): string {
  return tickNo.toLocaleString();
}

// Helper to get relative time
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const eventTime = timestamp; // Already in milliseconds from webhook
  const diff = now - eventTime;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Helper to format timestamp
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// Transform DB event to display event
export function transformEvent(dbEvent: QxEventDB): DisplayEvent {
  const token = dbEvent.asset_name || 'QUBIC';
  
  return {
    id: dbEvent.id,
    type: dbEvent.procedure_type_name,
    token,
    from: dbEvent.source_id,
    to: dbEvent.dest_id,
    amount: formatAmount(dbEvent.amount, token),
    time: getRelativeTime(dbEvent.timestamp),
    timestamp: formatTimestamp(dbEvent.timestamp),
    timestampMs: dbEvent.timestamp,
    createdAt: dbEvent.created_at,
    tickNo: formatTickNo(dbEvent.tick_number),
    price: dbEvent.price ?? undefined,
    numberOfShares: dbEvent.number_of_shares ?? undefined,
    txId: dbEvent.tx_id,
    moneyFlew: dbEvent.money_flew,
    inputHex: dbEvent.input_hex ?? undefined,
    signatureHex: dbEvent.signature_hex ?? undefined,
    issuerAddress: dbEvent.issuer_address ?? undefined,
  };
}