-- ==============================================================================
-- PROFILE DECORATIONS & LIKES DATABASE MIGRATION SCRIPT
-- Run this script in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
-- ==============================================================================

-- 1. Add decorations column to profiles table if not exists
alter table public.profiles
  add column if not exists decorations jsonb default '{}'::jsonb;

-- 2. Add decorations column to posts table if not exists
alter table public.posts
  add column if not exists decorations jsonb default '{}'::jsonb;

-- 3. Ensure post_likes table exists with primary key (post_id, user_id)
create table if not exists public.post_likes (
  post_id text references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

-- Index for instant user like lookups
create index if not exists idx_post_likes_user_id on public.post_likes (user_id);
create index if not exists idx_post_likes_post_id on public.post_likes (post_id);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

-- 5. RLS Policies for Profiles
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 6. RLS Policies for Posts (decorations readable by everybody)
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id and char_length(content) <= 300);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- 7. RLS Policies for Post Likes (Instant like status check)
drop policy if exists "Likes are viewable by everyone" on public.post_likes;
create policy "Likes are viewable by everyone"
  on public.post_likes for select
  using (true);

drop policy if exists "Authenticated users can toggle like" on public.post_likes;
create policy "Authenticated users can toggle like"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own like" on public.post_likes;
create policy "Users can remove own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- 8. Trigger: Automatically cascade profile decorations to all posts by this user
-- Whenever a user saves their decorations, all their feed posts instantly show the new decorations!
create or replace function public.sync_profile_decorations_to_posts()
returns trigger language plpgsql security definer as $$
begin
  if new.decorations is distinct from old.decorations then
    update public.posts
    set decorations = new.decorations
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_decorations_updated on public.profiles;
create trigger on_profile_decorations_updated
  after update on public.profiles
  for each row execute function public.sync_profile_decorations_to_posts();

-- Grant appropriate permissions to authenticated and anon roles
grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.posts to anon, authenticated;
grant select, insert, delete on public.post_likes to anon, authenticated;
