-- Rollback for 0005 (drops only what 0005 added). Take a branch snapshot first.
-- Rows in publication_approvals for the new entity types must be removed before the old CHECK can be restored.
DELETE FROM publication_approvals WHERE entity_type IN ('collection','experience_section');
ALTER TABLE publication_approvals DROP CONSTRAINT IF EXISTS publication_approvals_entity_type_check;
ALTER TABLE publication_approvals ADD CONSTRAINT publication_approvals_entity_type_check CHECK (entity_type IN ('product','blog_post'));
DROP TABLE IF EXISTS experience_translations;
DROP TABLE IF EXISTS experience_sections;
DROP TABLE IF EXISTS collection_products;
DROP TABLE IF EXISTS collection_translations;
DROP TABLE IF EXISTS collections;
DELETE FROM schema_migrations WHERE version = '0005_collections_experience';
