-- Fix the team members count issue

-- Check if there are any team members in the database
SELECT COUNT(*) FROM team_members;

-- Check team members for specific teams
SELECT team_id, COUNT(*) 
FROM team_members 
GROUP BY team_id;

-- Make sure the team_members table has the correct structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members';

-- Add a trigger to update the members count in teams table if needed
CREATE OR REPLACE FUNCTION update_team_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the count when a new member is added
    UPDATE teams SET members_count = (
      SELECT COUNT(*) FROM team_members WHERE team_id = NEW.team_id
    ) WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update the count when a member is removed
    UPDATE teams SET members_count = (
      SELECT COUNT(*) FROM team_members WHERE team_id = OLD.team_id
    ) WHERE id = OLD.team_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Check if the trigger already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_members_count_trigger'
  ) THEN
    CREATE TRIGGER update_team_members_count_trigger
    AFTER INSERT OR DELETE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_members_count();
  END IF;
END $$;

-- Add members_count column to teams table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'members_count'
  ) THEN
    ALTER TABLE teams ADD COLUMN members_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update the members_count for all teams
UPDATE teams SET members_count = (
  SELECT COUNT(*) FROM team_members WHERE team_id = teams.id
);

-- Check the updated counts
SELECT id, name, members_count FROM teams;
