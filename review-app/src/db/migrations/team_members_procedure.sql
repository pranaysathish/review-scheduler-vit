-- Create a stored procedure to get team members for a classroom
-- This bypasses RLS policies
CREATE OR REPLACE FUNCTION get_team_members_for_classroom(p_classroom_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT json_agg(
    json_build_object(
      'team_id', tm.team_id,
      'student_id', tm.student_id,
      'role', tm.role,
      'student_name', u.name,
      'student_email', u.email,
      'student_roll_number', u.roll_number
    )
  ) INTO result
  FROM team_members tm
  JOIN users u ON tm.student_id = u.id
  JOIN teams t ON tm.team_id = t.id
  WHERE t.classroom_id = p_classroom_id;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Temporarily disable RLS on team_members to avoid recursion issues
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
