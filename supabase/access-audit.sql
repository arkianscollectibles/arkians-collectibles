-- Read-only checks: no customer records, account emails or credentials.
-- Run in the existing project's SQL Editor before changing permissions.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('cart', 'wishlist', 'orders', 'order_items', 'withdrawal_requests')
order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('cart', 'wishlist', 'orders', 'order_items', 'withdrawal_requests')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('cart', 'wishlist', 'orders', 'order_items', 'withdrawal_requests')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
