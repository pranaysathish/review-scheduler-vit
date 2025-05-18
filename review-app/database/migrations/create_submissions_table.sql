-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Reviewed', 'Graded'
  feedback TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Faculty can view submissions from their teams
CREATE POLICY submissions_view_faculty ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN classrooms ON teams.classroom_id = classrooms.id
      JOIN users ON classrooms.faculty_id = users.supabase_user_id
      WHERE teams.id = submissions.team_id
        AND users.supabase_user_id = auth.uid()
        AND users.role = 'faculty'
    )
  );

-- Students can view their own team's submissions
CREATE POLICY submissions_view_students ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN team_members ON teams.id = team_members.team_id
      JOIN users ON team_members.student_id = users.id
      WHERE teams.id = submissions.team_id
        AND users.supabase_user_id = auth.uid()
        AND users.role = 'student'
    )
  );

-- Students can create submissions for their own team
CREATE POLICY submissions_insert_students ON submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      JOIN team_members ON teams.id = team_members.team_id
      JOIN users ON team_members.student_id = users.id
      WHERE teams.id = submissions.team_id
        AND users.supabase_user_id = auth.uid()
        AND users.role = 'student'
    )
  );

-- Faculty can update submissions (for grading and feedback)
CREATE POLICY submissions_update_faculty ON submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN classrooms ON teams.classroom_id = classrooms.id
      JOIN users ON classrooms.faculty_id = users.supabase_user_id
      WHERE teams.id = submissions.team_id
        AND users.supabase_user_id = auth.uid()
        AND users.role = 'faculty'
    )
  );
