-- Create a function to get the accurate count of students in a classroom
CREATE OR REPLACE FUNCTION get_classroom_students_count(p_classroom_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count
  FROM classroom_students
  WHERE classroom_id = p_classroom_id;
  
  RETURN student_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all classrooms with accurate student counts
CREATE OR REPLACE FUNCTION get_classrooms_with_student_counts(p_faculty_id UUID)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  link_code TEXT,
  faculty_id UUID,
  review_deadlines JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  students_count BIGINT,
  teams_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.link_code,
    c.faculty_id,
    c.review_deadlines,
    c.created_at,
    COUNT(DISTINCT cs.student_id) AS students_count,
    COUNT(DISTINCT t.id) AS teams_count
  FROM 
    classrooms c
  LEFT JOIN 
    classroom_students cs ON c.id = cs.classroom_id
  LEFT JOIN 
    teams t ON c.id = t.classroom_id
  WHERE 
    c.faculty_id = p_faculty_id
  GROUP BY 
    c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
