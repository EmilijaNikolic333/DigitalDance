-- =========================================================================
-- DigitalDance — brojanje pregleda videa (S7, feed)
--
-- Postojeca RLS politika na public.videos dozvoljava UPDATE samo vlasniku
-- videa (auth.uid() = user_id), sto je ispravno za naslov/opis/itd, ali
-- pregledi treba da se broje i kad TUDJI video gledas. Ova funkcija radi
-- kao "security definer" i menja SAMO views_count, bez obzira ko je vlasnik,
-- pa ne mora da se otvara cela tabela za izmenu od strane bilo koga.
--
-- Pokreni jednom u Supabase SQL Editor-u.
-- =========================================================================

drop function if exists public.increment_video_views(uuid);

create or replace function public.increment_video_views(video_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.videos
  set views_count = views_count + 1
  where id = video_id;
$$;

grant execute on function public.increment_video_views(uuid) to authenticated;
