-- Add registration_number column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE users ADD COLUMN registration_number TEXT;
  END IF;
END $$;
