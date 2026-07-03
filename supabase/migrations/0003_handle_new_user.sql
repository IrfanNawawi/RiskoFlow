-- ══════════════════════════════════════════════════════════════════════════
-- 0003_handle_new_user.sql — ⚠️ TARGET (NFR-01): auto-seed profil aplikasi saat
-- ada signup di Supabase Auth. Menjembatani `auth.users` → `public.users` agar
-- `users.id = auth.uid()::text` (prasyarat RLS di 0002_auth_rls.sql).
--
-- Tanpa ini: login Supabase berhasil, tetapi user tak punya baris di `public.users`
-- → tak ada membership → app tampil kosong ("berhasil tapi blank").
--
-- Catatan: trigger ini HANYA membuat profil user. Keanggotaan perusahaan
-- (`memberships`) tetap dibuat lewat alur onboarding (buat perusahaan) atau
-- undangan admin — bukan di sini, karena perusahaan belum tentu ada saat signup.
--
-- Belum bisa dijalankan/diuji di environment ini (butuh Supabase live). Terapkan
-- dengan `supabase db push`.
-- ══════════════════════════════════════════════════════════════════════════

-- Inisial dari nama: ambil huruf pertama maksimal 2 kata, uppercase.
-- Contoh: "Budi Santoso" → "BS"; "budi" → "B".
create or replace function public.derive_initials(p_name text)
returns text
language sql
immutable
as $$
  select upper(
    string_agg(left(word, 1), '')
  )
  from (
    select word
    from regexp_split_to_table(trim(coalesce(p_name, '')), '\s+') with ordinality as t(word, ord)
    where word <> ''
    order by ord
    limit 2
  ) w;
$$;

-- Handler signup: sisipkan/naikkan baris profil `public.users`.
-- SECURITY DEFINER + search_path terkunci agar bisa menulis meski dipanggil dari
-- konteks auth dan aman dari hijack search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_initials text;
begin
  -- Nama: prioritas metadata (name / full_name), fallback ke local-part email.
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_initials := coalesce(nullif(public.derive_initials(v_name), ''), '?');

  insert into public.users (id, name, email, initials)
  values (new.id::text, v_name, new.email, v_initials)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

-- Pasang trigger (idempoten: buang dulu bila sudah ada).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
