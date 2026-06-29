-- Seed data demo — port dari src/data/seed.ts (2 tenant, user u-budi, dst.).
-- Catatan: trigger audit & auto-advance review ikut menyala saat seeding (menambah
-- beberapa baris audit & memajukan next_review_date risiko ter-link) — wajar, bukti
-- invarian DB bekerja. severity/level di assessments ter-generate otomatis.

-- Users (termasuk pseudo-user 'AI' agar FK assessments.by valid untuk draft AI).
insert into users (id, name, email, initials) values
  ('AI',     'AI Assistant', 'ai@riskoflow.system', 'AI'),
  ('u-budi', 'Budi Santoso', 'budi@majumanufaktur.id', 'BS'),
  ('u-sari', 'Sari Wibowo', 'sari@majumanufaktur.id', 'SW'),
  ('u-andi', 'Andi Pratama', 'andi@majumanufaktur.id', 'AP'),
  ('u-dewi', 'Dewi Lestari', 'dewi@majumanufaktur.id', 'DL'),
  ('u-rio',  'Rio Hartono',  'rio@majumanufaktur.id',  'RH');

-- Companies
insert into companies (id, name, industry_type, employee_count, close_approval_threshold, ai_enabled) values
  ('co-maju',    'PT Maju Manufaktur', 'MANUFACTURE', 240, 50000000, true),
  ('co-sentosa', 'PT Sentosa Niaga',   'DAGANG',       85, 50000000, true);

-- Memberships
insert into memberships (id, company_id, user_id, roles) values
  ('mem-1', 'co-maju',    'u-budi', array['admin','risk_manager']::membership_role[]),
  ('mem-2', 'co-maju',    'u-sari', array['dept_head']::membership_role[]),
  ('mem-3', 'co-maju',    'u-andi', array['compliance']::membership_role[]),
  ('mem-4', 'co-maju',    'u-dewi', array['executive']::membership_role[]),
  ('mem-5', 'co-sentosa', 'u-budi', array['risk_manager']::membership_role[]);

-- Departments
insert into departments (id, company_id, name, description, head_user_id) values
  ('d-prod', 'co-maju', 'Produksi', 'Lini produksi & manufaktur', 'u-sari'),
  ('d-fin',  'co-maju', 'Keuangan', 'Akuntansi, treasury, pajak', 'u-rio'),
  ('d-hse',  'co-maju', 'HSE', 'Health, Safety & Environment', 'u-andi'),
  ('d-log',  'co-maju', 'Logistik', 'Gudang & rantai pasok', null),
  ('d-it',   'co-maju', 'IT & Data', 'Sistem informasi & keamanan data', null),
  ('d2-ops', 'co-sentosa', 'Operasional', 'Operasi ritel', null),
  ('d2-fin', 'co-sentosa', 'Keuangan', 'Keuangan', null);

-- Compliance library (MANUFACTURE + GENERAL)
insert into compliance_requirements (id, company_id, industry_type, regulation_name, description, authority, is_system, status, progress) values
  ('c-iso31000',  'co-maju', 'GENERAL',     'ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', true, 'compliant', 100),
  ('c-gcg',       'co-maju', 'GENERAL',     'Prinsip GCG', 'Tata kelola perusahaan yang baik (transparansi, akuntabilitas).', 'KNKG', true, 'partial', 70),
  ('c-uu1-1970',  'co-maju', 'MANUFACTURE', 'UU No. 1/1970', 'Keselamatan Kerja.', 'Pemerintah RI', true, 'partial', 65),
  ('c-smk3',      'co-maju', 'MANUFACTURE', 'PP No. 50/2012 (SMK3)', 'Sistem Manajemen Keselamatan & Kesehatan Kerja.', 'Kemnaker', true, 'partial', 65),
  ('c-pp22-2021', 'co-maju', 'MANUFACTURE', 'PP No. 22/2021', 'Perlindungan & pengelolaan lingkungan hidup + limbah B3.', 'KLHK', true, 'non_compliant', 35),
  ('c-halal',     'co-maju', 'MANUFACTURE', 'UU No. 33/2014', 'Jaminan Produk Halal.', 'BPJPH', true, 'compliant', 100),
  ('c-uu27-2022', 'co-maju', 'GENERAL',     'UU No. 27/2022 (PDP)', 'Pelindungan Data Pribadi.', 'Kominfo', true, 'partial', 55),
  ('c-iso27001',  'co-maju', 'GENERAL',     'ISO/IEC 27001', 'Keamanan informasi (sukarela).', 'ISO', false, 'partial', 50),
  ('c-pajak',     'co-maju', 'GENERAL',     'Ketentuan Perpajakan (PPN/PPh)', 'Kepatuhan pelaporan & restitusi pajak.', 'DJP', true, 'compliant', 90);

-- Risks
insert into risks (id, code, company_id, title, description, category, source, department_id, owner_id, status, ai_suggested, review_frequency, next_review_date, created_at) values
  ('r-001','R-014','co-maju','Kegagalan mesin produksi line 2','Risiko operasional kritis penghentian tiba-tiba mesin Line 2; downtime signifikan & gangguan pengiriman.','OPERATIONAL','INTERNAL','d-prod','u-sari','treated',false,'monthly', now() - interval '2 days', now() - interval '45 days'),
  ('r-002','R-021','co-maju','Kebocoran data pelanggan (Data Breach)','Eksposur kredensial & data pribadi pelanggan akibat serangan siber atau kelalaian akses internal.','OPERATIONAL','EXTERNAL','d-it','u-budi','treated',false,'monthly', now() + interval '5 days', now() - interval '45 days'),
  ('r-003','R-008','co-maju','Vendor compliance — keterlambatan sertifikasi','Pemasok utama belum melengkapi sertifikasi mutu; berisiko menghentikan pasokan bahan baku.','LEGAL','EXTERNAL','d-log','u-rio','assessed',false,'quarterly', now() + interval '40 days', now() - interval '45 days'),
  ('r-004','R-033','co-maju','Fluktuasi nilai tukar bahan baku impor','Volatilitas kurs USD/IDR menaikkan biaya bahan baku impor di luar anggaran.','FINANCIAL','EXTERNAL','d-fin','u-rio','treated',false,'monthly', now() + interval '12 days', now() - interval '45 days'),
  ('r-005','R-040','co-maju','Penurunan reputasi akibat keluhan produk','Lonjakan keluhan kualitas produk di media sosial dapat menurunkan kepercayaan merek.','REPUTATIONAL','EXTERNAL','d-prod','u-sari','monitored',false,'quarterly', now() + interval '60 days', now() - interval '45 days'),
  ('r-006','R-051','co-maju','Ketidakpatuhan pengelolaan limbah B3','Penyimpanan limbah B3 melebihi kapasitas izin; berisiko sanksi KLHK.','LEGAL','INTERNAL','d-hse','u-andi','assessed',false,'monthly', now() - interval '1 days', now() - interval '45 days'),
  ('r-007','R-055','co-maju','Ketergantungan pada satu pemasok utama','Konsentrasi pasokan pada satu vendor menambah risiko gangguan rantai pasok.','STRATEGIC','EXTERNAL','d-log','u-rio','identified',true,'quarterly', now() + interval '75 days', now() - interval '45 days'),
  ('r-008','R-061','co-maju','Turnover tenaga kerja terampil tinggi','Tingkat keluar karyawan operator terampil meningkat; menekan produktivitas lini.','STRATEGIC','INTERNAL','d-prod','u-sari','identified',true,'quarterly', now() + interval '80 days', now() - interval '45 days'),
  ('r-009','R-066','co-maju','Sengketa pajak atas restitusi PPN','Perbedaan interpretasi restitusi PPN berpotensi menimbulkan koreksi dan denda.','FINANCIAL','EXTERNAL','d-fin','u-rio','monitored',false,'quarterly', now() + interval '30 days', now() - interval '45 days'),
  ('r-010','R-072','co-maju','Kecelakaan kerja area pengelasan','Potensi cedera operator di area pengelasan karena kelelahan & APD tidak lengkap.','OPERATIONAL','INTERNAL','d-hse','u-andi','treated',false,'monthly', now() + interval '7 days', now() - interval '45 days');

-- Assessments (severity & level ter-generate otomatis)
insert into assessments (id, risk_id, likelihood, impact, kind, note, financial_impact, at, by) values
  ('as-001i','r-001',4,5,'inherent','Mesin berusia >8 tahun, frekuensi gangguan meningkat.',1200000000, now() - interval '30 days','u-sari'),
  ('as-001r','r-001',3,4,'residual','Setelah preventive maintenance terjadwal.',null, now() - interval '30 days','u-sari'),
  ('as-002i','r-002',4,5,'inherent',null,800000000, now() - interval '30 days','u-budi'),
  ('as-003i','r-003',3,4,'inherent',null,null, now() - interval '30 days','u-rio'),
  ('as-004i','r-004',4,3,'inherent',null,450000000, now() - interval '30 days','u-rio'),
  ('as-005i','r-005',2,4,'inherent',null,null, now() - interval '30 days','u-sari'),
  ('as-005r','r-005',2,3,'residual',null,null, now() - interval '30 days','u-sari'),
  ('as-006i','r-006',3,5,'inherent',null,600000000, now() - interval '30 days','u-andi'),
  ('as-007i','r-007',3,4,'inherent',null,null, now() - interval '30 days','AI'),
  ('as-008i','r-008',3,3,'inherent',null,null, now() - interval '30 days','AI'),
  ('as-009i','r-009',2,4,'inherent',null,300000000, now() - interval '30 days','u-rio'),
  ('as-009r','r-009',2,3,'residual',null,null, now() - interval '30 days','u-rio'),
  ('as-010i','r-010',3,5,'inherent',null,null, now() - interval '30 days','u-andi'),
  ('as-010r','r-010',2,4,'residual',null,null, now() - interval '30 days','u-andi');

-- Treatments
insert into treatments (id, risk_id, strategy, description, owner_id, due_date, status, cost, justification, approved, transfer_provider, transfer_premium) values
  ('t-1','r-001','REDUCE','Preventive Maintenance Schedule Update','u-sari', now() + interval '8 days','in_progress',75000000,null,null,null,null),
  ('t-2','r-001','REDUCE','Stockpile Critical Spare Parts','u-rio', now() + interval '14 days','planned',120000000,null,null,null,null),
  ('t-3','r-002','REDUCE','Rollout MFA & SIEM monitoring','u-budi', now() + interval '20 days','in_progress',60000000,null,null,null,null),
  ('t-4','r-004','TRANSFER','Hedging forward contract 6 bulan','u-rio', now() + interval '3 days','done',35000000,null,null,'Bank Mandiri Treasury',35000000),
  ('t-5','r-005','REDUCE','QC gerbang tambahan + survei NPS','u-sari', now() - interval '5 days','done',18000000,null,null,null,null),
  ('t-6','r-009','ACCEPT','Terima risiko dengan pencadangan kontinjensi','u-rio', now() + interval '10 days','planned',0,'Probabilitas rendah, biaya mitigasi > eksposur. Dicadangkan dana kontinjensi.',false,null,null),
  ('t-7','r-010','REDUCE','Pelatihan K3 & audit APD bulanan','u-andi', now() + interval '2 days','in_progress',25000000,null,null,null,null);

-- KRIs
insert into kris (id, risk_id, name, current, threshold, ratio, breached) values
  ('k-1','r-001','Suhu Motor Rata-rata','85°C','< 70°C',0.85,true),
  ('k-2','r-001','MTBF (Mean Time Between Failures)','32 Hari','> 60 Hari',0.4,false),
  ('k-3','r-002','Patch Coverage','78%','> 95%',0.78,true),
  ('k-4','r-005','Tingkat Keluhan / 1000 unit','3,2','< 2,0',0.6,true),
  ('k-5','r-010','Lost Time Injury Rate','1,4','< 1,0',0.7,true);

-- Incidents
insert into incidents (id, company_id, title, description, occurred_at, department_id, type, loss_amount, root_cause, corrective_action, status, approved) values
  ('i-001','co-maju','Overheating motor utama Line 2','Motor utama overheat memicu shutdown otomatis selama 4,5 jam.', now() - interval '20 days','d-prod','LOSS',85000000,'Pelumas degradasi, jadwal maintenance terlambat.','Reschedule PM + penggantian bearing.','investigating',false),
  ('i-002','co-maju','Sensor alignment error','Kesalahan kalibrasi sensor menyebabkan downtime 1,2 jam.', now() - interval '40 days','d-prod','NEAR_MISS',0,'Kalibrasi manual tidak terstandar.','SOP kalibrasi otomatis.','closed',true),
  ('i-003','co-maju','Percobaan phishing ke staf keuangan','Email phishing menargetkan kredensial; tidak ada data bocor.', now() - interval '12 days','d-it','NEAR_MISS',0,'Kesadaran keamanan rendah.','Kampanye awareness + simulasi phishing.','closed',true),
  ('i-004','co-maju','Tumpahan limbah cair area produksi','Tumpahan minor tertangani, namun melebihi ambang pelaporan internal.', now() - interval '8 days','d-hse','LOSS',65000000,'Kontainer penyimpanan retak.','Ganti kontainer + inspeksi mingguan.','open',false);

-- m:n compliance ↔ risk
insert into risk_compliance (risk_id, compliance_id) values
  ('r-001','c-smk3'),('r-001','c-uu1-1970'),
  ('r-002','c-uu27-2022'),('r-002','c-iso27001'),
  ('r-003','c-iso31000'),
  ('r-006','c-pp22-2021'),
  ('r-009','c-pajak'),
  ('r-010','c-smk3'),('r-010','c-uu1-1970');

-- insiden ↔ risiko
insert into incident_risks (incident_id, risk_id) values
  ('i-001','r-001'),('i-002','r-001'),('i-003','r-002'),('i-004','r-006');

-- Catatan: pseudo-user 'AI' di atas hanya untuk integritas FK draft AI; tak punya membership.

-- Audit awal
insert into audit_entries (id, company_id, at, actor, action, entity, detail) values
  ('a-1','co-maju', now() - interval '1 days','Budi Santoso','UPDATE','Risk R-014','Status diubah identified → mitigating'),
  ('a-2','co-maju', now() - interval '1 days','Andi Pratama','CREATE','Incident I-004','Tumpahan limbah cair area produksi dicatat'),
  ('a-3','co-maju', now() - interval '2 days','AI Assistant','SUGGEST','Risk R-055','Kandidat risiko dibuat sebagai draft (menunggu konfirmasi)'),
  ('a-4','co-maju', now() - interval '3 days','Rio Hartono','APPROVE','Treatment R-033','Hedging forward contract disetujui'),
  ('a-5','co-maju', now() - interval '4 days','Sari Wibowo','ASSESS','Risk R-040','Penilaian residual disimpan (2×3 = 6, MEDIUM)'),
  ('a-6','co-maju', now() - interval '6 days','Budi Santoso','INVITE','Membership','Mengundang dewi@majumanufaktur.id sebagai executive');

-- ════════════════════════════════════════════════════════════════════════
-- Perusahaan tambahan → total 5 tenant, semuanya beranggotakan u-budi
-- (muncul di company switcher) + departemen, kepatuhan, risiko & insiden.
-- co-sentosa (sudah ada) diperkaya datanya; 3 perusahaan baru ditambahkan.
-- ════════════════════════════════════════════════════════════════════════

-- Companies baru
insert into companies (id, name, industry_type, employee_count, close_approval_threshold, ai_enabled) values
  ('co-digital', 'PT Digital Nusantara', 'JASA',   60, 50000000, true),
  ('co-bumi',    'PT Bumi Sejahtera',    'DAGANG', 150, 50000000, true),
  ('co-karya',   'PT Karya Abadi',       'JASA',   45, 50000000, true);

-- Membership u-budi (admin + risk_manager) untuk perusahaan baru
insert into memberships (id, company_id, user_id, roles) values
  ('mem-6', 'co-digital', 'u-budi', array['admin','risk_manager']::membership_role[]),
  ('mem-7', 'co-bumi',    'u-budi', array['admin','risk_manager']::membership_role[]),
  ('mem-8', 'co-karya',   'u-budi', array['admin','risk_manager']::membership_role[]);

-- Departemen perusahaan baru
insert into departments (id, company_id, name, description, head_user_id) values
  ('d-dig-ops',   'co-digital', 'Operasional', 'Operasi layanan & dukungan', null),
  ('d-dig-it',    'co-digital', 'Teknologi & Produk', 'Engineering, infrastruktur, keamanan', null),
  ('d-bumi-jual', 'co-bumi',    'Penjualan', 'Penjualan & akun pelanggan', null),
  ('d-bumi-gud',  'co-bumi',    'Gudang & Distribusi', 'Pergudangan & logistik', null),
  ('d-karya-ops', 'co-karya',   'Operasional', 'Operasi proyek & lapangan', null),
  ('d-karya-fin', 'co-karya',   'Keuangan', 'Keuangan & kontrak', null);

-- Kepatuhan (GENERAL + relevan industri)
insert into compliance_requirements (id, company_id, industry_type, regulation_name, description, authority, is_system, status, progress) values
  ('c-sent-iso',  'co-sentosa', 'GENERAL', 'ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', true, 'partial', 60),
  ('c-sent-pdp',  'co-sentosa', 'GENERAL', 'UU No. 27/2022 (PDP)', 'Pelindungan Data Pribadi.', 'Kominfo', true, 'partial', 50),
  ('c-dig-iso',   'co-digital', 'GENERAL', 'ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', true, 'compliant', 100),
  ('c-dig-27001', 'co-digital', 'GENERAL', 'ISO/IEC 27001', 'Keamanan informasi.', 'ISO', true, 'partial', 55),
  ('c-bumi-iso',  'co-bumi',    'GENERAL', 'ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', true, 'partial', 45),
  ('c-bumi-kons', 'co-bumi',    'DAGANG',  'UU No. 8/1999', 'Perlindungan Konsumen.', 'Pemerintah RI', true, 'partial', 60),
  ('c-karya-iso', 'co-karya',   'GENERAL', 'ISO 31000:2018', 'Kerangka & proses manajemen risiko.', 'ISO', true, 'non_compliant', 30),
  ('c-karya-nkr', 'co-karya',   'JASA',    'UU Ketenagakerjaan jo. UU Cipta Kerja', 'Hubungan kerja.', 'Kemnaker', true, 'partial', 50);

-- Risiko (owner u-budi)
insert into risks (id, code, company_id, title, description, category, source, department_id, owner_id, status, ai_suggested, review_frequency, next_review_date, created_at) values
  ('r-101','R-001','co-sentosa','Fluktuasi harga grosir','Volatilitas harga beli grosir menekan margin ritel.','FINANCIAL','EXTERNAL','d2-fin','u-budi','assessed',false,'monthly', now() + interval '15 days', now() - interval '40 days'),
  ('r-102','R-002','co-sentosa','Stok kedaluwarsa di gudang','Perputaran lambat membuat sebagian stok kedaluwarsa sebelum terjual.','OPERATIONAL','INTERNAL','d2-ops','u-budi','identified',false,'quarterly', now() + interval '50 days', now() - interval '40 days'),
  ('r-201','R-001','co-digital','Downtime layanan SaaS','Gangguan infrastruktur menyebabkan layanan tidak tersedia & pelanggaran SLA.','OPERATIONAL','INTERNAL','d-dig-it','u-budi','assessed',false,'monthly', now() + interval '10 days', now() - interval '40 days'),
  ('r-202','R-002','co-digital','Kebocoran data pelanggan','Eksposur data pribadi pelanggan akibat serangan siber.','OPERATIONAL','EXTERNAL','d-dig-it','u-budi','assessed',false,'monthly', now() + interval '20 days', now() - interval '40 days'),
  ('r-301','R-001','co-bumi','Keterlambatan pengiriman','Kendala logistik memperlambat pengiriman ke pelanggan.','OPERATIONAL','INTERNAL','d-bumi-gud','u-budi','identified',false,'quarterly', now() + interval '35 days', now() - interval '40 days'),
  ('r-302','R-002','co-bumi','Piutang tak tertagih','Pelanggan kredit gagal bayar meningkatkan piutang macet.','FINANCIAL','EXTERNAL','d-bumi-jual','u-budi','assessed',false,'monthly', now() + interval '18 days', now() - interval '40 days'),
  ('r-401','R-001','co-karya','Turnover karyawan terampil','Tingkat keluar tenaga ahli menekan kapasitas proyek.','STRATEGIC','INTERNAL','d-karya-ops','u-budi','identified',false,'quarterly', now() + interval '60 days', now() - interval '40 days'),
  ('r-402','R-002','co-karya','Sengketa kontrak klien','Perbedaan interpretasi kontrak berpotensi menimbulkan tuntutan.','LEGAL','EXTERNAL','d-karya-fin','u-budi','assessed',false,'quarterly', now() + interval '25 days', now() - interval '40 days');

-- Penilaian inherent (severity & level ter-generate)
insert into assessments (id, risk_id, likelihood, impact, kind, financial_impact, at, by) values
  ('as-101i','r-101',4,3,'inherent',250000000, now() - interval '20 days','u-budi'),
  ('as-102i','r-102',3,3,'inherent', 80000000, now() - interval '20 days','u-budi'),
  ('as-201i','r-201',4,4,'inherent',300000000, now() - interval '20 days','u-budi'),
  ('as-202i','r-202',3,5,'inherent',500000000, now() - interval '20 days','u-budi'),
  ('as-301i','r-301',3,3,'inherent', 60000000, now() - interval '20 days','u-budi'),
  ('as-302i','r-302',4,4,'inherent',220000000, now() - interval '20 days','u-budi'),
  ('as-401i','r-401',3,3,'inherent', 90000000, now() - interval '20 days','u-budi'),
  ('as-402i','r-402',2,4,'inherent',150000000, now() - interval '20 days','u-budi');

-- Insiden + tautan ke risiko
insert into incidents (id, company_id, title, description, occurred_at, department_id, type, loss_amount, root_cause, corrective_action, status, approved) values
  ('i-101','co-sentosa','Selisih stok opname','Selisih stok gudang melebihi toleransi pada opname bulanan.', now() - interval '15 days','d2-ops','LOSS',30000000,'Pencatatan manual tidak akurat.','Implementasi barcode + audit acak.','open',false),
  ('i-201','co-digital','Outage region cloud','Gangguan region penyedia cloud menyebabkan downtime 2 jam.', now() - interval '10 days','d-dig-it','LOSS',40000000,'Single-region tanpa failover.','Siapkan multi-region failover.','investigating',false),
  ('i-301','co-bumi','Nyaris salah kirim batch','Batch hampir terkirim ke alamat keliru, tertangkap saat verifikasi.', now() - interval '8 days','d-bumi-gud','NEAR_MISS',0,'Label alamat tertukar.','Verifikasi ganda sebelum muat.','closed',true),
  ('i-401','co-karya','Denda keterlambatan proyek','Keterlambatan milestone memicu denda kontrak.', now() - interval '12 days','d-karya-fin','LOSS',20000000,'Estimasi jadwal terlalu optimis.','Revisi metode estimasi + buffer.','open',false);

insert into incident_risks (incident_id, risk_id) values
  ('i-101','r-102'),('i-201','r-201'),('i-301','r-301'),('i-401','r-402');
