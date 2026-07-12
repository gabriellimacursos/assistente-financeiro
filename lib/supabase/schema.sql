-- =====================================================
-- CONTROLE FINANCEIRO — Schema Supabase
-- Execute no SQL Editor do Supabase após criar o projeto
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- PROFILES (perfis de usuários dentro do sistema)
-- =====================================================
create table profiles (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  initials     text not null,
  color        text not null,
  pin          text,
  is_owner     boolean default false,
  profile_type text check (profile_type in ('entrepreneur', 'employee', 'freelancer', 'investor', 'other')),
  income_sources text[],
  typical_expenses text[],
  preferred_mode text check (preferred_mode in ('personal', 'business', 'both')),
  created_at   timestamptz default now()
);

-- =====================================================
-- TRANSACTIONS
-- =====================================================
create table transactions (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  profile_id   text references profiles(id) on delete set null,
  profile_name text,
  type         text check (type in ('income', 'expense')) not null,
  mode         text check (mode in ('personal', 'business')) not null,
  amount       numeric(12, 2) not null,
  category     text not null,
  subcategory  text,
  description  text not null,
  original_text text,
  date         timestamptz not null default now(),
  payment_method text,
  card_id      text,
  is_recurring boolean default false,
  recurrence_id uuid,
  status       text check (status in ('confirmed', 'pending', 'cancelled')) default 'confirmed',
  created_at   timestamptz default now()
);

-- =====================================================
-- RECURRENCES
-- =====================================================
create table recurrences (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  type         text check (type in ('income', 'expense')) not null,
  mode         text check (mode in ('personal', 'business')) not null,
  amount       numeric(12, 2) not null,
  category     text not null,
  frequency    text check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom')) not null,
  next_date    date not null,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- =====================================================
-- CATEGORIES (personalizadas por usuário)
-- =====================================================
create table categories (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  name         text not null,
  mode         text check (mode in ('personal', 'business', 'both')) default 'both',
  direction    text check (direction in ('income', 'expense', 'both')) default 'both',
  created_at   timestamptz default now()
);

-- =====================================================
-- CREDIT CARDS
-- =====================================================
create table credit_cards (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  last_digits  text,
  mode         text check (mode in ('personal', 'business')) not null,
  color        text not null,
  card_limit   numeric(12, 2),
  closing_day  int check (closing_day between 1 and 31),
  due_day      int check (due_day between 1 and 31),
  active       boolean default true,
  created_at   timestamptz default now()
);

-- =====================================================
-- AI INTERPRETATIONS (log para melhorar a IA)
-- =====================================================
create table ai_interpretations (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  original_text text not null,
  interpreted  jsonb not null,
  confirmed    boolean default false,
  created_at   timestamptz default now()
);

-- =====================================================
-- SYSTEM SETTINGS (PIN do sistema, etc.)
-- =====================================================
create table system_settings (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  system_pin   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- =====================================================
-- BUDGETS (orçamentos mensais por categoria)
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

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table recurrences enable row level security;
alter table categories enable row level security;
alter table credit_cards enable row level security;
alter table ai_interpretations enable row level security;
alter table system_settings enable row level security;

-- Políticas: usuário só vê seus próprios dados
create policy "users_own_profiles" on profiles
  for all using (auth.uid() = user_id);

create policy "users_own_transactions" on transactions
  for all using (auth.uid() = user_id);

create policy "users_own_recurrences" on recurrences
  for all using (auth.uid() = user_id);

create policy "users_own_categories" on categories
  for all using (auth.uid() = user_id);

create policy "users_own_cards" on credit_cards
  for all using (auth.uid() = user_id);

create policy "users_own_ai_logs" on ai_interpretations
  for all using (auth.uid() = user_id);

create policy "users_own_settings" on system_settings
  for all using (auth.uid() = user_id);

alter table budgets enable row level security;
create policy "users_own_budgets" on budgets
  for all using (auth.uid() = user_id);

-- =====================================================
-- INDEXES (performance)
-- =====================================================
create index idx_transactions_user_date on transactions(user_id, date desc);
create index idx_transactions_mode on transactions(user_id, mode);
create index idx_transactions_profile on transactions(user_id, profile_id);
create index idx_recurrences_user on recurrences(user_id, active);
create index idx_profiles_user on profiles(user_id);
create index idx_categories_user on categories(user_id);
