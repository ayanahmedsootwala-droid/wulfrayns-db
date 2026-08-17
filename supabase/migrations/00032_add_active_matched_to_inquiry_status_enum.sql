
-- Add missing enum values that frontend uses but DB didn't have
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'active'    AFTER 'new';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'matched'   AFTER 'in_progress';
