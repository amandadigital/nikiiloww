-- ==============================================================================
-- FIX CHATS & MESSAGES SYNC ACROSS DEVICES FOR NAISURU
-- Run this script in the Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Ensure public.chats table exists with correct schema
create table if not exists public.chats (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'new conversation',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_chats_user_id on public.chats (user_id);
create index if not exists idx_chats_updated_at on public.chats (updated_at desc);

-- 2. Ensure public.messages table exists with correct schema
create table if not exists public.messages (
  id text primary key,
  chat_id text references public.chats(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_chat_id on public.messages (chat_id);
create index if not exists idx_messages_user_id on public.messages (user_id);
create index if not exists idx_messages_created_at on public.messages (created_at asc);

-- 3. Enable Row Level Security (RLS)
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- 4. Recreate RLS Policies for public.chats
drop policy if exists "Users can view own chats" on public.chats;
create policy "Users can view own chats"
  on public.chats for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chats" on public.chats;
create policy "Users can insert own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own chats" on public.chats;
create policy "Users can update own chats"
  on public.chats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats"
  on public.chats for delete
  using (auth.uid() = user_id);

-- 5. Recreate RLS Policies for public.messages
-- (CRITICAL: Added UPDATE policy, which is required for Supabase .upsert() calls!)
drop policy if exists "Users can view own messages" on public.messages;
create policy "Users can view own messages"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own messages" on public.messages;
create policy "Users can update own messages"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- 6. Grant permissions to authenticated and service_role
grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.chats to service_role;
grant all on public.messages to service_role;
