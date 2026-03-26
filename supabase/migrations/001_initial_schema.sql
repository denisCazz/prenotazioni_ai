-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Businesses table
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'generico',
  phone_number text,
  vapi_assistant_id text,
  address text,
  settings jsonb default '{}',
  system_prompt text,
  created_at timestamptz default now()
);

-- Services table
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 30,
  description text,
  max_concurrent int not null default 1,
  active boolean not null default true
);

-- Availability slots
create table public.availability_slots (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  constraint valid_time_range check (end_time > start_time)
);

-- Availability exceptions
create table public.availability_exceptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  is_closed boolean not null default true,
  start_time time,
  end_time time,
  reason text
);

-- Bookings table
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  source text not null default 'manual' check (source in ('phone_ai', 'dashboard', 'manual')),
  call_id text,
  created_at timestamptz default now()
);

-- Call logs table
create table public.call_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vapi_call_id text not null unique,
  caller_phone text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  summary text,
  outcome text check (outcome in ('booking_created', 'booking_cancelled', 'booking_modified', 'info_request', 'failed', 'abandoned')),
  recording_url text,
  cost decimal(10,4)
);

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner', 'staff'))
);

-- Indexes
create index idx_bookings_business_date on public.bookings(business_id, date);
create index idx_bookings_customer_phone on public.bookings(customer_phone);
create index idx_bookings_status on public.bookings(status);
create index idx_call_logs_business on public.call_logs(business_id);
create index idx_call_logs_vapi_id on public.call_logs(vapi_call_id);
create index idx_services_business on public.services(business_id);
create index idx_availability_slots_business on public.availability_slots(business_id);
create index idx_availability_exceptions_business_date on public.availability_exceptions(business_id, date);

-- RLS Policies
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability_slots enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.call_logs enable row level security;
alter table public.profiles enable row level security;

-- Profiles: users can read their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Businesses: accessible by members
create policy "Business members can view" on public.businesses for select using (
  id in (select business_id from public.profiles where profiles.id = auth.uid())
);
create policy "Business owners can update" on public.businesses for update using (
  id in (select business_id from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')
);

-- Services: accessible by business members
create policy "Business members can view services" on public.services for select using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);
create policy "Business owners can manage services" on public.services for all using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')
);

-- Availability slots: accessible by business members
create policy "Business members can view availability" on public.availability_slots for select using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);
create policy "Business owners can manage availability" on public.availability_slots for all using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')
);

-- Availability exceptions: accessible by business members
create policy "Business members can view exceptions" on public.availability_exceptions for select using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);
create policy "Business owners can manage exceptions" on public.availability_exceptions for all using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid() and profiles.role = 'owner')
);

-- Bookings: accessible by business members
create policy "Business members can view bookings" on public.bookings for select using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);
create policy "Business members can manage bookings" on public.bookings for all using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);

-- Call logs: accessible by business members
create policy "Business members can view call logs" on public.call_logs for select using (
  business_id in (select business_id from public.profiles where profiles.id = auth.uid())
);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, business_id, full_name, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'business_id')::uuid, null),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
