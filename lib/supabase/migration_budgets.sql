-- =====================================================
-- MIGRAÇÃO: Adicionar tabela budgets
-- Execute no SQL Editor do Supabase (projeto wytkifsspsstwwiydgin)
-- =====================================================

create table if not exists budgets (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  category      text not null,
  mode          text check (mode in ('personal', 'business')) not null,
  monthly_limit numeric(12, 2) not null,
  created_at    timestamptz default now(),
  unique(user_id, category, mode)
);

alter table budgets enable row level security;

create policy "users_own_budgets" on budgets
  for all using (auth.uid() = user_id);

create index if not exists idx_budgets_user on budgets(user_id);
