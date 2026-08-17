
-- Add all missing status values to the enum so saves never fail
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'active'      AFTER 'new';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'active';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'matched'     AFTER 'in_progress';

-- Add req_transmission column if missing (used by LiveDisplay and InquiriesPage)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS req_transmission text;

-- Allow anonymous inserts/updates so the app works without full auth
DROP POLICY IF EXISTS "inquiries_insert_auth" ON inquiries;
DROP POLICY IF EXISTS "inquiries_update_auth" ON inquiries;
DROP POLICY IF EXISTS "inquiries_delete_auth" ON inquiries;
DROP POLICY IF EXISTS "inq_notes_insert_auth" ON inquiry_notes;
DROP POLICY IF EXISTS "inq_notes_update_auth" ON inquiry_notes;
DROP POLICY IF EXISTS "inq_notes_delete_auth" ON inquiry_notes;

CREATE POLICY "inquiries_insert_all"  ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiries_update_all"  ON inquiries FOR UPDATE USING (true);
CREATE POLICY "inquiries_delete_all"  ON inquiries FOR DELETE USING (true);

CREATE POLICY "inq_notes_insert_all"  ON inquiry_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "inq_notes_update_all"  ON inquiry_notes FOR UPDATE USING (true);
CREATE POLICY "inq_notes_delete_all"  ON inquiry_notes FOR DELETE USING (true);
