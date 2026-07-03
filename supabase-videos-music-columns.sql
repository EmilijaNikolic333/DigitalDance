-- =========================================================================
-- DigitalDance — kolone za pesmu izabranu preko iTunes API-ja (metapodatak,
-- ne umesava se u sam video fajl). Pokreni jednom u Supabase SQL Editor-u.
-- =========================================================================

alter table public.videos
  add column if not exists song_title text,
  add column if not exists song_artist text,
  add column if not exists song_preview_url text;
