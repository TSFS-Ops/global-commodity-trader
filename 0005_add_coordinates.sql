-- Add coordinates to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude REAL;

-- Add coordinates to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude REAL;

-- Add coordinates to cannabis_products table
ALTER TABLE cannabis_products ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE cannabis_products ADD COLUMN IF NOT EXISTS longitude REAL;