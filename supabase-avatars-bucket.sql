-- =========================================================================
-- DigitalDance — Storage bucket za avatare (potrebno za S4, izmena profila)
-- Pokreni ovo jednom u Supabase SQL Editor-u.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Svako moze da vidi avatare (bucket je public, ali eksplicitna select politika ne smeta)
create policy "Anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Ulogovan korisnik moze da otpremi SAMO svoj avatar (putanja mora poceti sa njegovim user id-jem)
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ulogovan korisnik moze da izmeni/zameni SAMO svoj avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
