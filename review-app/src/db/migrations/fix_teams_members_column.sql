-- Fix the teams table by making the members column nullable or providing a default value

-- Check if the members column exists and has a not-null constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'members' AND is_nullable = 'NO'
  ) THEN
    -- Make the members column nullable
    ALTER TABLE teams ALTER COLUMN members DROP NOT NULL;
    
    -- If it's a JSON/JSONB column, set a default empty array
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'teams' AND column_name = 'members' 
      AND (data_type = 'json' OR data_type = 'jsonb')
    ) THEN
      ALTER TABLE teams ALTER COLUMN members SET DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;
