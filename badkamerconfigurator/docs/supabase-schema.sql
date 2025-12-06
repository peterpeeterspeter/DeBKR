-- Catalogus
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  product_id text unique not null,
  name text not null,
  category text not null,
  style_tags text[] default '{}',
  color text,
  finish text,
  material text,
  dimensions_json jsonb,
  price_eur numeric,
  unit_type text default 'per_unit', -- per_unit | per_m2
  image_path text, -- storage path in bucket catalog-images
  installation_notes text,
  created_at timestamptz default now()
);

-- Projecten
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  status text default 'draft',
  region text default 'vlaanderen',
  created_at timestamptz default now()
);

-- States
create table if not exists public.before_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.after_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  data jsonb not null,
  user_approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.work_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.pricing_generated (
  id uuid primary key default gen_random_uuid(),
  region text default 'vlaanderen',
  data jsonb not null,
  created_at timestamptz default now()
);

-- Images metadata (before/after/variant)
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  type text not null, -- before|after|variant
  seed text,
  prompt text,
  path text not null, -- storage path
  created_at timestamptz default now()
);

-- Approvals (user/admin)
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid,
  role text default 'user', -- user|admin
  status text default 'pending', -- pending|approved|rejected
  created_at timestamptz default now()
);

-- Storage buckets (create via Supabase UI/CLI)
-- bucket: catalog-images (product key images)
-- bucket: project-images (before/after/variants per project)


