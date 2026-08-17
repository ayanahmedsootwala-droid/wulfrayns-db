
CREATE TABLE IF NOT EXISTS rpm_invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no   text NOT NULL UNIQUE,
  type         text NOT NULL DEFAULT 'sale', -- sale | purchase | service
  status       text NOT NULL DEFAULT 'draft', -- draft | sent | paid | overdue | cancelled
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_address text,
  vehicle_id   uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_desc text,
  issue_date   date NOT NULL DEFAULT CURRENT_DATE,
  due_date     date,
  paid_date    date,
  subtotal     numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  discount_amt numeric(14,2) DEFAULT 0,
  tax_pct      numeric(5,2) DEFAULT 0,
  tax_amt      numeric(14,2) DEFAULT 0,
  total        numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount  numeric(14,2) DEFAULT 0,
  currency     text NOT NULL DEFAULT 'PKR',
  notes        text,
  terms        text DEFAULT 'Payment is due within 30 days.',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rpm_invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid NOT NULL REFERENCES rpm_invoices(id) ON DELETE CASCADE,
  description  text NOT NULL,
  qty          numeric(10,2) NOT NULL DEFAULT 1,
  unit_price   numeric(14,2) NOT NULL DEFAULT 0,
  total        numeric(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  sort_order   integer DEFAULT 0
);

-- Auto-increment invoice counter
CREATE SEQUENCE IF NOT EXISTS rpm_invoice_seq START 1001;

ALTER TABLE rpm_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpm_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_invoices"      ON rpm_invoices      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_invoice_items" ON rpm_invoice_items FOR ALL USING (true) WITH CHECK (true);
