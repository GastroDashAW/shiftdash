-- Employee groups table
create table if not exists public.employee_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- GAV rules (one per group)
create table if not exists public.gav_rules (
  id                    uuid primary key default gen_random_uuid(),
  group_id              uuid not null references public.employee_groups(id) on delete cascade,
  weekly_hours          numeric not null default 42,
  max_daily_hours       numeric not null default 11,
  max_weekly_hours      numeric not null default 50,
  vacation_weeks        numeric not null default 5,
  holidays_per_year     int    not null default 6,
  overtime_threshold    numeric,
  night_surcharge_pct   numeric not null default 25,
  sunday_surcharge_pct  numeric not null default 50,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(group_id)
);

-- Add group reference to employees
alter table public.employees
  add column if not exists group_id uuid references public.employee_groups(id) on delete set null;

-- RLS: employee_groups
alter table public.employee_groups enable row level security;

create policy "Admins full access employee_groups"
  on public.employee_groups for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated users read employee_groups"
  on public.employee_groups for select
  using (auth.uid() is not null);

-- RLS: gav_rules
alter table public.gav_rules enable row level security;

create policy "Admins full access gav_rules"
  on public.gav_rules for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated users read gav_rules"
  on public.gav_rules for select
  using (auth.uid() is not null);
