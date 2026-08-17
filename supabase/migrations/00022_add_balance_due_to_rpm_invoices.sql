
ALTER TABLE rpm_invoices
  ADD COLUMN IF NOT EXISTS balance_due numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2) DEFAULT 0;
