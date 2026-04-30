ALTER TABLE sets ADD COLUMN IF NOT EXISTS variant_overrides JSONB DEFAULT '{}'::jsonb;
