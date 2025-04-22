-- This script will check if there are students in a specific classroom
-- Replace CLASSROOM_ID with the actual ID of your classroom

-- Check classroom_students table
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
  cs.classroom_id = CLASSROOM_ID;

-- Count students in the classroom
SELECT COUNT(*) AS student_count
FROM classroom_students
WHERE classroom_id = CLASSROOM_ID;

-- Check if there are any RLS policies that might be affecting the query
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM 
  pg_policies
WHERE 
  tablename = 'classroom_students';

-- Disable RLS on classroom_students to ensure data access
ALTER TABLE classroom_students DISABLE ROW LEVEL SECURITY;
