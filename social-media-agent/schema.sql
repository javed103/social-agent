create table posts (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  brief text,
  status text default 'pending',
  pinterest_text text,
  pinterest_image_url text,
  pinterest_image_local text,
  pinterest_approved boolean default false,
  created_at timestamp with time zone default now()
);
create index posts_date_idx on posts(date);
