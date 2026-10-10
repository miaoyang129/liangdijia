-- 先在 Authentication → Users → Add user → Create new user 创建并自动确认自己的用户。
-- 复制该用户的 User UID（UUID），仅在 SQL Editor 里替换下面引号内文字再运行。
-- 不需要将填有实际 UID 的脚本提交 GitHub，也不需要把 UID 发给 ChatGPT。
do $$
declare v_uid text := 'REPLACE_WITH_YOUR_AUTH_USER_UUID';
begin
  if v_uid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception '请先把占位文字替换为 Authentication → Users 中的 User UID（不是邮箱）';
  end if;
  if not exists (select 1 from auth.users where id = v_uid::uuid) then
    raise exception '未找到该 Auth 用户，请确认 UID 和项目';
  end if;
  insert into public.ldj_access(user_id) values(v_uid::uuid) on conflict do nothing;
end $$;
select count(*) as authorized_users from public.ldj_access;
-- 个人使用一般只授权 1 个用户。不要给 anon 开权限，不要为解决错误关闭 RLS。
