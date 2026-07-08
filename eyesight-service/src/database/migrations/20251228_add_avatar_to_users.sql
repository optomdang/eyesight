-- Migration: Add avatar field to Users table
-- Date: 2025-12-28
-- Description: Add avatar TEXT field for storing base64 encoded image or URL

-- Add avatar column to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add comment to avatar column
COMMENT ON COLUMN "Users".avatar IS 'Base64 encoded image or URL to avatar';

-- Note: No need to create index on avatar as it's not used for querying
-- Note: This is an optional field (nullable) so existing rows will have NULL
