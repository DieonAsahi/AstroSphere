-- ============================================================================
-- ASTROSPHERE - SUPABASE POSTGRESQL INITIAL SCHEMA MIGRATION
-- Versi: 20261101000000
-- Deskripsi: Skema lengkap 12 entitas relasional dengan RLS, trigger profil,
-- kode kelas aman, aset berjenjang kualitas, dan pelacakan metrik sesi.
-- ============================================================================

-- Ekstensi dasar
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('siswa', 'guru', 'admin');
create type public.celestial_body_type as enum ('star', 'planet', 'dwarf_planet', 'moon');
create type public.poi_type as enum ('gunung', 'badai', 'kawah', 'lembah', 'lainnya');
create type public.asset_type as enum ('tekstur', 'model', 'terrain', 'partikel');
create type public.quality_tier as enum ('rendah', 'sedang', 'tinggi');

-- ----------------------------------------------------------------------------
-- 2. TABEL PROFILES (Menggantikan users + password_hash)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.user_role not null default 'siswa',
  school_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil pengguna yang terhubung dengan akun Supabase Auth';

-- ----------------------------------------------------------------------------
-- 3. TABEL CELESTIAL_BODIES (Benda Langit)
-- ----------------------------------------------------------------------------
create table public.celestial_bodies (
  id text primary key,
  slug text not null unique,
  name text not null,
  type public.celestial_body_type not null,
  parent_id text references public.celestial_bodies(id) on delete set null,
  diameter_km double precision,
  mass_kg double precision,
  rotation_period_h double precision,
  axial_tilt_deg double precision,
  semi_major_axis_au double precision,
  eccentricity double precision,
  inclination_deg double precision,
  orbit_period_days double precision,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.celestial_bodies is 'Katalog benda langit (bintang, planet, bulan) beserta elemen orbit matematis';

-- ----------------------------------------------------------------------------
-- 4. TABEL POINTS_OF_INTEREST (Titik Minat / POI)
-- ----------------------------------------------------------------------------
create table public.points_of_interest (
  id text primary key,
  body_id text not null references public.celestial_bodies(id) on delete cascade,
  slug text not null,
  name text not null,
  type public.poi_type not null,
  lat double precision not null,
  lon double precision not null,
  history_text text not null,
  dimensions jsonb not null default '[]'::jsonb,
  particle_config jsonb,
  sources jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint points_of_interest_body_slug_key unique (body_id, slug)
);

comment on table public.points_of_interest is 'Titik geologi atau atmosferik penting pada permukaan benda langit';

-- ----------------------------------------------------------------------------
-- 5. TABEL ASSETS (Aset 3D, Tekstur, Heightmap, Partikel)
-- ----------------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  body_id text references public.celestial_bodies(id) on delete cascade,
  poi_id text references public.points_of_interest(id) on delete cascade,
  asset_type public.asset_type not null,
  quality_tier public.quality_tier not null default 'sedang',
  file_url text not null,
  file_size_bytes bigint,
  mime_type text,
  license text,
  attribution text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint asset_target_check check (
    (body_id is not null and poi_id is null) or
    (body_id is null and poi_id is not null)
  )
);

comment on table public.assets is 'Aset visual berjenjang kualitas yang menempel pada benda langit atau titik minat';

-- ----------------------------------------------------------------------------
-- 6. TABEL CLASSES (Kelas Guru)
-- ----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  grade_level text not null,
  join_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.classes is 'Ruang kelas yang dibuat oleh guru dengan 6 karakter kode gabung unik';

-- ----------------------------------------------------------------------------
-- 7. TABEL CLASS_MEMBERS (Keanggotaan Siswa di Kelas)
-- ----------------------------------------------------------------------------
create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

comment on table public.class_members is 'Relasi banyak-ke-banyak antara siswa dan kelas yang diikutinya';

-- ----------------------------------------------------------------------------
-- 8. TABEL GUIDED_TOURS (Tur Terpandu Guru)
-- ----------------------------------------------------------------------------
create table public.guided_tours (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guided_tours is 'Alur tur eksplorasi terpandu antar-POI yang disusun oleh guru';

-- ----------------------------------------------------------------------------
-- 9. TABEL TOUR_CLASSES (Distribusi Tur ke Kelas)
-- ----------------------------------------------------------------------------
create table public.tour_classes (
  tour_id uuid not null references public.guided_tours(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tour_id, class_id)
);

comment on table public.tour_classes is 'Pemetaan tur terpandu ke satu atau lebih kelas';

-- ----------------------------------------------------------------------------
-- 10. TABEL TOUR_STEPS (Langkah Perhentian Tur)
-- ----------------------------------------------------------------------------
create table public.tour_steps (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.guided_tours(id) on delete cascade,
  poi_id text not null references public.points_of_interest(id) on delete cascade,
  step_no integer not null,
  narration_text text not null,
  camera_preset jsonb not null,
  duration_s integer not null default 30,
  created_at timestamptz not null default now(),
  constraint tour_steps_tour_step_key unique (tour_id, step_no)
);

comment on table public.tour_steps is 'Rincian perhentian kamera, narasi, dan durasi dalam sebuah tur';

-- ----------------------------------------------------------------------------
-- 11. TABEL USER_PROGRESS (Progres Eksplorasi Siswa)
-- ----------------------------------------------------------------------------
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  poi_id text not null references public.points_of_interest(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  time_spent_sec integer not null default 0,
  constraint user_progress_user_poi_key unique (user_id, poi_id)
);

comment on table public.user_progress is 'Riwayat kunjungan titik minat oleh siswa tanpa duplikasi';

-- ----------------------------------------------------------------------------
-- 12. TABEL QUIZZES, QUIZ_QUESTIONS, QUIZ_ATTEMPTS (Evaluasi Belajar FR-10)
-- ----------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  poi_id text not null references public.points_of_interest(id) on delete cascade,
  title text not null,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_option_id text not null,
  explanation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null,
  max_score integer not null,
  answers jsonb,
  completed_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 13. TABEL SESSION_METRICS (KPI PRD 1.9 & Analitik Performa FR-12)
-- ----------------------------------------------------------------------------
create table public.session_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  duration_sec integer not null,
  pois_opened integer not null default 0,
  avg_fps double precision,
  quality_tier public.quality_tier,
  device_class text,
  created_at timestamptz not null default now()
);

comment on table public.session_metrics is 'Telemetri agregat durasi, FPS rata-rata, dan perangkat tanpa data pribadi berlebih';

-- ============================================================================
-- FUNGSI BANTUAN & GENERATOR
-- ============================================================================

-- Generator kode gabung 6 karakter acak tanpa karakter ambigu (0, O, 1, I)
create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i integer := 0;
  code_exists boolean := true;
begin
  while code_exists loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.classes where join_code = result) into code_exists;
  end loop;
  return result;
end;
$$;

-- Trigger untuk membuat join_code kelas otomatis bila kosong
create or replace function public.trigger_set_class_join_code()
returns trigger
language plpgsql
as $$
begin
  if new.join_code is null or trim(new.join_code) = '' then
    new.join_code := public.generate_join_code();
  else
    new.join_code := upper(trim(new.join_code));
  end if;
  return new;
end;
$$;

create trigger trg_set_class_join_code
  before insert on public.classes
  for each row execute function public.trigger_set_class_join_code();

-- Helper pemeriksaan peran untuk RLS (Security Definer)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_guru()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('guru', 'admin')
  );
$$;

-- Trigger otomatis saat pengguna mendaftar lewat Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, school_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Pengguna AstroSphere'),
    'siswa', -- Selalu paksa peran default 'siswa'; guru/admin diatur lewat verifikasi admin
    new.raw_user_meta_data->>'school_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger pencegah eskalasi peran mandiri
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Hanya admin yang berhak mengubah peran pengguna.';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_role_check
  before update of role on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ============================================================================
-- INDEKS PERFORMA & PENCARIAN
-- ============================================================================

-- Celestial bodies
create index idx_celestial_bodies_slug on public.celestial_bodies (slug);
create index idx_celestial_bodies_parent_id on public.celestial_bodies (parent_id);
create index idx_celestial_bodies_type on public.celestial_bodies (type);
create index idx_celestial_bodies_name on public.celestial_bodies (name);

-- Points of interest
create index idx_points_of_interest_body_id on public.points_of_interest (body_id);
create index idx_points_of_interest_slug on public.points_of_interest (slug);
create index idx_points_of_interest_name on public.points_of_interest (name);

-- Assets
create index idx_assets_body_id on public.assets (body_id);
create index idx_assets_poi_id on public.assets (poi_id);
create index idx_assets_quality on public.assets (quality_tier);

-- Classes & members
create index idx_classes_teacher_id on public.classes (teacher_id);
create index idx_classes_join_code on public.classes (join_code);
create index idx_class_members_student_id on public.class_members (student_id);

-- Tours
create index idx_guided_tours_created_by on public.guided_tours (created_by);
create index idx_tour_classes_class_id on public.tour_classes (class_id);
create index idx_tour_steps_tour_id on public.tour_steps (tour_id);
create index idx_tour_steps_poi_id on public.tour_steps (poi_id);

-- User progress & quizzes
create index idx_user_progress_user_id on public.user_progress (user_id);
create index idx_user_progress_poi_id on public.user_progress (poi_id);
create index idx_quizzes_poi_id on public.quizzes (poi_id);
create index idx_quiz_questions_quiz_id on public.quiz_questions (quiz_id);
create index idx_quiz_attempts_quiz_id on public.quiz_attempts (quiz_id);
create index idx_quiz_attempts_user_id on public.quiz_attempts (user_id);
create index idx_session_metrics_user_id on public.session_metrics (user_id);

-- ============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.celestial_bodies enable row level security;
alter table public.points_of_interest enable row level security;
alter table public.assets enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.guided_tours enable row level security;
alter table public.tour_classes enable row level security;
alter table public.tour_steps enable row level security;
alter table public.user_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.session_metrics enable row level security;

-- 1. PROFILES
create policy "Pengguna dapat melihat profil sendiri"
  on public.profiles for select
  using (
    id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.class_members cm
      join public.classes c on cm.class_id = c.id
      where cm.student_id = profiles.id and c.teacher_id = auth.uid()
    )
  );

create policy "Pengguna dapat memperbarui nama & sekolah sendiri"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- 2. CELESTIAL_BODIES
create policy "Publik dapat membaca benda langit yang dipublikasikan"
  on public.celestial_bodies for select
  using (is_published = true or public.is_admin());

create policy "Hanya admin yang dapat mengelola benda langit"
  on public.celestial_bodies for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. POINTS_OF_INTEREST
create policy "Publik dapat membaca POI yang dipublikasikan"
  on public.points_of_interest for select
  using (is_published = true or public.is_admin());

create policy "Hanya admin yang dapat mengelola POI"
  on public.points_of_interest for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4. ASSETS
create policy "Publik dapat melihat aset dari benda langit/POI publik"
  on public.assets for select
  using (
    public.is_admin() or
    exists (
      select 1 from public.celestial_bodies cb
      where cb.id = assets.body_id and cb.is_published = true
    ) or
    exists (
      select 1 from public.points_of_interest poi
      where poi.id = assets.poi_id and poi.is_published = true
    )
  );

create policy "Hanya admin yang dapat mengelola aset"
  on public.assets for all
  using (public.is_admin())
  with check (public.is_admin());

-- 5. CLASSES
create policy "Guru pemilik, siswa anggota, atau admin dapat melihat kelas"
  on public.classes for select
  using (
    teacher_id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.class_members cm
      where cm.class_id = classes.id and cm.student_id = auth.uid()
    )
  );

create policy "Guru atau admin dapat membuat kelas"
  on public.classes for insert
  with check (teacher_id = auth.uid() and (public.is_guru() or public.is_admin()));

create policy "Guru pemilik atau admin dapat memperbarui kelas"
  on public.classes for update
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy "Guru pemilik atau admin dapat menghapus kelas"
  on public.classes for delete
  using (teacher_id = auth.uid() or public.is_admin());

-- 6. CLASS_MEMBERS
create policy "Siswa, guru kelas, atau admin dapat melihat keanggotaan kelas"
  on public.class_members for select
  using (
    student_id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id and c.teacher_id = auth.uid()
    )
  );

create policy "Siswa dapat bergabung ke kelas"
  on public.class_members for insert
  with check (student_id = auth.uid() or public.is_admin());

create policy "Siswa dapat keluar atau guru menghapus siswa dari kelas"
  on public.class_members for delete
  using (
    student_id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id and c.teacher_id = auth.uid()
    )
  );

-- 7. GUIDED_TOURS
create policy "Guru pembuat, siswa kelas terkait, atau admin dapat melihat tur"
  on public.guided_tours for select
  using (
    created_by = auth.uid() or
    public.is_admin() or
    (
      is_published = true and
      exists (
        select 1 from public.tour_classes tc
        join public.class_members cm on tc.class_id = cm.class_id
        where tc.tour_id = guided_tours.id and cm.student_id = auth.uid()
      )
    )
  );

create policy "Guru atau admin dapat membuat tur"
  on public.guided_tours for insert
  with check (created_by = auth.uid() and (public.is_guru() or public.is_admin()));

create policy "Guru pembuat atau admin dapat memperbarui tur"
  on public.guided_tours for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "Guru pembuat atau admin dapat menghapus tur"
  on public.guided_tours for delete
  using (created_by = auth.uid() or public.is_admin());

-- 8. TOUR_CLASSES
create policy "Pengguna yang berhak melihat tur/kelas dapat melihat relasi tour_classes"
  on public.tour_classes for select
  using (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_classes.tour_id and gt.created_by = auth.uid()
    ) or
    exists (
      select 1 from public.class_members cm
      where cm.class_id = tour_classes.class_id and cm.student_id = auth.uid()
    )
  );

create policy "Guru pembuat tur atau admin dapat menghubungkan tur ke kelas"
  on public.tour_classes for insert
  with check (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_classes.tour_id and gt.created_by = auth.uid()
    )
  );

create policy "Guru pembuat tur atau admin dapat melepas tautan tur ke kelas"
  on public.tour_classes for delete
  using (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_classes.tour_id and gt.created_by = auth.uid()
    )
  );

-- 9. TOUR_STEPS
create policy "Pengguna dapat melihat langkah tur yang berhak diakses"
  on public.tour_steps for select
  using (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_steps.tour_id and (
        gt.created_by = auth.uid() or
        (
          gt.is_published = true and
          exists (
            select 1 from public.tour_classes tc
            join public.class_members cm on tc.class_id = cm.class_id
            where tc.tour_id = gt.id and cm.student_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Guru pembuat tur atau admin dapat mengelola langkah tur"
  on public.tour_steps for all
  using (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_steps.tour_id and gt.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin() or
    exists (
      select 1 from public.guided_tours gt
      where gt.id = tour_steps.tour_id and gt.created_by = auth.uid()
    )
  );

-- 10. USER_PROGRESS
create policy "Siswa melihat progres sendiri, guru melihat progres siswa kelasnya"
  on public.user_progress for select
  using (
    user_id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.class_members cm
      join public.classes c on cm.class_id = c.id
      where cm.student_id = user_progress.user_id and c.teacher_id = auth.uid()
    )
  );

create policy "Siswa dapat mencatat atau memperbarui progres sendiri"
  on public.user_progress for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "Siswa dapat memperbarui waktu progres sendiri"
  on public.user_progress for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- 11. QUIZZES, QUESTIONS, ATTEMPTS
create policy "Publik/siswa dapat membaca kuis yang dipublikasikan"
  on public.quizzes for select
  using (is_published = true or public.is_guru() or public.is_admin());

create policy "Guru atau admin dapat mengelola kuis"
  on public.quizzes for all
  using (public.is_guru() or public.is_admin())
  with check (public.is_guru() or public.is_admin());

create policy "Pengguna dapat membaca soal dari kuis yang dipublikasikan"
  on public.quiz_questions for select
  using (
    public.is_guru() or
    public.is_admin() or
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.is_published = true
    )
  );

create policy "Guru atau admin dapat mengelola soal kuis"
  on public.quiz_questions for all
  using (public.is_guru() or public.is_admin())
  with check (public.is_guru() or public.is_admin());

create policy "Siswa melihat percobaan kuis sendiri, guru melihat nilai kelasnya"
  on public.quiz_attempts for select
  using (
    user_id = auth.uid() or
    public.is_admin() or
    exists (
      select 1 from public.class_members cm
      join public.classes c on cm.class_id = c.id
      where cm.student_id = quiz_attempts.user_id and c.teacher_id = auth.uid()
    )
  );

create policy "Siswa dapat mengirimkan percobaan kuis"
  on public.quiz_attempts for insert
  with check (user_id = auth.uid() or public.is_admin());

-- 12. SESSION_METRICS
create policy "Pengguna dapat mencatat metrik sesi anonim atau terotentikasi"
  on public.session_metrics for insert
  with check (user_id is null or user_id = auth.uid());

create policy "Pengguna melihat metrik sendiri atau admin melihat seluruh metrik"
  on public.session_metrics for select
  using (user_id = auth.uid() or public.is_admin());

