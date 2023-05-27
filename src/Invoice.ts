export type Invoice = {
  amount: number;
  comment?: string;
  created_at: string;
  creation_date: number;
  currency: string;
  custom_records: Record<string, string>;
  description_hash: null;
  expires_at: string;
  expiry: number;
  fiat_currency: string;
  fiat_in_cents: number;
  identifier: string;
  keysend_message?: string;
  memo: string;
  payer_name: string;
  payer_pubkey?: string;
  payment_hash: string;
  payment_request: string;
  r_hash_str: string;
  settled: boolean;
  settled_at: string;
  state: string;
  type: string;
  value: number;
  metadata?: {
    // TODO: add typings
    payer_data?: unknown;
    zap_request?: unknown;
  };
};
