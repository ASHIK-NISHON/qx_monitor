/// <reference types="deno" />
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EasyConnect sends events in this nested structure
interface EasyConnectPayload {
  ProcedureTypeValue: number;
  ProcedureTypeName: string;
  RawTransaction: {
    transaction: {
      sourceId: string;
      destId: string;
      amount: string | number;
      tickNumber: number;
      inputType?: number;
      inputSize?: number;
      inputHex?: string;
      signatureHex?: string;
      txId: string;
    };
    timestamp: string | number;
    moneyFlew: boolean;
  };
  ParsedTransaction?: {
    IssuerAddress?: string;
    AssetName?: string;
    Price?: number;
    NumberOfShares?: number;
  };
}

function parseEasyConnectPayload(payload: EasyConnectPayload): {
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
  raw_payload: EasyConnectPayload;
} {
  const raw = payload.RawTransaction;
  const tx = raw.transaction;
  const parsed = payload.ParsedTransaction;

  let timestampMs: number;
  if (typeof raw.timestamp === 'string') {
    timestampMs = parseInt(raw.timestamp, 10);
    if (Number.isNaN(timestampMs)) timestampMs = Date.now();
  } else {
    timestampMs = raw.timestamp;
  }

  return {
    procedure_type_value: payload.ProcedureTypeValue,
    procedure_type_name: payload.ProcedureTypeName,
    source_id: tx.sourceId,
    dest_id: tx.destId,
    amount: String(tx.amount),
    tick_number: tx.tickNumber,
    tx_id: tx.txId,
    input_type: tx.inputType ?? null,
    input_hex: tx.inputHex ?? null,
    signature_hex: tx.signatureHex ?? null,
    timestamp: timestampMs,
    money_flew: raw.moneyFlew,
    issuer_address: parsed?.IssuerAddress ?? null,
    asset_name: parsed?.AssetName ?? null,
    price: parsed?.Price ?? null,
    number_of_shares: parsed?.NumberOfShares ?? null,
    raw_payload: payload,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawPayload = await req.json();
    const payloads: EasyConnectPayload[] = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

    console.log('Received webhook payload:', JSON.stringify(payloads, null, 2));

    const results: { event_id: string | undefined }[] = [];

    for (const payload of payloads) {
      if (!payload?.RawTransaction?.transaction) {
        console.error('Invalid payload: missing RawTransaction.transaction', payload);
        continue;
      }

      const row = parseEasyConnectPayload(payload);
      const sourceId = row.source_id;
      const tickNumber = row.tick_number;

      const { data: eventData, error: eventError } = await supabase
        .from('qx_events')
        .insert({
          procedure_type_value: row.procedure_type_value,
          procedure_type_name: row.procedure_type_name,
          source_id: row.source_id,
          dest_id: row.dest_id,
          amount: row.amount,
          tick_number: row.tick_number,
          tx_id: row.tx_id,
          input_type: row.input_type,
          input_hex: row.input_hex,
          signature_hex: row.signature_hex,
          timestamp: row.timestamp,
          money_flew: row.money_flew,
          issuer_address: row.issuer_address,
          asset_name: row.asset_name,
          price: row.price,
          number_of_shares: row.number_of_shares,
          raw_payload: row.raw_payload,
        })
        .select()
        .single();

      if (eventError) {
        console.error('Error inserting event:', eventError);
        throw eventError;
      }

      console.log('Event inserted:', eventData?.id);

      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('transaction_count, first_seen_at, latest_tick_number')
        .eq('address', sourceId)
        .single();

      const now = new Date().toISOString();

      if (existingWallet) {
        const currentLatestTick = existingWallet.latest_tick_number || 0;
        const newLatestTick = Math.max(currentLatestTick, tickNumber);

        const { error: sourceWalletError } = await supabase
          .from('wallets')
          .update({
            transaction_count: (existingWallet.transaction_count || 0) + 1,
            last_seen_at: now,
            latest_tick_number: newLatestTick,
          })
          .eq('address', sourceId);

        if (sourceWalletError) {
          console.error('Error updating source wallet:', sourceWalletError);
        }
      } else {
        const { error: sourceWalletError } = await supabase
          .from('wallets')
          .insert({
            address: sourceId,
            first_seen_at: now,
            last_seen_at: now,
            transaction_count: 1,
            latest_tick_number: tickNumber,
          });

        if (sourceWalletError) {
          console.error('Error inserting source wallet:', sourceWalletError);
        }
      }

      results.push({ event_id: eventData?.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.length} event(s) processed successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
