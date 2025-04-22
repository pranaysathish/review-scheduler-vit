-- Create activities table for tracking user actions
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'classroom_created', 'classroom_joined', 'team_created', 'team_joined', 'slots_published', 'submission_created'
  entity_id INTEGER, -- ID of the related entity (classroom, team, etc.)
  entity_name TEXT, -- Name of the related entity
  details JSONB, -- Additional details about the activity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_activity_type_idx ON activities(activity_type);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at);

-- Enable RLS on activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own activities
CREATE POLICY activities_user_select ON activities
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_user_id = auth.uid()
    )
  );

-- Create policy for faculty to view activities in their classrooms
CREATE POLICY activities_faculty_select ON activities
  FOR SELECT
  USING (
    activity_type = 'classroom_created' OR
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = activities.entity_id
      AND classrooms.faculty_id = auth.uid()
    )
  );

-- Create policy for all users to insert their own activities
CREATE POLICY activities_insert ON activities
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_user_id = auth.uid()
    )
  );

-- Create function to log an activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id INTEGER,
  p_activity_type TEXT,
  p_entity_id INTEGER,
  p_entity_name TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO activities (user_id, activity_type, entity_id, entity_name, details)
  VALUES (p_user_id, p_activity_type, p_entity_id, p_entity_name, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically log activities

-- Trigger for classroom creation
CREATE OR REPLACE FUNCTION log_classroom_created()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id INTEGER;
BEGIN
  -- Get user ID from supabase_user_id
  SELECT id INTO v_user_id FROM users WHERE supabase_user_id = NEW.faculty_id;
  
  -- Log the activity
  PERFORM log_activity(
    v_user_id,
    'classroom_created',
    NEW.id,
    NEW.name,
    jsonb_build_object('link_code', NEW.link_code)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for classroom creation
DROP TRIGGER IF EXISTS classroom_created_trigger ON classrooms;
CREATE TRIGGER classroom_created_trigger
AFTER INSERT ON classrooms
FOR EACH ROW
EXECUTE FUNCTION log_classroom_created();

-- Trigger for classroom joining
CREATE OR REPLACE FUNCTION log_classroom_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_classroom_name TEXT;
BEGIN
  -- Get classroom name
  SELECT name INTO v_classroom_name FROM classrooms WHERE id = NEW.classroom_id;
  
  -- Log the activity
  PERFORM log_activity(
    NEW.student_id,
    'classroom_joined',
    NEW.classroom_id,
    v_classroom_name,
    '{}'::JSONB
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for classroom joining
DROP TRIGGER IF EXISTS classroom_joined_trigger ON classroom_students;
CREATE TRIGGER classroom_joined_trigger
AFTER INSERT ON classroom_students
FOR EACH ROW
EXECUTE FUNCTION log_classroom_joined();

-- Trigger for team creation
CREATE OR REPLACE FUNCTION log_team_created()
RETURNS TRIGGER AS $$
DECLARE
  v_classroom_name TEXT;
  v_user_id INTEGER;
BEGIN
  -- Get classroom name
  SELECT name INTO v_classroom_name FROM classrooms WHERE id = NEW.classroom_id;
  
  -- Get user ID (team leader)
  SELECT student_id INTO v_user_id FROM team_members 
  WHERE team_id = NEW.id AND role = 'leader' 
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Log the activity
    PERFORM log_activity(
      v_user_id,
      'team_created',
      NEW.id,
      NEW.name,
      jsonb_build_object('classroom_name', v_classroom_name, 'classroom_id', NEW.classroom_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team creation
DROP TRIGGER IF EXISTS team_created_trigger ON teams;
CREATE TRIGGER team_created_trigger
AFTER INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION log_team_created();

-- Trigger for team joining
CREATE OR REPLACE FUNCTION log_team_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_classroom_id INTEGER;
  v_classroom_name TEXT;
BEGIN
  -- Skip for team leaders (already logged in team creation)
  IF NEW.role = 'leader' THEN
    RETURN NEW;
  END IF;
  
  -- Get team and classroom info
  SELECT t.name, t.classroom_id INTO v_team_name, v_classroom_id 
  FROM teams t WHERE t.id = NEW.team_id;
  
  SELECT name INTO v_classroom_name FROM classrooms WHERE id = v_classroom_id;
  
  -- Log the activity
  PERFORM log_activity(
    NEW.student_id,
    'team_joined',
    NEW.team_id,
    v_team_name,
    jsonb_build_object('classroom_name', v_classroom_name, 'classroom_id', v_classroom_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team joining
DROP TRIGGER IF EXISTS team_joined_trigger ON team_members;
CREATE TRIGGER team_joined_trigger
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION log_team_joined();
