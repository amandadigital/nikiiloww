-- ==============================================================================
-- ENFORCE ONE LIKE PER USER PER POST & SYNC LIKE COUNTS
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Create post_likes table if it doesn't already exist
create table if not exists public.post_likes (
  post_id text not null,
  user_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Clean up any existing duplicate likes before adding constraints
delete from public.post_likes a
using public.post_likes b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.user_id = b.user_id;

-- 3. Enforce strictly ONE like per user per post (Unique Composite Primary Key)
do $$
begin
  -- Check if primary key exists, otherwise add it
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'post_likes'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.post_likes add primary key (post_id, user_id);
  end if;
end $$;

-- 4. Create an index on user_id for fast retrieval of user's liked posts
create index if not exists idx_post_likes_user_id on public.post_likes (user_id);
create index if not exists idx_post_likes_post_id on public.post_likes (post_id);

-- 5. Enable Row Level Security (RLS)
alter table public.post_likes enable row level security;

-- Policies:
-- Anyone can view likes
drop policy if exists "Likes are viewable by everyone" on public.post_likes;
create policy "Likes are viewable by everyone"
  on public.post_likes for select
  using (true);

-- Authenticated users can insert their own like (strictly 1 like due to PK)
drop policy if exists "Authenticated users can toggle like" on public.post_likes;
drop policy if exists "Authenticated users can like once" on public.post_likes;
create policy "Authenticated users can like once"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

-- Users can delete/unlike their own like
drop policy if exists "Users can remove own like" on public.post_likes;
create policy "Users can remove own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- 6. Trigger function to automatically keep posts.likes_count synchronized in real-time
create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer
as $$
declare
  target_post_id text;
begin
  if (TG_OP = 'DELETE') then
    target_post_id := OLD.post_id;
  else
    target_post_id := NEW.post_id;
  end if;

  update public.posts
  set likes_count = (
    select count(*)
    from public.post_likes
    where post_likes.post_id = target_post_id
  )
  where id = target_post_id;

  return null;
end;
$$;

-- Drop trigger if it already exists, then create it
drop trigger if exists trg_sync_post_likes_count on public.post_likes;
create trigger trg_sync_post_likes_count
after insert or delete on public.post_likes
for each row
execute function public.sync_post_likes_count();

-- 7. Recount and synchronize existing likes_count for all posts
update public.posts p
set likes_count = coalesce((
  select count(*)
  from public.post_likes pl
  where pl.post_id = p.id
), 0);

-- 8. Verify constraints and triggers
select 
  tc.constraint_name, 
  tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public' 
  and tc.table_name = 'post_likes';
