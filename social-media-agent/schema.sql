-- Run this in Supabase SQL Editor to create the posts table
-- Go to: your-project.supabase.co → SQL Editor → New Query → Paste this → Run

create table posts (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  brief text,
  status text default 'pending',
  linkedin_text text,
  facebook_text text,
  pinterest_text text,
  linkedin_image_url text,
  facebook_image_url text,
  pinterest_image_url text,
  linkedin_approved boolean default false,
  facebook_approved boolean default false,
  pinterest_approved boolean default false,
  created_at timestamp with time zone default now()
);

-- Optional: Create an index for faster date lookups
create index posts_date_idx on posts(date);

-- Verify table was created
select * from posts limit 5;
