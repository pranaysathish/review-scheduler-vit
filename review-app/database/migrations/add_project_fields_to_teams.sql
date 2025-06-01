-- Add project_description and project_tags columns to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_tags TEXT[];
