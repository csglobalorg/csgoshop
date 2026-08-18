-- Phase 1: Category Manager
-- Creates a self-referencing categories table supporting 3 levels:
-- Level 1: Category (e.g., Women's Fashion)
-- Level 2: Subcategory (e.g., Sharee)
-- Level 3: Sub-subcategory (e.g., Silk Sharee)

CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    parent_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
    level       INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slug, parent_id)
);

-- Index for fast parent lookups
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_level_idx ON categories(level);

-- RLS: readable by all, writable by service role only
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
ON categories FOR SELECT
TO public
USING (true);

CREATE POLICY "Only service role can write categories"
ON categories FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_categories_updated_at();
