# Product Requirements Document (PRD)
# VIT Review Scheduler

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for the VIT Review Scheduler, a Next.js application designed to streamline the scheduling and management of J-component project reviews at VIT Chennai. The platform enables faculty to upload timetables, parse free slots, publish review slots, and manage submissions, while allowing students to join classrooms, form teams, book review slots, and submit deliverables.

### 1.2 Scope
The VIT Review Scheduler will provide a comprehensive solution for managing the entire review process, from scheduling to submission and feedback. It will serve two primary user roles: faculty and students, with distinct interfaces and functionalities for each.

### 1.3 Definitions and Acronyms
- **J-component**: Project component of courses at VIT Chennai
- **PRD**: Product Requirements Document
- **UI**: User Interface
- **UX**: User Experience
- **API**: Application Programming Interface
- **AWS S3**: Amazon Web Services Simple Storage Service
- **RLS**: Row Level Security (Supabase)

## 2. System Overview

### 2.1 System Architecture
The application is built using a modern tech stack:
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, Framer Motion
- **Backend**: Supabase (Authentication, Database, Storage, Realtime)
- **Storage**: AWS S3 for file storage
- **Notifications**: SendGrid for email notifications
- **Deployment**: Vercel

### 2.2 User Roles and Permissions
1. **Faculty**:
   - Create and manage classrooms
   - Upload and parse timetables
   - Publish review slots
   - View and manage student submissions
   - Provide feedback and grades

2. **Students**:
   - Join classrooms using link codes
   - Create or join teams (max 4 members)
   - Book review slots
   - Submit project deliverables
   - View feedback and grades

### 2.3 Database Schema
The application uses Supabase PostgreSQL with the following tables:

1. **users**:
   - `id`: SERIAL PRIMARY KEY
   - `supabase_user_id`: UUID @unique (mapped to Supabase Auth user ID)
   - `email`: TEXT
   - `name`: TEXT
   - `role`: TEXT (faculty or student)
   - `department`: TEXT
   - `roll_number`: TEXT (for students)
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   - `updated_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

2. **classrooms**:
   - `id`: SERIAL PRIMARY KEY
   - `name`: TEXT
   - `faculty_id`: UUID (foreign key to users.supabase_user_id)
   - `link_code`: TEXT UNIQUE
   - `review_deadlines`: JSONB (e.g., { "Review 1": "2025-02-28", "Review 2": "2025-03-15", "Final": "2025-04-15" })
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

3. **timetables**:
   - `id`: SERIAL PRIMARY KEY
   - `faculty_id`: UUID (foreign key to users.supabase_user_id)
   - `data`: JSONB (stores parsed timetable data)
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

4. **slots**:
   - `id`: SERIAL PRIMARY KEY
   - `classroom_id`: INTEGER (foreign key to classrooms.id)
   - `day`: TEXT
   - `start_time`: TEXT
   - `end_time`: TEXT
   - `duration`: INTEGER (e.g., 10, 15, 30, 45 minutes)
   - `max_teams`: INTEGER
   - `review_stage`: TEXT (e.g., "Review 1", "Review 2", "Final")
   - `status`: TEXT (e.g., "available", "booked")
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

5. **teams**:
   - `id`: SERIAL PRIMARY KEY
   - `name`: TEXT
   - `members`: JSONB (e.g., [{ "supabaseUserId": "user123", "name": "John" }])
   - `classroom_id`: INTEGER (foreign key to classrooms.id)
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

6. **submissions**:
   - `id`: SERIAL PRIMARY KEY
   - `team_id`: INTEGER (foreign key to teams.id)
   - `file_url`: TEXT (stored in AWS S3)
   - `review_stage`: TEXT
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

7. **bookings**:
   - `id`: SERIAL PRIMARY KEY
   - `slot_id`: INTEGER (foreign key to slots.id)
   - `team_id`: INTEGER (foreign key to teams.id)
   - `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   - `UNIQUE(slot_id, team_id)`

## 3. Current Implementation Status

### 3.1 Completed Features

#### 3.1.1 Authentication System
- Supabase Auth integration for email-based authentication
- Role-based redirection (faculty to `/faculty/dashboard`, students to `/student/dashboard`)
- Signup flow with role selection (faculty or student)

#### 3.1.2 Faculty Dashboard
- Welcome message with user information
- Classroom management with student/team counts
- Timetable parsing functionality:
  - Text input for VIT timetable format
  - Parsing algorithm to identify free slots
  - Splitting slots into smaller intervals (10, 15, 20, 30 minutes)
  - Selection and publishing of review slots

#### 3.1.3 Student Dashboard
- Basic implementation with placeholder data
- User information display
- Navigation structure

### 3.2 In-Progress Features
- Classroom joining for students
- Team creation and management
- Review slot booking system
- File submission system

### 3.3 Pending Features
- Real-time updates for slot availability
- Email notifications for bookings and deadlines
- File storage integration with AWS S3
- Feedback and grading system

## 4. Detailed Requirements

### 4.1 Authentication and User Management

#### 4.1.1 Signup Process
- Users must provide email, password, name, and role (faculty or student)
- Students must provide roll number and department
- Faculty must provide department
- Email verification is required
- After signup, users are redirected based on their role

#### 4.1.2 Login Process
- Users can log in with email and password
- After login, users are redirected based on their role
- If role is missing, show an error message

#### 4.1.3 User Profile
- Users can view and edit their profile information
- Profile information includes name, email, department, and role-specific details

### 4.2 Faculty Features

#### 4.2.1 Classroom Management
- Faculty can create new classrooms with a name and review deadlines
- Each classroom has a unique link code for students to join
- Faculty can view all created classrooms with student/team counts
- Faculty can edit classroom details and deadlines

#### 4.2.2 Timetable Management
- Faculty can paste timetable data in VIT format
- System parses the timetable to identify free slots
- Faculty can view available slots by day and time
- Faculty can select the duration for review slots (10, 15, 20, 30 minutes)
- Faculty can select which free slots to publish for booking

#### 4.2.3 Review Slot Publishing
- Faculty can specify:
  - Review duration (10, 15, 20, 30 minutes)
  - Maximum teams per slot (1-3)
  - Review stage (Review 1, Review 2, Final)
  - Classroom assignment
- Published slots are available for students to book

#### 4.2.4 Submission Management
- Faculty can view all submissions by team and review stage
- Faculty can download submitted files
- Faculty can provide feedback and grades

### 4.3 Student Features

#### 4.3.1 Classroom Joining
- Students can join classrooms using a link code
- Students can view all joined classrooms with review stages and deadlines
- Students can leave classrooms

#### 4.3.2 Team Management
- Students can create teams with a name
- Teams are limited to 4 members
- Students can generate a unique code to invite other students
- Students can join existing teams using a code
- Students can view team members and team details

#### 4.3.3 Slot Booking
- Students can view available slots published by faculty
- Students can book slots for their team
- Booking updates in real-time to prevent conflicts
- Students can cancel bookings before a deadline

#### 4.3.4 Submission System
- Students can upload files (PDF, ZIP) for each review stage
- System validates file type and size
- Students can view submission history and status
- Students can replace submissions before the deadline

### 4.4 Notifications
- Email notifications for:
  - Slot booking confirmations
  - Upcoming review reminders
  - Submission deadlines
  - Feedback availability

## 5. Technical Requirements

### 5.1 Frontend
- Responsive design for all screen sizes
- Accessibility compliance (WCAG 2.1)
- Animations for improved UX:
  - Fade-in/out for notifications
  - Slide-in for forms
  - Bounce for new slot availability
  - Smooth scroll for dashboards

### 5.2 Backend
- Secure API endpoints for all operations
- Proper error handling and validation
- Efficient database queries
- Row Level Security (RLS) for data protection

### 5.3 Performance
- Page load time < 3 seconds
- Responsive UI with no lag
- Efficient data fetching with loading states

### 5.4 Security
- Authentication with Supabase Auth
- Data encryption for sensitive information
- Input validation to prevent injection attacks
- Rate limiting for API endpoints

## 6. Implementation Plan

### 6.1 Phase 1: Core Authentication and Dashboard (Completed)
- Authentication system with role-based redirection
- Basic faculty and student dashboards
- Timetable parsing functionality

### 6.2 Phase 2: Classroom and Team Management (In Progress)
- Classroom creation and management for faculty
- Classroom joining for students
- Team creation and management

### 6.3 Phase 3: Slot Booking and Submissions
- Review slot publishing for faculty
- Slot booking for students
- File submission system

### 6.4 Phase 4: Notifications and Feedback
- Email notifications integration
- Feedback and grading system
- Real-time updates

### 6.5 Phase 5: Testing and Deployment
- Comprehensive testing
- Bug fixes and optimizations
- Deployment to Vercel

## 7. Testing Strategy

### 7.1 Unit Testing
- Test individual components and functions
- Ensure proper error handling

### 7.2 Integration Testing
- Test interactions between components
- Verify data flow and state management

### 7.3 End-to-End Testing
- Test complete user flows
- Verify system behavior in real-world scenarios

### 7.4 Performance Testing
- Test application performance under load
- Identify and fix bottlenecks

## 8. Appendix

### 8.1 Wireframes and Mockups
- Login and signup screens
- Faculty dashboard
- Student dashboard
- Timetable parsing interface
- Slot booking interface

### 8.2 API Documentation
- Authentication endpoints
- Classroom management endpoints
- Slot management endpoints
- Submission endpoints

### 8.3 Database Schema Diagrams
- Entity-relationship diagrams
- Table relationships and constraints

---

*This PRD is a living document and will be updated as the project progresses.*
