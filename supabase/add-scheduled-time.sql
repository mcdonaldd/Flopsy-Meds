-- Run this in Supabase SQL Editor if you created the database before scheduled_time was added.
ALTER TABLE meds ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
