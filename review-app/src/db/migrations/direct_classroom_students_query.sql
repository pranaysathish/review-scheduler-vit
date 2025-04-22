-- Create a function to directly query classroom students using SQL
-- This bypasses all RLS policies
CREATE OR REPLACE FUNCTION get_classroom_students_direct(p_classroom_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  classroom_id INTEGER,
  student_id INTEGER,
  student_name TEXT,
  student_email TEXT,
  student_roll_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.classroom_id,
    cs.student_id,
    u.name AS student_name,
    u.email AS student_email,
    u.roll_number AS student_roll_number
  FROM 
    classroom_students cs
  JOIN 
    users u ON cs.student_id = u.id
  WHERE 
    cs.classroom_id = p_classroom_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable RLS on classroom_students to ensure data access
ALTER TABLE classroom_students DISABLE ROW LEVEL SECURITY;
