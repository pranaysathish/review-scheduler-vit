-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  supabase_user_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'faculty' or 'student'
  department TEXT,
  roll_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classrooms table
CREATE TABLE classrooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  faculty_id UUID NOT NULL,
  link_code TEXT UNIQUE NOT NULL,
  review_deadlines JSONB NOT NULL, -- e.g., { "Review 1": "2025-02-28", "Review 2": "2025-03-15", "Final": "2025-04-15" }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (faculty_id) REFERENCES users(supabase_user_id)
);

-- Create classroom_students table for many-to-many relationship
CREATE TABLE classroom_students (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(classroom_id, student_id)
);

-- Create timetables table
CREATE TABLE timetables (
  id SERIAL PRIMARY KEY,
  faculty_id UUID NOT NULL,
  data JSONB NOT NULL, -- stores parsed timetable data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (faculty_id) REFERENCES users(supabase_user_id)
);

-- Create slots table
CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL, -- e.g., 10, 15, 30, 45 minutes
  max_teams INTEGER NOT NULL,
  review_stage TEXT NOT NULL, -- e.g., "Review 1", "Review 2", "Final"
  status TEXT NOT NULL, -- e.g., "available", "booked"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
);

-- Create teams table
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  project_title TEXT,
  invitation_code TEXT UNIQUE,
  max_members INTEGER DEFAULT 4,
  classroom_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
);

-- Create team_members table for team-student relationships
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, student_id)
);

-- Create submissions table
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  file_url TEXT NOT NULL, -- stored in AWS S3
  review_stage TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Create bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (slot_id) REFERENCES slots(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(slot_id, team_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_supabase_user_id ON users(supabase_user_id);
CREATE INDEX idx_classrooms_faculty_id ON classrooms(faculty_id);
CREATE INDEX idx_classroom_students_classroom_id ON classroom_students(classroom_id);
CREATE INDEX idx_classroom_students_student_id ON classroom_students(student_id);
CREATE INDEX idx_slots_classroom_id ON slots(classroom_id);
CREATE INDEX idx_teams_classroom_id ON teams(classroom_id);
CREATE INDEX idx_teams_invitation_code ON teams(invitation_code);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_student_id ON team_members(student_id);
CREATE INDEX idx_submissions_team_id ON submissions(team_id);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_team_id ON bookings(team_id);

-- Create RLS policies for security
-- These are examples and should be adjusted based on your specific security requirements

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = supabase_user_id);

-- Classrooms table policies
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can create classrooms" 
  ON classrooms FOR INSERT 
  WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Faculty can view their own classrooms" 
  ON classrooms FOR SELECT 
  USING (faculty_id = auth.uid());

CREATE POLICY "Students can view classrooms they are part of" 
  ON classrooms FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM classroom_students cs
    JOIN users u ON cs.student_id = u.id
    WHERE cs.classroom_id = classrooms.id 
    AND u.supabase_user_id = auth.uid()
  ));

-- Classroom_students table policies
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can see students in their classrooms"
  ON classroom_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_students.classroom_id
      AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can see their own classroom memberships"
  ON classroom_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = classroom_students.student_id
      AND u.supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can join classrooms"
  ON classroom_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = classroom_students.student_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Teams table policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can see teams in their classrooms"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = teams.classroom_id
      AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can see teams in their classrooms"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = teams.classroom_id
      AND u.supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = teams.classroom_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Team_members table policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can see team members in their classrooms"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN classrooms c ON t.classroom_id = c.id
      WHERE t.id = team_members.team_id
      AND c.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Students can see team members in their teams"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = team_members.team_id
      AND u.supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Students can join teams"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = team_members.student_id
      AND u.supabase_user_id = auth.uid()
      AND u.role = 'student'
    )
  );

-- Similar policies can be created for other tables
