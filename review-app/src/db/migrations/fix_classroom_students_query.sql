-- Create a function to get all students in a classroom
CREATE OR REPLACE FUNCTION get_classroom_students(p_classroom_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT json_agg(
    json_build_object(
      'student_id', cs.student_id,
      'name', u.name,
      'email', u.email,
      'roll_number', u.roll_number
    )
  ) INTO result
  FROM classroom_students cs
  JOIN users u ON cs.student_id = u.id
  WHERE cs.classroom_id = p_classroom_id;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure RLS is disabled on classroom_students to avoid any issues
ALTER TABLE classroom_students DISABLE ROW LEVEL SECURITY;
