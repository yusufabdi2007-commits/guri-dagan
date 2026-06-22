-- Program Knowledge Base
-- Stores extracted text from uploaded curriculum PDFs per program.
-- Used to inject curriculum context into AI script generation.

create table if not exists program_knowledge (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  program_name text not null,
  file_name text not null,
  extracted_text text not null,
  char_count integer not null default 0,
  indexed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, program_name)
);

-- Row-level security
alter table program_knowledge enable row level security;

-- Owner can read, insert, update, delete their own entries
create policy "Users manage own program knowledge"
  on program_knowledge for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow anon/service role reads so the edge batch-plan API can inject curriculum
-- without requiring user auth on that route.
create policy "Public read program knowledge"
  on program_knowledge for select
  using (true);
