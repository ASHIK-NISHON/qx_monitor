export interface QubicEvent {
  type: string;
  token: string;
  from: string;
  to: string;
  amount: string;
  time: string;
  timestamp: string;
  label?: string;
  tickNo: string;
}

// Helper to shorten 56-char Qubic addresses for display
export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Full 56-character Qubic addresses
export const events: QubicEvent[] = [
  {
    type: "Buy",
    token: "QUBIC",
    from: "BZBQFLLBNCXEMGLOBHUVFTLUPLVCPQUASSILFABOFFBCADQSSUPNWLZBQFFK9D2",
    to: "QXSEVENALPHAPROMISEDMOONWALLETADDRESSFULLQUBICK7AP1M4",
    amount: "2,500,000 QUBIC",
    time: "2 min ago",
    timestamp: "2025-11-30 14:32:15",
    label: undefined,
    tickNo: "38,460,334",
  },
  {
    type: "Transfer",
    token: "QUBIC",
    from: "QA2CFULLADDRESSFORQUBICBLOCKCHAINWALLETIDENTIFIERF8E1",
    to: "QP9KFULLRECEIVINGWALLETADDRESSFORQUBICTRANSFERW3N7",
    amount: "2,340 QUBIC",
    time: "5 min ago",
    timestamp: "2025-11-30 14:29:42",
    label: "New wallet",
    tickNo: "38,460,120",
  },
  {
    type: "Sell",
    token: "QUBIC",
    from: "QM5TFULLSENDERWALLETADDRESSFORQUBICSELLORDERTXR4C9",
    to: "QZ1VFULLBUYERWALLETADDRESSFORQUBICPURCHASEORDH6K2",
    amount: "8,750 QUBIC",
    time: "8 min ago",
    timestamp: "2025-11-30 14:26:33",
    label: undefined,
    tickNo: "38,459,987",
  },
  {
    type: "Buy",
    token: "QUBIC",
    from: "QR8NFULLWHALEWALLETADDRESSLARGETRANSACTIONQUBID2S5",
    to: "QW4JFULLRECIPIENTWALLETADDRESSFORLARGEQBUYTXNG7P1",
    amount: "1,250,000 QUBIC",
    time: "12 min ago",
    timestamp: "2025-11-30 14:22:18",
    label: undefined,
    tickNo: "38,459,650",
  },
  {
    type: "Contract Call",
    token: "QUBIC",
    from: "QT6YFULLCONTRACTCALLERWALLETADDRESSQUBICNETB9M3",
    to: "QU3LFULLSMARTCONTRACTADDRESSFORQUBICEXECUTIONX5C8",
    amount: "1,250 QUBIC",
    time: "15 min ago",
    timestamp: "2025-11-30 14:19:05",
    label: undefined,
    tickNo: "38,459,301",
  },
  {
    type: "Transfer",
    token: "QUBIC",
    from: "QH9PFULLTRANSFERORIGINWALLETADDRESSQUBICNETA4N8",
    to: "QL2KFULLTRANSFERDESTINATIONWALLETADDRESSQUBICJ6M1",
    amount: "5,680 QUBIC",
    time: "18 min ago",
    timestamp: "2025-11-30 14:16:47",
    label: undefined,
    tickNo: "38,459,050",
  },
  {
    type: "Buy",
    token: "QUBIC",
    from: "QV1SFULLBUYERWALLETADDRESSQUBICNETWORKMAINNET3R7",
    to: "QC8FFULLSELLERWALLETADDRESSQUBICTOKENEXCHANGED9W2",
    amount: "12,890 QUBIC",
    time: "22 min ago",
    timestamp: "2025-11-30 14:12:29",
    label: undefined,
    tickNo: "38,458,812",
  },
];

// Top wallets with full addresses
export const topWallets = [
  { address: "BZBQFLLBNCXEMGLOBHUVFTLUPLVCPQUASSILFABOFFBCADQSSUPNWLZBQFFK9D2", volume: "1.2M QUBIC" },
  { address: "QXSEVENALPHAPROMISEDMOONWALLETADDRESSFULLQUBICK7AP1M4", volume: "890K QUBIC" },
  { address: "QA2CFULLADDRESSFORQUBICBLOCKCHAINWALLETIDENTIFIERF8E1", volume: "765K QUBIC" },
  { address: "QM5TFULLSENDERWALLETADDRESSFORQUBICSELLORDERTXR4C9", volume: "623K QUBIC" },
  { address: "QR8NFULLWHALEWALLETADDRESSLARGETRANSACTIONQUBID2S5", volume: "541K QUBIC" },
];
