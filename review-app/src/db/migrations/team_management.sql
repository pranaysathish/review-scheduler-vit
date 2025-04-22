-- Create team_members table for team-student relationships if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, student_id)
);

-- Add invitation_code to teams table if it doesn't exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_title TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 4;

-- Update teams table to include classroom_id if it doesn't exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_student_id_idx ON team_members(student_id);
CREATE INDEX IF NOT EXISTS teams_classroom_id_idx ON teams(classroom_id);
CREATE INDEX IF NOT EXISTS teams_invitation_code_idx ON teams(invitation_code);

-- Add RLS policies for team_members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy for faculty to see team members in their classrooms
CREATE POLICY team_members_faculty_select ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN classrooms c ON t.classroom_id = c.id
      JOIN users u ON c.faculty_id = u.supabase_user_id
      WHERE t.id = team_members.team_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to see team members in their teams
CREATE POLICY team_members_student_select ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = team_members.team_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to join teams
CREATE POLICY team_members_student_insert ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = team_members.student_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Policy for students to leave teams
CREATE POLICY team_members_student_delete ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = team_members.student_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Add RLS policies for teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy for faculty to see teams in their classrooms
CREATE POLICY teams_faculty_select ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN users u ON c.faculty_id = u.supabase_user_id
      WHERE c.id = teams.classroom_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to see teams in their classrooms
CREATE POLICY teams_student_select ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = teams.classroom_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to create teams
CREATE POLICY teams_student_insert ON teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = teams.classroom_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Policy for team leaders to update their teams
CREATE POLICY teams_leader_update ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = teams.id
      AND tm.role = 'leader'
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate invitation code for new teams
CREATE OR REPLACE FUNCTION set_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep trying until we get a unique code
  LOOP
    NEW.invitation_code := generate_invitation_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE invitation_code = NEW.invitation_code);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_team_invitation_code') THEN
    CREATE TRIGGER set_team_invitation_code
    BEFORE INSERT ON teams
    FOR EACH ROW
    WHEN (NEW.invitation_code IS NULL)
    EXECUTE FUNCTION set_invitation_code();
  END IF;
END $$;

-- Function to check if a student can join a team
CREATE OR REPLACE FUNCTION can_join_team(team_id INTEGER, student_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  team_count INTEGER;
  max_members INTEGER;
  is_in_classroom BOOLEAN;
BEGIN
  -- Check if student is already in a team in the same classroom
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t1 ON tm.team_id = t1.id
    JOIN teams t2 ON t1.classroom_id = t2.classroom_id
    WHERE tm.student_id = student_id
    AND t2.id = team_id
  ) INTO is_in_classroom;
  
  IF is_in_classroom THEN
    RETURN FALSE;
  END IF;
  
  -- Check if team is full
  SELECT COUNT(*) FROM team_members WHERE team_id = team_id INTO team_count;
  SELECT t.max_members FROM teams t WHERE t.id = team_id INTO max_members;
  
  RETURN team_count < max_members;
END;
$$ LANGUAGE plpgsql;
