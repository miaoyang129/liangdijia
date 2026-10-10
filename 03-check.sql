-- 管理员部署自检：在 Supabase SQL Editor 运行。所有 ok 应为 true。
-- 这不是实际的跨用户登录测试，后者仍需按 DEPLOY.html 执行。
select 'access_RLS_enabled' as check_name,
  (select relrowsecurity from pg_class where oid='public.ldj_access'::regclass) as ok
union all select 'workspace_RLS_enabled',
  (select relrowsecurity from pg_class where oid='public.ldj_workspaces'::regclass)
union all select 'anon_cannot_read_workspace',
  not has_table_privilege('anon','public.ldj_workspaces','SELECT')
union all select 'anon_cannot_write_workspace',
  not has_table_privilege('anon','public.ldj_workspaces','INSERT,UPDATE,DELETE')
union all select 'anonymous_cannot_call_save',
  not has_function_privilege('anon','public.ldj_save_workspace(jsonb,bigint,uuid)','EXECUTE')
union all select 'authenticated_cannot_grant_access',
  not has_table_privilege('authenticated','public.ldj_access','INSERT,UPDATE,DELETE')
union all select 'authenticated_cannot_delete_workspace_row',
  not has_table_privilege('authenticated','public.ldj_workspaces','DELETE')
union all select 'save_uses_invoker_not_definer',
  not (select prosecdef from pg_proc where oid='public.ldj_save_workspace(jsonb,bigint,uuid)'::regprocedure)
union all select 'one_authorized_personal_user', (select count(*)=1 from public.ldj_access)
union all select 'four_expected_policies',
  (select count(*)=4 from pg_policies where schemaname='public' and tablename in ('ldj_access','ldj_workspaces'));
