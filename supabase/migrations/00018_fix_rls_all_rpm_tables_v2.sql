
-- FIX: rpm_leads — authenticated policy was missing (root cause of RLS error)
ALTER TABLE rpm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_rpm_leads" ON rpm_leads;
DROP POLICY IF EXISTS "rpm_leads_anon_all" ON rpm_leads;
DROP POLICY IF EXISTS "rpm_leads_auth_all" ON rpm_leads;
CREATE POLICY "rpm_leads_anon_all"  ON rpm_leads FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "rpm_leads_auth_all"  ON rpm_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FIX: rpm_invoices
ALTER TABLE rpm_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_invoices"    ON rpm_invoices;
DROP POLICY IF EXISTS "rpm_invoices_anon_all" ON rpm_invoices;
DROP POLICY IF EXISTS "rpm_invoices_auth_all" ON rpm_invoices;
CREATE POLICY "rpm_invoices_anon_all" ON rpm_invoices FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "rpm_invoices_auth_all" ON rpm_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FIX: rpm_invoice_items
ALTER TABLE rpm_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpm_invoice_items_anon_all" ON rpm_invoice_items;
DROP POLICY IF EXISTS "rpm_invoice_items_auth_all" ON rpm_invoice_items;
CREATE POLICY "rpm_invoice_items_anon_all" ON rpm_invoice_items FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "rpm_invoice_items_auth_all" ON rpm_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FIX: vehicle_images — anon can select/insert (needed for unauthenticated photo uploads)
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_images_anon_select" ON vehicle_images;
DROP POLICY IF EXISTS "vehicle_images_anon_insert" ON vehicle_images;
CREATE POLICY "vehicle_images_anon_select" ON vehicle_images FOR SELECT TO anon USING (true);
CREATE POLICY "vehicle_images_anon_insert" ON vehicle_images FOR INSERT TO anon WITH CHECK (true);

-- FIX all other RPM tables — bulk authenticated + anon coverage
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'rpm_ex_factory_prices','rpm_quotations','rpm_expenses',
    'rpm_transactions','rpm_transaction_splits','rpm_lead_interactions',
    'rpm_journal','rpm_tasks','rpm_shipments','rpm_social_posts',
    'rpm_finance_plans','rpm_import_costs','rpm_exchange_rates',
    'rpm_ai_sessions','rpm_ai_audit','rpm_saved_prompts',
    'rpm_vehicles','vehicles','inquiries','vehicle_documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_auth_all" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON %I FOR ALL TO anon        USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;
