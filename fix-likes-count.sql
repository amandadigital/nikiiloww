-- ==============================================================================
-- FIX LIKES COUNT & PREVENT +2 DOUBLE-INCREMENT
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Deduplicate any duplicate likes in public.post_likes
delete from public.post_likes a
using public.post_likes b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.user_id = b.user_id;

-- 2. Ensure Primary Key constraint exists on (post_id, user_id)
do $$
begin
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

-- 3. Replace increment_post_likes with an exact recount function
-- (Prevents blind +1 additions when called alongside triggers)
create or replace function public.increment_post_likes(post_id_input text)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = (
    select count(*)
    from public.post_likes
    where post_likes.post_id = post_id_input
  )
  where id = post_id_input;
end;
$$;

create or replace function public.decrement_post_likes(post_id_input text)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = (
    select count(*)
    from public.post_likes
    where post_likes.post_id = post_id_input
  )
  where id = post_id_input;
end;
$$;

grant execute on function public.increment_post_likes(text) to anon, authenticated;
grant execute on function public.decrement_post_likes(text) to anon, authenticated;

-- 4. Clean up any redundant old triggers that may have been doubling increments
drop trigger if exists trg_sync_post_likes_count on public.post_likes;

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

create trigger trg_sync_post_likes_count
after insert or delete on public.post_likes
for each row
execute function public.sync_post_likes_count();

-- 5. Recount and fix all current posts' likes_count to match reality
update public.posts p
set likes_count = coalesce((
  select count(*)
  from public.post_likes pl
  where pl.post_id = p.id
), 0);

-- 6. Show results to confirm exact like counts
select id, substring(content, 1, 40) as preview, likes_count
from public.posts
order by created_at desc
limit 10;
