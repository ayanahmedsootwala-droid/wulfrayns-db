
-- AI Journal entries
CREATE TABLE IF NOT EXISTS rpm_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_text TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'daily' CHECK (mode IN ('daily','vehicle','customer','decision','reflection','monthly')),
  parsed_entities JSONB DEFAULT '{}',
  summary TEXT,
  created_leads UUID[] DEFAULT '{}',
  linked_vehicles UUID[] DEFAULT '{}',
  linked_customers UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Audit log
CREATE TABLE IF NOT EXISTS rpm_ai_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  before_state JSONB,
  after_state JSONB,
  confidence NUMERIC(4,2),
  source_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat sessions
CREATE TABLE IF NOT EXISTS rpm_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  mode TEXT DEFAULT 'chat' CHECK (mode IN ('chat','journal','command','report')),
  messages JSONB DEFAULT '[]',
  context_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks / follow-ups
CREATE TABLE IF NOT EXISTS rpm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task','follow_up','commitment','reminder','appointment')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  due_date DATE,
  due_time TIME,
  linked_lead_id UUID,
  linked_vehicle_id TEXT,
  source TEXT DEFAULT 'manual',
  source_journal_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles extended
CREATE TABLE IF NOT EXISTS rpm_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT,
  model TEXT,
  variant TEXT,
  year INTEGER,
  registration TEXT,
  chassis_no TEXT,
  color TEXT,
  mileage INTEGER,
  fuel_type TEXT DEFAULT 'Petrol',
  transmission TEXT DEFAULT 'Automatic',
  drive_type TEXT DEFAULT '2WD',
  engine_cc INTEGER,
  body_type TEXT,
  condition TEXT DEFAULT 'Good',
  auction_grade TEXT,
  purchase_price_pkr NUMERIC(14,2),
  purchase_price_jpy NUMERIC(14,2),
  import_cost_id UUID,
  total_investment_pkr NUMERIC(14,2),
  repair_cost_pkr NUMERIC(14,2) DEFAULT 0,
  asking_price_pkr NUMERIC(14,2),
  expected_profit_pkr NUMERIC(14,2),
  profit_margin_pct NUMERIC(6,2),
  roi_pct NUMERIC(6,2),
  status TEXT DEFAULT 'available' CHECK (status IN ('available','reserved','sold','in_transit','under_repair')),
  supplier TEXT,
  auction_house TEXT,
  purchase_date DATE,
  sold_date DATE,
  sold_price_pkr NUMERIC(14,2),
  ai_tags TEXT[] DEFAULT '{}',
  description TEXT,
  features JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved prompts
CREATE TABLE IF NOT EXISTS rpm_saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rpm_saved_prompts (title, prompt, category) VALUES
('Morning Brief', 'Generate my RPM Morning Brief for today', 'proactive'),
('Analyze RPM', 'Analyze RPM Motors — show me the most important actions to take today', 'intelligence'),
('Hot Leads', 'Show me all hot leads with their last interaction', 'leads'),
('Aging Stock', 'Which vehicles have been in stock over 30 days? Show analysis', 'inventory'),
('This Month Report', 'Generate a comprehensive report for this month', 'reports'),
('End of Day', 'Generate my end of day close summary', 'proactive'),
('Stock Recommendations', 'Based on our leads and sales, what vehicles should we buy?', 'inventory'),
('What am I forgetting?', 'What tasks, follow-ups, and commitments are pending or overdue?', 'memory')
ON CONFLICT DO NOTHING;
