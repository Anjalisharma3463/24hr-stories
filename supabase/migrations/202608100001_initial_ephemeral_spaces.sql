create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  privacy text not null check (privacy in ('private', 'public')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  media_url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  viewed boolean not null default false
);

create index if not exists spaces_owner_id_idx on public.spaces (owner_id);
create index if not exists space_members_user_id_idx on public.space_members (user_id);
create index if not exists space_members_space_id_idx on public.space_members (space_id);
create index if not exists stories_space_id_created_at_idx on public.stories (space_id, created_at desc);
create index if not exists stories_user_id_idx on public.stories (user_id);

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.stories enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are insertable by the owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by the owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Spaces are readable by members"
  on public.spaces
  for select
  using (
    exists (
      select 1
      from public.space_members
      where space_members.space_id = spaces.id
        and space_members.user_id = auth.uid()
    )
  );

create policy "Spaces are insertable by authenticated users"
  on public.spaces
  for insert
  with check (auth.uid() = owner_id);

create policy "Spaces are updatable by the owner"
  on public.spaces
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Spaces are deletable by the owner"
  on public.spaces
  for delete
  using (auth.uid() = owner_id);

create policy "Memberships are readable by space members"
  on public.space_members
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.spaces
      where spaces.id = space_members.space_id
        and spaces.owner_id = auth.uid()
    )
  );

create policy "Memberships are insertable by the signed-in user"
  on public.space_members
  for insert
  with check (auth.uid() = user_id);

create policy "Memberships are updatable by the signed-in user"
  on public.space_members
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Memberships are deletable by the signed-in user"
  on public.space_members
  for delete
  using (auth.uid() = user_id);

create policy "Stories are readable by members"
  on public.stories
  for select
  using (
    exists (
      select 1
      from public.space_members
      where space_members.space_id = stories.space_id
        and space_members.user_id = auth.uid()
    )
  );

create policy "Stories are insertable by the story owner"
  on public.stories
  for insert
  with check (auth.uid() = user_id);

create policy "Stories are updatable by the story owner"
  on public.stories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Stories are deletable by the story owner"
  on public.stories
  for delete
  using (auth.uid() = user_id);

create or replace function public.join_space_with_invite_code(p_invite_code text)
returns public.spaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space public.spaces;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into v_space
  from public.spaces
  where invite_code = upper(trim(p_invite_code))
  limit 1;

  if not found then
    raise exception 'Invalid invite code.';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_space.id, v_user_id, 'member')
  on conflict (space_id, user_id)
  do nothing;

  return v_space;
end;
$$;

grant execute on function public.join_space_with_invite_code(text) to authenticated;