-- ==============================================================================
-- MIGRATION: LINK POSTS BY USER_ID (INSTEAD OF USERNAME) & AUTO-UPDATE USERNAMES
-- Run this script in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Ensure public.posts has user_id foreign key referencing public.profiles(id)
-- First drop existing foreign key if it was pointing to auth.users only
alter table if exists public.posts
  drop constraint if exists posts_user_id_fkey,
  drop constraint if exists fk_posts_profiles;

-- Add foreign key referencing public.profiles with cascading deletes
alter table public.posts
  add constraint posts_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- Index for instant lookups by user ID
create index if not exists idx_posts_user_id on public.posts (user_id);

-- 2. Backfill any existing posts where author_username/author_name might be outdated
update public.posts p
set
  author_username = pr.username,
  author_name = coalesce(pr.name, pr.username),
  author_avatar = coalesce(pr.avatar_url, ''),
  is_verified = coalesce(pr.is_verified, false)
from public.profiles pr
where p.user_id = pr.id;

-- 3. Create Trigger Function to automatically cascade username & name changes
-- Whenever a user updates their username, display name, avatar, or verified status in profiles,
-- this trigger will immediately update all posts authored by that user!
create or replace function public.sync_profile_to_posts()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts
  set
    author_username = new.username,
    author_name = coalesce(new.name, new.username),
    author_avatar = coalesce(new.avatar_url, ''),
    is_verified = coalesce(new.is_verified, false)
  where user_id = new.id;
  return new;
end;
$$;

-- 4. Attach Trigger to public.profiles
drop trigger if exists on_profile_updated_sync_posts on public.profiles;
create trigger on_profile_updated_sync_posts
  after update of username, name, avatar_url, is_verified on public.profiles
  for each row
  execute function public.sync_profile_to_posts();

-- 5. Helper view to query posts joined with the author profile
create or replace view public.posts_with_author as
select
  p.id,
  p.user_id,
  coalesce(pr.username, p.author_username) as author_username,
  coalesce(pr.name, pr.username, p.author_name) as author_name,
  coalesce(pr.avatar_url, p.author_avatar) as author_avatar,
  coalesce(pr.is_verified, p.is_verified, false) as is_verified,
  p.content,
  p.likes_count,
  p.created_at
from public.posts p
left join public.profiles pr on pr.id = p.user_id
order by p.created_at desc;

grant select on public.posts_with_author to anon, authenticated;
