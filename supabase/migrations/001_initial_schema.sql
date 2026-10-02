-- CommitCoach initial schema
-- Habits, daily check-ins with miss reflections, pattern insights and
-- the coaching suggestions that let a commitment shrink without being quit.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, created by trigger on sign up
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  display_name text,
  timezone text not null default 'Asia/Singapore',
  plan text not null default 'free' check (plan in ('free', 'pro')),
  reminder_enabled boolean not null default false,
  reminder_hour smallint not null default 20 check (reminder_hour between 0 and 23),
  last_reminded_on date
);

-- ---------------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------------
create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  category text check (category in ('health', 'productivity', 'learning', 'mindfulness', 'social', 'finance', 'other')),
  target_frequency text not null default 'daily' check (target_frequency in ('daily', 'weekdays', 'weekly', 'custom')),
  custom_days text[],                      -- ['mon','wed','fri'] if custom
  weekly_target smallint check (weekly_target between 1 and 7), -- times per week if weekly
  current_streak integer default 0,
  longest_streak integer default 0,
  is_active boolean default true,
  -- Adaptive difficulty
  original_commitment text,               -- what they first committed to
  current_commitment text,                -- may be adjusted lower over time
  adjustment_history jsonb default '[]',  -- [{ date, from, to, reason }]
  constraint custom_days_valid check (
    target_frequency <> 'custom'
    or (custom_days is not null and array_length(custom_days, 1) between 1 and 7
        and custom_days <@ array['mon','tue','wed','thu','fri','sat','sun'])
  ),
  constraint weekly_target_valid check (target_frequency <> 'weekly' or weekly_target is not null)
);

-- ---------------------------------------------------------------------------
-- Check-ins
-- ---------------------------------------------------------------------------
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  completed boolean not null,
  logged_at timestamptz default now(),
  -- Miss reflection (only if completed = false)
  miss_reason text check (char_length(miss_reason) <= 500),
  context_tags text[],                    -- ['busy', 'tired', 'forgot', 'unmotivated', 'travel', 'sick', 'other']
  ai_reflection text,
  ai_suggestion text,
  unique(habit_id, checkin_date)
);

-- ---------------------------------------------------------------------------
-- Cross-habit pattern analysis, one row per generation
-- ---------------------------------------------------------------------------
create table pattern_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz default now(),
  based_on_checkins integer,
  patterns jsonb not null,                -- [{ habit_name, pattern_description, trigger, recommendation }]
  cross_habit_insight text
);

-- ---------------------------------------------------------------------------
-- Adjustment suggestions: Claude proposes, the user accepts or keeps as is
-- ---------------------------------------------------------------------------
create table adjustment_suggestions (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  should_adjust boolean not null,
  reason text not null,
  suggested_commitment text,
  suggested_frequency text check (suggested_frequency in ('daily', 'weekdays', 'weekly', 'custom')),
  suggested_custom_days text[],
  suggested_weekly_target smallint check (suggested_weekly_target between 1 and 7)
);

-- ---------------------------------------------------------------------------
-- Web Push subscriptions, one per device
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- Indexes
create index idx_habits_user on habits(user_id, is_active);
create index idx_checkins_habit on checkins(habit_id, checkin_date desc);
create index idx_checkins_user_date on checkins(user_id, checkin_date desc);
create index idx_patterns_user on pattern_insights(user_id, generated_at desc);
create index idx_suggestions_habit on adjustment_suggestions(habit_id, created_at desc);
create index idx_push_user on push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger habits_updated_at before update on habits
  for each row execute function set_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- A check-in must belong to a habit owned by the same user
create or replace function checkin_owner_matches() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'habit does not belong to this user';
  end if;
  return new;
end;
$$;

create trigger checkins_owner before insert or update on checkins
  for each row execute function checkin_owner_matches();

-- Users cannot upgrade themselves by writing to their own profile
create or replace function protect_plan() returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(), '') <> 'service_role' then
    new.plan = old.plan;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_plan before update on profiles
  for each row execute function protect_plan();

-- Profile row on sign up
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table habits enable row level security;
alter table checkins enable row level security;
alter table pattern_insights enable row level security;
alter table adjustment_suggestions enable row level security;
alter table push_subscriptions enable row level security;

create policy "own_profile_select" on profiles for select using (auth.uid() = id);
create policy "own_profile_update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_habits" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_checkins" on checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_patterns" on pattern_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_suggestions" on adjustment_suggestions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_push" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
