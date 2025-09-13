-- Create cannabis_products table
CREATE TABLE IF NOT EXISTS "cannabis_products" (
  "id" serial PRIMARY KEY,
  "owner_id" integer NOT NULL REFERENCES "users"("id"),
  "product_name" text NOT NULL,
  "strain" text NOT NULL,
  "location" text NOT NULL,
  "quantity" real NOT NULL,
  "price_per_unit" real,
  "thc_content" real,
  "cbd_content" real,
  "description" text,
  "certification_standard" text,
  "harvest_date" timestamp,
  "created_at" timestamp DEFAULT now()
);