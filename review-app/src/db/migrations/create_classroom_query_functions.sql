-- Function to get classrooms with student counts for a faculty
CREATE OR REPLACE FUNCTION get_classrooms_with_student_counts(p_faculty_id INTEGER)
RETURNS SETOF JSONB AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'faculty_id', c.faculty_id,
    'link_code', c.link_code,
    'review_deadlines', c.review_deadlines,
    'created_at', c.created_at,
    'teams_count', COALESCE(t.team_count, 0),
    'students_count', COALESCE(s.student_count, 0)
  )
  FROM classrooms c
  LEFT JOIN (
    SELECT classroom_id, COUNT(*) as team_count
    FROM teams
    GROUP BY classroom_id
  ) t ON c.id = t.classroom_id
  LEFT JOIN (
    SELECT classroom_id, COUNT(DISTINCT student_id) as student_count
    FROM classroom_students
    GROUP BY classroom_id
  ) s ON c.id = s.classroom_id
  WHERE c.faculty_id = p_faculty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
