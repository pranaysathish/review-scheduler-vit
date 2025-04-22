-- Fix the counts for teams and students in classrooms

-- Create or replace function to count teams in a classroom
CREATE OR REPLACE FUNCTION count_teams_in_classroom(classroom_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count
  FROM teams
  WHERE classroom_id = $1;
  
  RETURN team_count;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to count students in a classroom
CREATE OR REPLACE FUNCTION count_students_in_classroom(classroom_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count
  FROM classroom_students
  WHERE classroom_id = $1;
  
  RETURN student_count;
END;
$$ LANGUAGE plpgsql;
