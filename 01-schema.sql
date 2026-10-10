-- 两地价 v0.2 / 在你自己的 Supabase 项目 SQL Editor 中运行整份脚本。
-- 可重复运行；不删除已有商品。不要关闭 RLS，不要上传数据库管理密钥。
begin;

create table if not exists public.ldj_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.ldj_workspaces (
  owner_id uuid primary key references public.ldj_access(user_id) on delete cascade,
  payload jsonb not null,
  version bigint not null check (version >= 1),
  last_mutation_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint ldj_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint ldj_payload_size check (octet_length(payload::text) <= 2500000)
);

alter table public.ldj_access enable row level security;
alter table public.ldj_workspaces enable row level security;
revoke all on table public.ldj_access from public, anon, authenticated;
revoke all on table public.ldj_workspaces from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.ldj_access to authenticated;
grant select, insert, update on table public.ldj_workspaces to authenticated;

-- 访问名单只能由项目管理员在 SQL Editor 添加。用户自己不能添加/更换授权。
drop policy if exists ldj_read_own_access on public.ldj_access;
create policy ldj_read_own_access on public.ldj_access for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists ldj_read_own_workspace on public.ldj_workspaces;
drop policy if exists ldj_insert_own_workspace on public.ldj_workspaces;
drop policy if exists ldj_update_own_workspace on public.ldj_workspaces;
create policy ldj_read_own_workspace on public.ldj_workspaces for select to authenticated
  using (owner_id = (select auth.uid()) and exists
    (select 1 from public.ldj_access a where a.user_id = (select auth.uid())));
create policy ldj_insert_own_workspace on public.ldj_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists
    (select 1 from public.ldj_access a where a.user_id = (select auth.uid())));
create policy ldj_update_own_workspace on public.ldj_workspaces for update to authenticated
  using (owner_id = (select auth.uid()) and exists
    (select 1 from public.ldj_access a where a.user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists
    (select 1 from public.ldj_access a where a.user_id = (select auth.uid())));

-- 原子版本检查：不同设备保存同一旧版本时，第二次保存明确报冲突。
-- mutation ID 使网络超时后的同一次重试不会产生重复版本。
create or replace function public.ldj_save_workspace(
  p_payload jsonb, p_expected_version bigint, p_mutation_id uuid
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.ldj_workspaces%rowtype;
begin
  if v_uid is null or not exists (select 1 from public.ldj_access a where a.user_id = v_uid) then
    raise exception using errcode = '42501', message = 'Account is not authorized for LiangDiJia';
  end if;
  if p_expected_version is null or p_expected_version < 0 or p_mutation_id is null then
    raise exception using errcode = '22023', message = 'Invalid version or mutation ID';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
     or p_payload->>'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_payload->'settings') is distinct from 'object'
     or jsonb_typeof(p_payload->'products') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Unsupported backup format';
  end if;
  if jsonb_array_length(p_payload->'products') > 3000 or octet_length(p_payload::text) > 2500000 then
    raise exception using errcode = '22023', message = 'Workspace is too large';
  end if;

  select * into v_row from public.ldj_workspaces where owner_id = v_uid for update;
  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = '40001', message = 'Workspace changed or was removed';
    end if;
    insert into public.ldj_workspaces(owner_id,payload,version,last_mutation_id)
      values(v_uid,p_payload,1,p_mutation_id)
      on conflict(owner_id) do nothing;
    select * into v_row from public.ldj_workspaces where owner_id = v_uid for update;
  end if;

  if v_row.last_mutation_id = p_mutation_id then
    if v_row.payload is distinct from p_payload then
      raise exception using errcode = '22023', message = 'Mutation ID reused with a different payload';
    end if;
    return jsonb_build_object('payload',v_row.payload,'version',v_row.version,
      'last_mutation_id',v_row.last_mutation_id,'updated_at',v_row.updated_at);
  end if;
  if v_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Conflict: remote version is newer';
  end if;
  update public.ldj_workspaces set payload=p_payload, version=version+1,
    last_mutation_id=p_mutation_id, updated_at=clock_timestamp()
    where owner_id=v_uid returning * into v_row;
  return jsonb_build_object('payload',v_row.payload,'version',v_row.version,
    'last_mutation_id',v_row.last_mutation_id,'updated_at',v_row.updated_at);
end;
$$;
revoke all on function public.ldj_save_workspace(jsonb,bigint,uuid) from public, anon, authenticated;
grant execute on function public.ldj_save_workspace(jsonb,bigint,uuid) to authenticated;
comment on table public.ldj_workspaces is 'Private, per-user shopping workspace. Do not disable RLS.';
notify pgrst, 'reload schema';
commit;
