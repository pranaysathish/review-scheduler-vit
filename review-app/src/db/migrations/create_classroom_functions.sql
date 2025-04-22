-- Function to create a classroom with proper security checks
CREATE OR REPLACE FUNCTION create_classroom(
  p_name TEXT,
  p_faculty_id UUID,
  p_link_code TEXT,
  p_review_deadlines JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_faculty_db_id INTEGER;
  v_classroom_id INTEGER;
BEGIN
  -- Get the current user ID from Supabase auth
  v_user_id := auth.uid();
  
  -- Verify the user exists and is a faculty member
  SELECT id INTO v_faculty_db_id
  FROM users
  WHERE supabase_user_id = v_user_id AND role = 'faculty';
  
  IF v_faculty_db_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or user not found';
  END IF;
  
  -- Ensure the faculty is creating a classroom for themselves
  IF v_user_id != p_faculty_id THEN
    RAISE EXCEPTION 'You can only create classrooms for yourself';
  END IF;
  
  -- Check if link code is already in use
  IF EXISTS (SELECT 1 FROM classrooms WHERE link_code = p_link_code) THEN
    RAISE EXCEPTION 'Link code is already in use. Please try a different code.';
  END IF;
  
  -- Insert the classroom
  INSERT INTO classrooms (name, faculty_id, link_code, review_deadlines)
  VALUES (p_name, v_faculty_db_id, p_link_code, p_review_deadlines)
  RETURNING id INTO v_classroom_id;
  
  -- Return the created classroom data
  RETURN jsonb_build_object(
    'id', v_classroom_id,
    'name', p_name,
    'faculty_id', v_faculty_db_id,
    'link_code', p_link_code,
    'review_deadlines', p_review_deadlines
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for students to join a classroom
CREATE OR REPLACE FUNCTION join_classroom(
  p_link_code TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_classroom_id INTEGER;
  v_student_id INTEGER;
  v_already_joined BOOLEAN;
BEGIN
  -- Get the classroom ID from the link code
  SELECT id INTO v_classroom_id
  FROM classrooms
  WHERE link_code = p_link_code;
  
  IF v_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found. Please check the link code and try again.';
  END IF;
  
  -- Get the student's database ID
  SELECT id INTO v_student_id
  FROM users
  WHERE supabase_user_id = p_user_id AND role = 'student';
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not a student';
  END IF;
  
  -- Check if already joined
  SELECT EXISTS (
    SELECT 1 
    FROM classroom_students 
    WHERE classroom_id = v_classroom_id AND student_id = v_student_id
  ) INTO v_already_joined;
  
  IF v_already_joined THEN
    RETURN jsonb_build_object(
      'success', false,
      'alreadyJoined', true,
      'message', 'You are already a member of this classroom'
    );
  END IF;
  
  -- Join the classroom
  INSERT INTO classroom_students (classroom_id, student_id)
  VALUES (v_classroom_id, v_student_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'alreadyJoined', false,
    'classroom_id', v_classroom_id,
    'message', 'Successfully joined classroom'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
