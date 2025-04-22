-- Create classroom_students table for student-classroom relationships
CREATE TABLE IF NOT EXISTS classroom_students (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(classroom_id, student_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS classroom_students_classroom_id_idx ON classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS classroom_students_student_id_idx ON classroom_students(student_id);

-- Add RLS policies for classroom_students table
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;

-- Policy for faculty to see students in their classrooms
CREATE POLICY classroom_students_faculty_select ON classroom_students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN users u ON c.faculty_id = u.supabase_user_id
      WHERE c.id = classroom_students.classroom_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to see their own classroom memberships
CREATE POLICY classroom_students_student_select ON classroom_students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = classroom_students.student_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Policy for students to join classrooms
CREATE POLICY classroom_students_student_insert ON classroom_students
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = classroom_students.student_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Policy for students to leave classrooms
CREATE POLICY classroom_students_student_delete ON classroom_students
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = classroom_students.student_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Add function to get classrooms for a student
CREATE OR REPLACE FUNCTION get_student_classrooms(student_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  faculty_id UUID,
  link_code TEXT,
  review_deadlines JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.faculty_id, c.link_code, c.review_deadlines, c.created_at
  FROM classrooms c
  JOIN classroom_students cs ON c.id = cs.classroom_id
  WHERE cs.student_id = student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
