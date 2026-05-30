-- Question Inbox: audience questions become content
create table if not exists question_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  source text not null default 'other',
  -- source: tiktok_comment | youtube_comment | whatsapp | coaching | faq | other
  created_at timestamptz default now() not null,
  converted boolean default false not null,
  idea_id uuid references content_ideas(id) on delete set null
);

alter table question_inbox enable row level security;

create policy "Users manage their own questions"
  on question_inbox for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index question_inbox_user_idx on question_inbox(user_id, created_at desc);
