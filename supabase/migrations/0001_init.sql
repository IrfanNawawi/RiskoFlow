-- RiskoFlow — skema awal (mirror src/data/types.ts + invariant src/data/store.ts).
-- Metodologi MVP: kualitatif 5×5 (likelihood × impact) → risk_level (D4).
-- Uang = integer rupiah penuh (bigint), tidak pernah float.
-- PK = text agar selaras dengan id buatan klien ("r-...", "u-budi") & seed.

-- ──────────────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────────────
create type industry_type      as enum ('JASA', 'DAGANG', 'MANUFACTURE');
create type compliance_industry as enum ('JASA', 'DAGANG', 'MANUFACTURE', 'GENERAL');
create type membership_role    as enum ('admin', 'risk_manager', 'dept_head', 'executive', 'compliance');
create type risk_category      as enum ('FINANCIAL', 'OPERATIONAL', 'LEGAL', 'REPUTATIONAL', 'STRATEGIC');
create type risk_source        as enum ('INTERNAL', 'EXTERNAL');
create type risk_status        as enum ('identified', 'assessed', 'treated', 'monitored', 'closed');
create type risk_level         as enum ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');
create type treatment_strategy as enum ('AVOID', 'REDUCE', 'TRANSFER', 'ACCEPT');
create type treatment_status   as enum ('planned', 'in_progress', 'done');
create type incident_type      as enum ('LOSS', 'NEAR_MISS');
create type incident_status    as enum ('open', 'investigating', 'closed');
create type review_frequency   as enum ('weekly', 'monthly', 'quarterly');
create type compliance_status  as enum ('compliant', 'partial', 'non_compliant');
create type assessment_kind    as enum ('inherent', 'residual');

-- ──────────────────────────────────────────────────────────────────────────
-- Fungsi kanonik severity → level (D4). IMMUTABLE → boleh dipakai generated column.
-- Cermin dari computeRiskLevel() di src/lib/risk.ts.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function compute_risk_level(severity int)
returns risk_level
language sql immutable
as $$
  -- PRD D4: LOW 1–4, MEDIUM 5–9, HIGH 10–15, EXTREME 16–25
  select case
    when severity >= 16 then 'EXTREME'::risk_level
    when severity >= 10 then 'HIGH'::risk_level
    when severity >= 5  then 'MEDIUM'::risk_level
    else 'LOW'::risk_level
  end
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Tabel
-- ──────────────────────────────────────────────────────────────────────────
create table users (
  id       text primary key,
  name     text not null,
  email    text not null unique,
  initials text not null
);

create table companies (
  id                       text primary key,
  name                     text not null,
  industry_type            industry_type not null,
  employee_count           int not null check (employee_count > 0),
  close_approval_threshold bigint not null default 50000000,
  ai_enabled               boolean not null default true
);

create table departments (
  id           text primary key,
  company_id   text not null references companies(id) on delete cascade,
  name         text not null,
  description  text,
  head_user_id text references users(id)
);
-- Ekspresi (lower) tak boleh di constraint inline → unique index terpisah (dedupe case-insensitive).
create unique index departments_company_name_uniq on departments (company_id, lower(name));

create table memberships (
  id         text primary key,
  company_id text not null references companies(id) on delete cascade,
  user_id    text not null references users(id) on delete cascade,
  roles      membership_role[] not null default '{}',
  unique (company_id, user_id)
);

create table risks (
  id               text primary key,
  code             text not null,
  company_id       text not null references companies(id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 150),
  description      text not null default '',
  category         risk_category not null,
  source           risk_source not null,
  department_id    text not null references departments(id),
  owner_id         text not null references users(id),
  status           risk_status not null default 'identified',
  ai_suggested     boolean not null default false,
  review_frequency review_frequency not null default 'quarterly',
  next_review_date timestamptz not null,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (company_id, code)
);
create index on risks (company_id) where deleted_at is null;

create table assessments (
  id               text primary key,
  risk_id          text not null references risks(id) on delete cascade,
  likelihood       int not null check (likelihood between 1 and 5),
  impact           int not null check (impact between 1 and 5),
  severity         int generated always as (likelihood * impact) stored,      -- FR-ASSESS-2
  level            risk_level generated always as (compute_risk_level(likelihood * impact)) stored,
  kind             assessment_kind not null,
  note             text,
  financial_impact bigint,
  at               timestamptz not null default now(),
  by               text not null references users(id)
);
create index on assessments (risk_id, kind, at desc);

create table treatments (
  id                text primary key,
  risk_id           text not null references risks(id) on delete cascade,
  strategy          treatment_strategy not null,
  description       text not null,
  owner_id          text not null references users(id),
  due_date          timestamptz not null,
  status            treatment_status not null default 'planned',
  cost              bigint not null default 0,
  justification     text,
  approved          boolean,            -- NULL untuk non-ACCEPT; false→true setelah disetujui (FR-TREAT-3)
  approved_by       text references users(id),
  transfer_provider text,
  transfer_premium  bigint
);
create index on treatments (risk_id);

create table kris (
  id        text primary key,
  risk_id   text not null references risks(id) on delete cascade,
  name      text not null,
  current   text not null,
  threshold text not null,
  ratio     real not null default 0,
  breached  boolean not null default false
);
create index on kris (risk_id);

create table incidents (
  id                text primary key,
  company_id        text not null references companies(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  occurred_at       timestamptz not null,
  department_id     text not null references departments(id),
  type              incident_type not null,
  loss_amount       bigint not null default 0 check (loss_amount >= 0),
  root_cause        text,
  corrective_action text,
  status            incident_status not null default 'open',
  approved          boolean,
  deleted_at        timestamptz
);
create index on incidents (company_id) where deleted_at is null;

create table compliance_requirements (
  id              text primary key,
  company_id      text not null references companies(id) on delete cascade,
  industry_type   compliance_industry not null,
  regulation_name text not null,
  description     text not null default '',
  authority       text not null,
  is_system       boolean not null default false,
  status          compliance_status not null default 'partial',
  progress        int not null default 0 check (progress between 0 and 100)
);
create index on compliance_requirements (company_id);

create table audit_entries (
  id         text primary key default ('a-' || gen_random_uuid()),
  company_id text not null references companies(id) on delete cascade,
  at         timestamptz not null default now(),
  actor      text not null,
  action     text not null,
  entity     text not null,
  detail     text not null default ''
);
create index on audit_entries (company_id, at desc);

-- Join m:n compliance ↔ risk (ganti array complianceIds/linkedRiskIds di store).
create table risk_compliance (
  risk_id       text not null references risks(id) on delete cascade,
  compliance_id text not null references compliance_requirements(id) on delete cascade,
  primary key (risk_id, compliance_id)
);

-- Join insiden ↔ risiko.
create table incident_risks (
  incident_id text not null references incidents(id) on delete cascade,
  risk_id     text not null references risks(id) on delete cascade,
  primary key (incident_id, risk_id)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Invariant DB-enforced (D22)
-- ──────────────────────────────────────────────────────────────────────────

-- Gate penutupan insiden kerugian besar (FR-INC-6): LOSS ≥ threshold perusahaan
-- wajib approved sebelum status 'closed'.
create or replace function enforce_incident_close_gate()
returns trigger language plpgsql as $$
declare threshold bigint;
begin
  if new.status = 'closed' and new.type = 'LOSS' then
    select close_approval_threshold into threshold from companies where id = new.company_id;
    if new.loss_amount >= threshold and coalesce(new.approved, false) = false then
      raise exception 'Insiden LOSS >= ambang (% ) wajib approval risk_manager sebelum ditutup', threshold;
    end if;
  end if;
  return new;
end $$;
create trigger trg_incident_close_gate
  before insert or update on incidents
  for each row execute function enforce_incident_close_gate();

-- Insiden ter-link memajukan next_review_date risiko ke sekarang (FR-INC-4/D13).
create or replace function advance_linked_risk_review()
returns trigger language plpgsql as $$
begin
  update risks set next_review_date = now() where id = new.risk_id;
  return new;
end $$;
create trigger trg_incident_advance_review
  after insert on incident_risks
  for each row execute function advance_linked_risk_review();

-- Audit otomatis (mirror logAudit) untuk tabel ber-company_id langsung.
create or replace function log_audit_generic()
returns trigger language plpgsql as $$
declare
  v_action text := case tg_op when 'INSERT' then 'CREATE' when 'UPDATE' then 'UPDATE' else 'DELETE' end;
  v_row record := case when tg_op = 'DELETE' then old else new end;
begin
  insert into audit_entries (company_id, actor, action, entity, detail)
  values (
    v_row.company_id,
    coalesce(current_setting('app.actor', true), 'System'),
    v_action,
    tg_table_name,
    tg_table_name || ' ' || v_row.id || ' (' || lower(v_action) || ')'
  );
  return v_row;
end $$;
create trigger trg_audit_risks
  after insert or update or delete on risks
  for each row execute function log_audit_generic();
create trigger trg_audit_incidents
  after insert or update or delete on incidents
  for each row execute function log_audit_generic();
create trigger trg_audit_compliance
  after insert or update or delete on compliance_requirements
  for each row execute function log_audit_generic();

-- ──────────────────────────────────────────────────────────────────────────
-- RPC provisioning atomik (D25/D27): company + departments + membership
-- (admin+risk_manager) + seed regulasi industri — satu transaksi.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function create_company_with_admin(
  p_user_id        text,
  p_name           text,
  p_industry_type  industry_type,
  p_employee_count int,
  p_departments    text[]
) returns text
language plpgsql security definer
as $$
declare
  v_cid  text := 'co-' || gen_random_uuid();
  v_dept text;
  v_seen text[] := '{}';
  v_i    int := 0;
  v_reg  record;
begin
  insert into companies (id, name, industry_type, employee_count)
  values (v_cid, btrim(p_name), p_industry_type, p_employee_count);

  -- Departemen: dedupe case-insensitive, skip kosong.
  foreach v_dept in array coalesce(p_departments, '{}') loop
    v_dept := btrim(v_dept);
    if v_dept = '' or lower(v_dept) = any(v_seen) then continue; end if;
    v_seen := array_append(v_seen, lower(v_dept));
    insert into departments (id, company_id, name)
    values ('d-' || v_cid || '-' || v_i, v_cid, v_dept);
    v_i := v_i + 1;
  end loop;

  -- Pembuat memperoleh admin + risk_manager (D27).
  insert into memberships (id, company_id, user_id, roles)
  values ('mem-' || v_cid, v_cid, p_user_id, array['admin','risk_manager']::membership_role[]);

  -- Seed library regulasi (GENERAL + per industri) — is_system = true (read-only, FR-COMP-6).
  for v_reg in
    select * from (values
      ('ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', 'GENERAL'),
      ('Prinsip GCG', 'Tata kelola perusahaan yang baik.', 'KNKG', 'GENERAL')
    ) as g(regulation_name, description, authority, industry)
    union all
    select * from (
      select regulation_name, description, authority, p_industry_type::text
      from (values
        ('UU No. 1/1970', 'Keselamatan Kerja.', 'Pemerintah RI', 'MANUFACTURE'),
        ('PP No. 50/2012 (SMK3)', 'Sistem Manajemen K3.', 'Kemnaker', 'MANUFACTURE'),
        ('PP No. 22/2021', 'PPLH + limbah B3.', 'KLHK', 'MANUFACTURE'),
        ('UU No. 33/2014', 'Jaminan Produk Halal.', 'BPJPH', 'MANUFACTURE'),
        ('UU No. 7/2014', 'Perdagangan.', 'Kemendag', 'DAGANG'),
        ('UU No. 8/1999', 'Perlindungan Konsumen.', 'Pemerintah RI', 'DAGANG'),
        ('Perizinan OSS/NIB', 'Perizinan berusaha.', 'BKPM/OSS', 'DAGANG'),
        ('UU No. 27/2022', 'Pelindungan Data Pribadi.', 'Kominfo', 'DAGANG'),
        ('UU Ketenagakerjaan jo. UU Cipta Kerja', 'Hubungan kerja.', 'Kemnaker', 'JASA'),
        ('UU No. 8/1999', 'Perlindungan Konsumen.', 'Pemerintah RI', 'JASA'),
        ('UU No. 27/2022', 'Pelindungan Data Pribadi.', 'Kominfo', 'JASA'),
        ('ISO/IEC 27001', 'Keamanan informasi (sukarela).', 'ISO', 'JASA')
      ) as ind(regulation_name, description, authority, industry)
      where industry = p_industry_type::text
    ) as filtered(regulation_name, description, authority, industry)
  loop
    insert into compliance_requirements
      (id, company_id, industry_type, regulation_name, description, authority, is_system, status, progress)
    values
      ('c-' || v_cid || '-' || gen_random_uuid(), v_cid, v_reg.industry::compliance_industry,
       v_reg.regulation_name, v_reg.description, v_reg.authority, true, 'partial', 0);
  end loop;

  insert into audit_entries (company_id, actor, action, entity, detail)
  values (v_cid, p_user_id, 'CREATE', 'Company',
          'create_company_with_admin: ' || btrim(p_name) || ' + ' || v_i || ' departemen');

  return v_cid;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- RLS — AKTIF tapi PERMISSIVE (auth masih ditunda; scoping tenant client-side).
-- TODO(auth): ganti policy `using (true)` dengan filter berbasis auth.uid() +
-- membership perusahaan aktif (NFR-02). Lihat catatan plan.
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','companies','departments','memberships','risks','assessments','treatments',
    'kris','incidents','compliance_requirements','audit_entries','risk_compliance','incident_risks'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for all to anon, authenticated using (true) with check (true)$p$,
                   t || '_permissive', t);
  end loop;
end $$;
