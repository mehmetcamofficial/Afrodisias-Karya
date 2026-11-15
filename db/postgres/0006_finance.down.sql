-- Rollback for 0006 (drops only what 0006 added). Take a branch snapshot first:
-- finance rows are destroyed by this script. Accountant users are removed so the
-- previous role CHECK can be restored.
DROP TABLE IF EXISTS product_cost_components;
DROP TRIGGER IF EXISTS finance_entries_immutable ON finance_entries;
DROP TABLE IF EXISTS finance_entries;
DROP FUNCTION IF EXISTS finance_entries_guard();
DROP TABLE IF EXISTS counterparties;
DROP TABLE IF EXISTS finance_categories;
DROP TABLE IF EXISTS finance_accounts;
DELETE FROM admin_users WHERE role = 'accountant';
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner','editor','viewer'));
DROP TABLE IF EXISTS companies;
DELETE FROM schema_migrations WHERE version = '0006_finance';
