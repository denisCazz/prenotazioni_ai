-- Add routing and intervention detail fields to bookings
alter table public.bookings
  add column if not exists service_address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists urgency_level text check (urgency_level in ('urgent', 'planned')),
  add column if not exists stove_brand text,
  add column if not exists stove_model text,
  add column if not exists issue_description text,
  add column if not exists customer_status text check (customer_status in ('new', 'existing'));

-- Add geocoordinates to businesses (for routing start-of-day origin)
alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Index for routing queries (fetch bookings with coordinates for a given day)
create index if not exists idx_bookings_routing on public.bookings(business_id, date, start_time)
  where latitude is not null and longitude is not null;
