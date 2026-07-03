-- =========================================================================
-- DigitalDance — Storage bucket za video snimke (potrebno za S6, otpremanje videa)
-- Pokreni ovo jednom u Supabase SQL Editor-u.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Svako moze da gleda videe (bucket je public)
create policy "Anyone can view videos"
on storage.objects for select
to public
using (bucket_id = 'videos');

-- Ulogovan korisnik moze da otpremi SAMO u svoj folder (putanja mora poceti sa njegovim user id-jem)
create policy "Users can upload their own videos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ulogovan korisnik moze da obrise SAMO svoje video fajlove
create policy "Users can delete their own videos"
on storage.objects for delete
to authenticated
using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================================
-- RLS politike za public.videos tabelu (za slucaj da vec nisu podesene).
-- Ako dobijes gresku "policy already exists" za neku od njih, to znaci da
-- vec postoji i mozes slobodno da ignorises tu gresku.
-- =========================================================================

alter table public.videos enable row level security;

create policy "Anyone can view videos rows"
on public.videos for select
to public
using (true);

create policy "Users can insert their own video rows"
on public.videos for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own video rows"
on public.videos for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own video rows"
on public.videos for delete
to authenticated
using (auth.uid() = user_id);
