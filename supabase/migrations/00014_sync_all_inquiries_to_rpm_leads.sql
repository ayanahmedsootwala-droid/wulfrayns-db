
-- Upsert all inquiries into rpm_leads using customer_name as conflict key
-- Only insert if no existing lead with same customer_name already exists (by source='inquiry')
INSERT INTO rpm_leads (
  customer_name, phone, email,
  req_make, req_model, req_notes,
  lead_score, source, status,
  call_count, visit_count, whatsapp_messages,
  created_at, updated_at
)
SELECT
  i.customer_name,
  i.customer_phone,
  i.customer_email,
  i.req_make,
  i.req_model,
  i.description,
  CASE i.priority
    WHEN 'high'   THEN 'hot'
    WHEN 'medium' THEN 'warm'
    ELSE 'cold'
  END,
  'inquiry',
  CASE i.status
    WHEN 'new'         THEN 'new'
    WHEN 'in_progress' THEN 'active'
    WHEN 'resolved'    THEN 'closed'
    WHEN 'closed'      THEN 'closed'
    ELSE 'new'
  END,
  0, 0, 0,
  i.created_at,
  NOW()
FROM inquiries i
WHERE NOT EXISTS (
  SELECT 1 FROM rpm_leads rl
  WHERE rl.source = 'inquiry'
  AND rl.customer_name = i.customer_name
  AND rl.req_make = i.req_make
  AND rl.req_model = i.req_model
);
