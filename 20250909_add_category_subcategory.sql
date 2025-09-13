-- Make columns exist and be nullable for drafts
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- If older schema had NOT NULLs, relax them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='category' AND is_nullable='NO'
  ) THEN
    EXECUTE 'ALTER TABLE listings ALTER COLUMN category DROP NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='subcategory' AND is_nullable='NO'
  ) THEN
    EXECUTE 'ALTER TABLE listings ALTER COLUMN subcategory DROP NOT NULL';
  END IF;
END $$;