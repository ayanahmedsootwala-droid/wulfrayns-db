
-- Transaction Book tables
CREATE TABLE IF NOT EXISTS rpm_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_label     text,
  txn_type          text NOT NULL CHECK (txn_type IN ('income','expense','receivable','payable')),
  category          text NOT NULL,
  amount            numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount       numeric(14,2) NOT NULL DEFAULT 0,
  remaining_amount  numeric(14,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
  payment_method    text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','online','other')),
  account_name      text,
  reference_number  text,
  txn_date          date NOT NULL DEFAULT CURRENT_DATE,
  due_date          date,
  notes             text,
  is_settled        boolean GENERATED ALWAYS AS (amount <= paid_amount) STORED,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rpm_transaction_splits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    uuid NOT NULL REFERENCES rpm_transactions(id) ON DELETE CASCADE,
  amount            numeric(14,2) NOT NULL DEFAULT 0,
  payment_method    text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','online','other')),
  account_name      text,
  paid_on           date NOT NULL DEFAULT CURRENT_DATE,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE rpm_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpm_transaction_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_all" ON rpm_transactions;
CREATE POLICY "transactions_all" ON rpm_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "splits_all" ON rpm_transaction_splits;
CREATE POLICY "splits_all" ON rpm_transaction_splits FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_txn_updated ON rpm_transactions;
CREATE TRIGGER trg_txn_updated BEFORE UPDATE ON rpm_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
