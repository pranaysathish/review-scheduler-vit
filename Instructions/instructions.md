# instructions.md

## Project Goal
Create a Next.js application using modern technologies to build a reliable and scalable platform for scheduling and managing J-component project reviews at VIT Chennai. Faculty should be able to upload timetables, parse free slots, publish review slots, and manage submissions, while students should be able to join classrooms, form teams, book review slots, and submit deliverables. Ensure role-based redirection after login (faculty to `/faculty/dashboard`, students to `/student/dashboard`) using Supabase Auth.

## Technologies Used
- **Next.js 14** as the framework
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ShadCN UI** for aesthetic and consistent components
- **Framer Motion** for animation (replacing Framer, focusing on fade-in/out, slide-in, bounce effects)
- **React Hook Form** for efficient input validation
- **Supabase** for authentication, database (PostgreSQL), storage, and real-time updates
- **AWS S3** for file storage (e.g., student submissions)
- **SendGrid** for notifications and webhooks
- **Vercel** for deployment

## Core Functionality

### 1. Database
- **Supabase PostgreSQL**: Define tables for users, classrooms, timetables, slots, teams, and submissions.
- **SQL Schema**: Set up database tables and relationships using SQL scripts.
- **Row Level Security (RLS)**: Implement security policies to control data access.
- **Table Relationships**: Link users to classrooms, slots to classrooms, and teams to users.
- **Stored Procedures**: Ensure atomic operations (e.g., slot booking) using Supabase RPC functions.
- **Tables**:
  - `users`:
    - `id SERIAL PRIMARY KEY`
    - `supabase_user_id UUID @unique` (mapped to Supabase Auth user ID)
    - `email TEXT`
    - `name TEXT`
    - `role TEXT` (e.g., "faculty" or "student")
    - `department TEXT`
    - `roll_number TEXT`
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
    - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
    - `supabase_user_id` is the primary identifier for relationships.
  - `classrooms`:
    - `id SERIAL PRIMARY KEY`
    - `name TEXT`
    - `faculty_id UUID` (foreign key to `users.supabase_user_id`)
    - `link_code TEXT UNIQUE`
    - `review_deadlines JSONB` (e.g., { "Review 1": "2025-02-28", "Review 2": "2025-03-15", "Final": "2025-04-15" })
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
  - `timetables`:
    - `id SERIAL PRIMARY KEY`
    - `faculty_id UUID` (foreign key to `users.supabase_user_id`)
    - `data JSONB` (stores parsed timetable data, e.g., { "MON": [{ "start": "08:00", "end": "08:50", "status": "occupied" }] })
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
  - `slots`:
    - `id SERIAL PRIMARY KEY`
    - `classroom_id INTEGER` (foreign key to `classrooms.id`)
    - `day TEXT`
    - `start_time TEXT`
    - `end_time TEXT`
    - `duration INTEGER` (e.g., 10, 15, 30, 45 minutes)
    - `max_teams INTEGER`
    - `review_stage TEXT` (e.g., "Review 1", "Review 2", "Final")
    - `status TEXT` (e.g., "available", "booked")
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
  - `teams`:
    - `id SERIAL PRIMARY KEY`
    - `name TEXT`
    - `members JSONB` (e.g., [{ "supabaseUserId": "user123", "name": "John" }])
    - `classroom_id INTEGER` (foreign key to `classrooms.id`)
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
  - `submissions`:
    - `id SERIAL PRIMARY KEY`
    - `team_id INTEGER` (foreign key to `teams.id`)
    - `file_url TEXT` (stored in AWS S3)
    - `review_stage TEXT`
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
  - `bookings`:
    - `id SERIAL PRIMARY KEY`
    - `slot_id INTEGER` (foreign key to `slots.id`)
    - `team_id INTEGER` (foreign key to `teams.id`)
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
    - `UNIQUE(slot_id, team_id)`

### 2. Authentication
- **Full Supabase Auth Integration**: Use Supabase Auth for email-based authentication (email/password or OAuth).
- **Webhooks**: Handle Supabase Auth events (`user.created`, `user.updated`, `user.deleted`) to sync with Supabase PostgreSQL.
- **Role-Based Redirection**:
  - After login, fetch the `role` from the `users` table using the Supabase Auth user ID.
  - Redirect faculty (`role = "faculty"`) to `/faculty/dashboard`.
  - Redirect students (`role = "student"`) to `/student/dashboard`.
  - If `role` is missing, show an error (“Role not found, please contact support”) with fade-in animation (Framer Motion) and redirect to `/`.
- **Signup Flow**:
  - During signup, include a role selection (e.g., dropdown for “Faculty” or “Student”) using ShadCN UI and React Hook Form, storing the `role` in the `users` table.

### 3. File Management
- **AWS S3 Integration**: Store student submission files (PDFs, ZIPs).
- **File Type Validation**: Accept only PDFs, ZIPs, etc.
- **File Size Limitations**: Cap at 10MB (configurable).
- **Preview Generation**: Generate thumbnails or previews for submissions.
- **Upload Status Tracking**: Show “Uploading,” “Success,” or “Failed” with fade-in animations.
- **Upload Process**: Upload photo/report, return a public S3 URL stored in the `submissions` table.

### 4. Timetable Parsing
- **Supabase Edge Functions**: Parse timetables (text, PDF, Excel) to identify free slots.
- **Logic**:
  - Input: Timetable data (e.g., theory 08:00-19:25, labs 08:00-19:20, occupied slots like “A1-MGT1063-TH-AB2-408-ALL”, free slots marked “-”).
  - Process: Identify free slots (e.g., “Wed, 15:50-16:45”) by avoiding occupied slots, lunch (13:25-14:00), and lab overlaps (e.g., Mon 08:00-11:30).
  - Output: Store free slots in the `slots` table, send callback URL to webhook for real-time updates via Supabase Realtime.

### 5. Notifications
- **SendGrid Integration**: Send email/SMS reminders for slot bookings, deadlines, and reviews.
- **Real-Time Updates**: Use Supabase Realtime for live updates (e.g., slot availability, bookings).

### 6. Deploy
- Create a GitHub repository and push the project.
- Deploy to Vercel.
- Add environment variables (e.g., `SUPABASE_URL`, `SUPABASE_KEY`, `AWS_S3_BUCKET`, `SENDGRID_API_KEY`).

## Pages

### Home Page
- **Path**: `/`.
- Minimal landing page with login/signup buttons (Supabase Auth integration) and a brief description (“Schedule J-Component Reviews at VIT Chennai”).
- Fade-in animation (Framer Motion) for buttons.

### Faculty Dashboard
- **Path**: `/faculty/dashboard`.
- Welcome message (e.g., “Welcome, Dr. Smith!”) with fade-in animation.
- Classroom management (cards/lists, ShadCN UI) with created classrooms (e.g., “CS3001 - J Component”), student/team counts, review stages, deadlines, and status, using smooth scroll animations.
- “Upload Timetable” section with “Paste Timetable” textarea, “Upload File” button, and “Parse Timetable” button.
- Parsed timetable grid (days Mon-Fri, times 08:00-19:25), “Available Slots” list (e.g., “MON, 10:45-11:35”), and calendar (green for free, yellow for occupied, gray for lunch/labs), with slide-in animations.
- Publish slots form (slide-in animation) with options:
  - Review duration (dropdown: 10 mins, 15 mins, 30 mins, 45 mins).
  - Max teams (1-3).
  - Review stage (Review 1, Review 2, Final).
  - Classroom assignment, with bouncing animation on publish.
- Submissions/reviews section, booked slots, notifications, and progress tracking (smooth scroll animations).

### Student Dashboard
- **Path**: `/student/dashboard`.
- Welcome message (e.g., “Welcome, John Doe!”) with fade-in animation.
- Classroom overview (cards/lists, ShadCN UI) of joined classrooms (e.g., “CS3001 - J Component”) with review stages, deadlines, and status, using smooth scroll animations.
- “Join Team” section for creating/joining teams (max 4 members, unique code) with slide-in form animations.
- Calendar (grid like timetable) for booking review slots (green for free, yellow for occupied, gray for unavailable), with bouncing animation on booking, real-time via Supabase.
- Submission section (file upload for PDFs/ZIPs) with guidelines, fade-in confirmation on upload, stored in AWS S3.
- Upcoming deadlines/notifications (via SendGrid, Supabase) with fade-in/out animations, progress tracking (e.g., “Review 1 Booked”) with slide-in animation for feedback/grades.

## Documentation

### 1. Supabase Auth Integration
- **Middleware for Protected Routes**:
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('supabase_user_id', session.user.id)
    .single()

  if (!user || !user.role) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { pathname } = request.nextUrl
  if (user.role === 'faculty' && !pathname.startsWith('/faculty')) {
    return NextResponse.redirect(new URL('/faculty/dashboard', request.url))
  }
  if (user.role === 'student' && !pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/student/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/faculty/:path*', '/student/:path*'],
}
```
- **Fetching User Role**:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

export async function getUserRole(supabaseUserId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('supabase_user_id', supabaseUserId)
    .single()
  if (error) throw new Error('Failed to fetch user role')
  return data?.role
}
```

### 2. Supabase Realtime for Slots
- **Subscribe to Slot Updates**:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

export function subscribeToSlots(classroomId: number, callback: (payload: any) => void) {
  supabase
    .channel('slots')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'slots', filter: `classroom_id=eq.${classroomId}` }, callback)
    .subscribe()
}
```

## Important Implementation Notes

### 0. Logging
- Add server-side logging (e.g., using `console.log` or `winston`) for error tracking in Supabase Edge Functions and API routes.

### 1. Project Setup
- Components in `/components`.
- Pages in `/app` using Next.js 14 app router.
- Server components for data fetching (e.g., timetable parsing).
- Client components with `'use client'` for interactive features (e.g., slot booking form).

### 2. Server API Calls
- All external API calls (e.g., Supabase, AWS S3, SendGrid) through server routes in `/app/api`.
- Client components interact via these APIs (e.g., `/api/slots/publish`).
- Request validation with TypeScript interfaces.

### 3. Environment Variables
- Store sensitive information in environment variables (e.g., `SUPABASE_URL`, `SUPABASE_KEY`, `AWS_S3_BUCKET`, `SENDGRID_API_KEY`).
- Use `.env` for development, configure on Vercel.
- Access only in server code.

### 4. Error Handling
- Comprehensive handling on client and server (e.g., invalid timetable format).
- Server logging in Edge Functions.
- Clear user messages (e.g., “Role not found”) with fade-in animations.
- Operation status tracking (e.g., “Parsing Timetable…”).

### 5. Type Safety
- TypeScript interfaces for all data structures (e.g., `User`, `Slot`, `Submission`).
- Avoid `any` type, use precise definitions.
- Input data validation with React Hook Form.

### 6. API Client Initialization
- Initialize Supabase, AWS S3, and SendGrid only in server code.
- Validate initialization (e.g., check environment variables).
- Handle connection errors, reuse connections.

### 7. Data Fetching in Components
- Use React hooks (e.g., `useEffect`, `useState`) for data fetching.
- Manage loading states (e.g., “Loading slots…” with fade-in animation).
- Handle errors (e.g., “Failed to load timetable”) with user-friendly messages.

## Design Preferences
- **Colors**: Use VIT’s yellow (#FFD700) and blue (#0033A0) for branding.
- **Layout**: Clean, mobile-friendly, responsive design with Tailwind CSS.
- **Animations**: Use Framer Motion for:
  - Fade-in/out for notifications, login buttons.
  - Slide-in for forms, booking confirmations.
  - Bounce for new slot availability.
  - Smooth scroll for dashboards.
- **Logo**: “VITamin Reviews” in bold, yellow/blue text (sans-serif, e.g., Roboto).
- **Typography**: Sans-serif fonts (Roboto, Open Sans).
- **Components**: Use ShadCN UI for aesthetic, consistent UI.
- **Accessibility**: WCAG 2.1 compliant (high contrast, keyboard navigation).

## Instructions for Windsurf AI
1. **Fix Role-Based Redirection**:
   - Ensure Supabase Auth is used for authentication.
   - After login, fetch the user’s `role` from the `users` table using their `supabaseUserId`.
   - Redirect faculty to `/faculty/dashboard` and students to `/student/dashboard`.
   - If `role` is missing, show an error message (“Role not found, please contact support”) with a fade-in animation and redirect to `/`.

2. **Implement Signup with Role Selection**:
   - During signup, include a role selection dropdown (“Faculty” or “Student”) using ShadCN UI and React Hook Form.
   - Store the `role` in the `users` table along with `supabaseUserId`, `email`, and `name`.

3. **Build Faculty Dashboard**:
   - Path: `/faculty/dashboard`.
   - Welcome message (e.g., “Welcome, Dr. Smith!”) with fade-in animation.
   - Classroom management (cards/lists, ShadCN UI) with created classrooms (e.g., “CS3001 - J Component”), student/team counts, review stages, deadlines, and status, using smooth scroll animations.
   - “Upload Timetable” section with “Paste Timetable” textarea, “Upload File” button, and “Parse Timetable” button.
   - Parsed timetable grid (days Mon-Fri, times 08:00-19:25), “Available Slots” list (e.g., “MON, 10:45-11:35”), and calendar (green for free, yellow for occupied, gray for lunch/labs), with slide-in animations.
   - Publish slots form (slide-in animation) with options: review duration (10 mins, 15 mins, 30 mins, 45 mins), max teams (1-3), review stage (Review 1, Review 2, Final), classroom assignment, with bouncing animation on publish.
   - Submissions/reviews section, booked slots, notifications, and progress tracking (smooth scroll animations).

4. **Build Student Dashboard**:
   - Path: `/student/dashboard`.
   - Welcome message (e.g., “Welcome, John Doe!”) with fade-in animation.
   - Classroom overview (cards/lists, ShadCN UI) of joined classrooms (e.g., “CS3001 - J Component”) with review stages, deadlines, and status, using smooth scroll animations.
   - “Join Team” section for creating/joining teams (max 4 members, unique code) with slide-in form animations.
   - Calendar (grid like timetable) for booking review slots (green for free, yellow for occupied, gray for unavailable), with bouncing animation on booking, real-time via Supabase.
   - Submission section (file upload for PDFs/ZIPs) with guidelines, fade-in confirmation on upload, stored in AWS S3.
   - Upcoming deadlines/notifications (via SendGrid, Supabase) with fade-in/out animations, progress tracking (e.g., “Review 1 Booked”) with slide-in animation for feedback/grades.

5. **Deploy**:
   - Push the project to a GitHub repository.
   - Deploy to Vercel.
   - Configure environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `AWS_S3_BUCKET`, `SENDGRID_API_KEY`).