-- Fix the RLS policies for team_members table to avoid infinite recursion

-- First, drop all existing policies
DROP POLICY IF EXISTS "Faculty can see team members in their classrooms" ON team_members;
DROP POLICY IF EXISTS "Students can see team members in their teams" ON team_members;
DROP POLICY IF EXISTS "Students can join teams" ON team_members;
DROP POLICY IF EXISTS faculty_view_team_members ON team_members;
DROP POLICY IF EXISTS student_view_team_members ON team_members;
DROP POLICY IF EXISTS student_insert_team_members ON team_members;
DROP POLICY IF EXISTS team_members_select ON team_members;
DROP POLICY IF EXISTS team_members_insert ON team_members;
DROP POLICY IF EXISTS team_members_delete ON team_members;

-- Temporarily disable RLS
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a team belongs to a classroom owned by the current user
CREATE OR REPLACE FUNCTION team_in_faculty_classroom(team_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN classrooms c ON t.classroom_id = c.id
    WHERE t.id = team_id
    AND c.faculty_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a member of a team
CREATE OR REPLACE FUNCTION user_in_team(team_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id INTEGER;
BEGIN
  -- Get the user's ID
  SELECT id INTO v_user_id FROM users WHERE supabase_user_id = auth.uid();
  
  -- Check if the user is in the team
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_id
    AND student_id = v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified policies
-- Allow faculty to view team members in their classrooms
CREATE POLICY faculty_view_team_members ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN classrooms c ON t.classroom_id = c.id
      WHERE t.id = team_members.team_id
      AND c.faculty_id = auth.uid()
    )
  );

-- Allow students to view team members in their own teams
CREATE POLICY student_view_team_members ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = team_members.team_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Allow students to join teams
CREATE POLICY student_join_teams ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = team_members.student_id
      AND supabase_user_id = auth.uid()
    )
  );
