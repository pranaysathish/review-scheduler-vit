-- Drop existing policies on classrooms table
DROP POLICY IF EXISTS classrooms_faculty_select ON classrooms;
DROP POLICY IF EXISTS classrooms_faculty_insert ON classrooms;
DROP POLICY IF EXISTS classrooms_faculty_update ON classrooms;
DROP POLICY IF EXISTS classrooms_faculty_delete ON classrooms;
DROP POLICY IF EXISTS classrooms_student_select ON classrooms;

-- Make sure RLS is enabled
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- Create new policies with fixed logic to avoid recursion
-- Policy for faculty to see their own classrooms
CREATE POLICY classrooms_faculty_select ON classrooms
  FOR SELECT
  USING (faculty_id = auth.uid());

-- Policy for faculty to create classrooms
CREATE POLICY classrooms_faculty_insert ON classrooms
  FOR INSERT
  WITH CHECK (faculty_id = auth.uid());

-- Policy for faculty to update their own classrooms
CREATE POLICY classrooms_faculty_update ON classrooms
  FOR UPDATE
  USING (faculty_id = auth.uid());

-- Policy for faculty to delete their own classrooms
CREATE POLICY classrooms_faculty_delete ON classrooms
  FOR DELETE
  USING (faculty_id = auth.uid());

-- Policy for students to see classrooms they are members of
CREATE POLICY classrooms_student_select ON classrooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = classrooms.id
      AND u.supabase_user_id = auth.uid()
    )
  );
