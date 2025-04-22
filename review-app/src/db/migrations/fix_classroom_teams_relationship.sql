-- Fix the relationship between classrooms and teams

-- First, check if the classroom_id column exists in the teams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'classroom_id'
  ) THEN
    -- Add classroom_id column if it doesn't exist
    ALTER TABLE teams ADD COLUMN classroom_id INTEGER;
  END IF;
  
  -- Check if the foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'teams' 
    AND ccu.table_name = 'classrooms' 
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE teams 
    ADD CONSTRAINT teams_classroom_id_fkey 
    FOREIGN KEY (classroom_id) 
    REFERENCES classrooms(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
