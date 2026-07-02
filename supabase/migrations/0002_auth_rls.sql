-- ══════════════════════════════════════════════════════════════════════════
-- 0002_auth_rls.sql — ⚠️ TARGET (NFR-01/02): perketat RLS permissive → berbasis
-- Supabase Auth `auth.uid()` + keanggotaan perusahaan. Menggantikan policy
-- `using (true)` dari 0001. Prasyarat: Supabase Auth aktif & `users.id`/
-- `memberships.user_id` = `auth.uid()::text` (user id = uid Auth).
--
-- Belum bisa dijalankan/diuji di environment ini (butuh Supabase live). Terapkan
-- dengan `supabase db push`, verifikasi dengan pgTAP (lihat catatan di bawah).
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Buang policy permissive lama.
do $$
declare t text;
begin
  foreach t in array array[
    'users','companies','departments','memberships','risks','assessments','treatments',
    'kris','incidents','compliance_requirements','audit_entries','risk_compliance','incident_risks'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_permissive', t);
  end loop;
end $$;

-- 2) Helper SECURITY DEFINER — cek keanggotaan tanpa memicu RLS rekursif pada
--    `memberships` (definer melewati RLS saat query internal). STABLE + search_path
--    dikunci agar aman dari hijack.
create or replace function public.is_company_member(p_company_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()::text
  );
$$;

create or replace function public.has_company_role(p_company_id text, p_role membership_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()::text
      and p_role = any(m.roles)
  );
$$;

revoke all on function public.is_company_member(text) from public;
revoke all on function public.has_company_role(text, membership_role) from public;
grant execute on function public.is_company_member(text) to authenticated;
grant execute on function public.has_company_role(text, membership_role) to authenticated;

-- 3) Policy per tabel — semua di-scope ke perusahaan yang menjadi anggota user.
--    Baca & tulis dibatasi anggota; org-write (departemen/anggota) hanya admin.

-- companies: anggota boleh baca; ubah profil hanya admin.
create policy companies_select on companies for select to authenticated
  using (is_company_member(id));
create policy companies_write on companies for update to authenticated
  using (has_company_role(id, 'admin')) with check (has_company_role(id, 'admin'));

-- users: hanya user yang berbagi perusahaan (atau diri sendiri) yang terlihat.
create policy users_select on users for select to authenticated
  using (
    id = auth.uid()::text
    or exists (
      select 1 from memberships me
      join memberships them on them.company_id = me.company_id
      where me.user_id = auth.uid()::text and them.user_id = users.id
    )
  );

-- memberships: anggota perusahaan boleh baca; kelola (undang/ubah/keluarkan) hanya admin.
create policy memberships_select on memberships for select to authenticated
  using (is_company_member(company_id));
create policy memberships_write on memberships for all to authenticated
  using (has_company_role(company_id, 'admin')) with check (has_company_role(company_id, 'admin'));

-- departments: baca anggota; tulis admin.
create policy departments_select on departments for select to authenticated
  using (is_company_member(company_id));
create policy departments_write on departments for all to authenticated
  using (has_company_role(company_id, 'admin')) with check (has_company_role(company_id, 'admin'));

-- Tabel data operasional dengan company_id langsung — baca & tulis oleh anggota.
do $$
declare t text;
begin
  foreach t in array array['risks','incidents','compliance_requirements','audit_entries'] loop
    execute format(
      $p$create policy %I on %I for all to authenticated
         using (is_company_member(company_id)) with check (is_company_member(company_id))$p$,
      t || '_member', t);
  end loop;
end $$;

-- Tabel anak risiko (assessments/treatments/kris) — scoping lewat company_id risiko induk.
do $$
declare t text;
begin
  foreach t in array array['assessments','treatments','kris'] loop
    execute format(
      $p$create policy %I on %I for all to authenticated
         using (exists (select 1 from risks r where r.id = %I.risk_id and is_company_member(r.company_id)))
         with check (exists (select 1 from risks r where r.id = %I.risk_id and is_company_member(r.company_id)))$p$,
      t || '_member', t, t, t);
  end loop;
end $$;

-- Join m:n — scoping lewat induk (risk/compliance/incident) yang sudah ter-RLS.
create policy risk_compliance_member on risk_compliance for all to authenticated
  using (exists (select 1 from risks r where r.id = risk_compliance.risk_id and is_company_member(r.company_id)))
  with check (exists (select 1 from risks r where r.id = risk_compliance.risk_id and is_company_member(r.company_id)));

create policy incident_risks_member on incident_risks for all to authenticated
  using (exists (select 1 from incidents i where i.id = incident_risks.incident_id and is_company_member(i.company_id)))
  with check (exists (select 1 from incidents i where i.id = incident_risks.incident_id and is_company_member(i.company_id)));

-- ── Catatan verifikasi (pgTAP, target) ──────────────────────────────────────
-- Uji cross-company deny: set request.jwt.claim.sub = user A (perusahaan X),
-- lalu `select` baris perusahaan Y harus 0 baris; `insert` ke Y harus gagal RLS.
-- Contoh: SELECT is_empty($$ select * from risks where company_id = 'co-Y' $$, ...);
