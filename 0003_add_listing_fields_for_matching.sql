-- Add new columns to listings table for matching functionality

-- Add price column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price REAL NOT NULL DEFAULT 0;

-- Add qualityGrade column 
ALTER TABLE listings ADD COLUMN IF NOT EXISTS quality_grade TEXT DEFAULT 'Standard';

-- Add isVerified column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Update the price for existing listings based on pricePerUnit
UPDATE listings SET price = price_per_unit * quantity WHERE price = 0;

-- Add indexes for search and match functionality
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);

-- Update listings trigger to maintain price when pricePerUnit or quantity changes
CREATE OR REPLACE FUNCTION update_listing_price()
RETURNS TRIGGER AS $$
BEGIN
  NEW.price := NEW.price_per_unit * NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_listing_price ON listings;
CREATE TRIGGER tr_update_listing_price
BEFORE INSERT OR UPDATE OF price_per_unit, quantity ON listings
FOR EACH ROW
EXECUTE FUNCTION update_listing_price();