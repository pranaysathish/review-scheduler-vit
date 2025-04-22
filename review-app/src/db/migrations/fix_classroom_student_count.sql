-- Fix for classroom student counts
-- This migration ensures that students are properly associated with classrooms

-- First, let's check if there are any orphaned classroom_students entries
DO $$
DECLARE
    classroom_id_cse4079 INTEGER;
BEGIN
    -- Get the ID of CSE4079 classroom
    SELECT id INTO classroom_id_cse4079 FROM classrooms WHERE name = 'CSE4079';
    
    -- If we found the classroom, ensure it has the correct student associations
    IF classroom_id_cse4079 IS NOT NULL THEN
        -- Log for debugging
        RAISE NOTICE 'Found CSE4079 classroom with ID: %', classroom_id_cse4079;
        
        -- Check existing student associations
        RAISE NOTICE 'Current student associations for CSE4079:';
        
        -- Use EXECUTE to avoid the loop syntax issue
        DECLARE
            student_record RECORD;
        BEGIN
            FOR student_record IN EXECUTE 'SELECT student_id, classroom_id FROM classroom_students WHERE classroom_id = ' || classroom_id_cse4079 LOOP
                RAISE NOTICE 'Student ID: %, Classroom ID: %', student_record.student_id, student_record.classroom_id;
            END LOOP;
        END;
    ELSE
        RAISE NOTICE 'CSE4079 classroom not found';
    END IF;
    -- Add a direct check for any users with student role who aren't associated with CSE4079
    IF classroom_id_cse4079 IS NOT NULL THEN
        RAISE NOTICE 'Checking for students not associated with CSE4079';
        
        -- Find student users not associated with the classroom
        DECLARE
            student_record RECORD;
            query TEXT;
        BEGIN
            query := 'SELECT u.id AS student_id FROM users u WHERE u.role = ''student'' AND NOT EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.student_id = u.id AND cs.classroom_id = ' || classroom_id_cse4079 || ')';
            
            FOR student_record IN EXECUTE query LOOP
                RAISE NOTICE 'Found student ID % not associated with CSE4079', student_record.student_id;
                
                -- Insert the association
                INSERT INTO classroom_students (classroom_id, student_id)
                VALUES (classroom_id_cse4079, student_record.student_id);
                
                RAISE NOTICE 'Added student ID % to CSE4079', student_record.student_id;
            END LOOP;
        END;
    END IF;
END $$;

-- Create a function to ensure students are properly counted
CREATE OR REPLACE FUNCTION get_classroom_student_count(p_classroom_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    student_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT student_id) INTO student_count
    FROM classroom_students
    WHERE classroom_id = p_classroom_id;
    
    RETURN student_count;
END;
$$ LANGUAGE plpgsql;

-- Update the get_classrooms_with_student_counts function to use the new counting function
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
        'students_count', get_classroom_student_count(c.id)
    )
    FROM classrooms c
    LEFT JOIN (
        SELECT classroom_id, COUNT(*) as team_count
        FROM teams
        GROUP BY classroom_id
    ) t ON c.id = t.classroom_id
    WHERE c.faculty_id = p_faculty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
