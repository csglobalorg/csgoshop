-- Phase 7: Marketing / Promo

-- Promo Codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    description TEXT,
    type        TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
    value       NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_order   NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_uses    INT,
    uses_count  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    subtitle    TEXT,
    image_url   TEXT,
    link_url    TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promo_codes' AND policyname='Promo codes publicly readable') THEN
    CREATE POLICY "Promo codes publicly readable" ON promo_codes FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='banners' AND policyname='Banners publicly readable') THEN
    CREATE POLICY "Banners publicly readable" ON banners FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='Announcements publicly readable') THEN
    CREATE POLICY "Announcements publicly readable" ON announcements FOR SELECT TO public USING (true);
  END IF;
END $$;
