
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "users manage their own profile"
on profiles for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


drop policy if exists "anyone can insert a booking" on bookings;
drop policy if exists "anyone can read confirmed bookings" on bookings;
drop policy if exists "anyone can cancel via dashboard" on bookings;


alter table bookings add column user_id uuid references auth.users(id);


create policy "anyone can view bookings"
on bookings for select
using (true);

create policy "logged in users can book for themselves"
on bookings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can cancel their own booking"
on bookings for delete
to authenticated
using (auth.uid() = user_id);


create table if not exists app_settings (
  key text primary key,
  value text not null
);

alter table app_settings enable row level security;

create policy "anyone can view and update app_settings"
on app_settings for all
using (true)
with check (true);
