-- ==============================================================================
-- MIGRATION: ADD COMPANION DATING & RELATIONSHIP SETTINGS
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Ensure the profiles table has all companion personality & dating columns
alter table public.profiles
  add column if not exists companion_name text default 'nikilow',
  add column if not exists companion_prompt text,
  add column if not exists companion_avatar_url text,
  add column if not exists companion_personality jsonb,
  add column if not exists companion_relationship_status text default 'dating_user',
  add column if not exists companion_partner_name text;

-- 2. Optional: Set default relationship status for any existing rows that have null
update public.profiles
set companion_relationship_status = 'dating_user'
where companion_relationship_status is null;

-- 3. Verify the columns are ready
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'profiles'
  and column_name like 'companion_%';
