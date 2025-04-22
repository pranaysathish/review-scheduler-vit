# ReviewScheduler - Product Requirements Document Update

## Project Overview
ReviewScheduler is a NextJS 14 application designed for scheduling and managing J-component project reviews at VIT Chennai. The application facilitates faculty members in creating classrooms, managing review slots, and reviewing student submissions, while allowing students to join classrooms, form teams, book review slots, and submit their project materials.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **Animations**: Framer Motion
- **Form Validation**: React Hook Form
- **Backend**: Supabase (Auth, Database, Storage, Real-time updates)
- **File Storage**: AWS S3
- **Notifications**: SendGrid
- **Deployment**: Vercel

## Database Schema
The database is implemented with Supabase PostgreSQL and includes the following tables:
- `users`: Stores user information including role (student/faculty)
- `classrooms`: Stores classroom details created by faculty
- `timetables`: Stores faculty timetable information
- `slots`: Stores review slots created by faculty
- `teams`: Stores team information created by students
- `submissions`: Stores project submissions by teams
- `bookings`: Stores slot bookings made by teams
- `classroom_students`: Junction table for classroom-student relationships

## Completed Features

### Authentication
- [x] Role-based authentication (Student/Faculty)
- [x] Role-based redirection to appropriate dashboards
- [x] Secure authentication using Supabase Auth

### Faculty Features
- [x] Faculty dashboard with overview of classrooms, students, teams, and review slots
- [x] Classroom creation and management
- [x] Timetable parsing to identify free slots
- [x] Review slot creation and management
- [x] View student submissions with accurate data
- [x] View booked review slots with accurate data

### Student Features
- [x] Student dashboard with upcoming reviews and classroom information
- [x] Join classrooms using link codes
- [x] Team creation and management
- [x] View available review slots
- [x] Book review slots for team presentations
- [x] Submit project materials for review

### Database Migrations
- [x] Fix classroom-teams relationship
- [x] Fix team members count
- [x] Add triggers to update team member counts automatically

## In-Progress Features

### Faculty Features
- [ ] Filtering of review slots and submissions by classroom and status
- [ ] Calendar view with real-time data (currently shows dummy data)
- [ ] Edit and cancel functionality for review slots
- [ ] Grading system for student submissions

### Student Features
- [ ] Improved team management interface
- [ ] File upload for submissions (currently only supports links)
- [ ] Notification system for upcoming reviews and feedback

### General Improvements
- [ ] Enhanced error handling and user feedback
- [ ] Responsive design optimizations for mobile devices
- [ ] Performance optimizations for large datasets

## Pending Features

### Faculty Features
- [ ] Bulk creation and management of review slots
- [ ] Export review schedule to calendar formats (iCal, Google Calendar)
- [ ] Advanced analytics on student performance
- [ ] Customizable review criteria and rubrics

### Student Features
- [ ] Team chat and collaboration features
- [ ] Progress tracking for project milestones
- [ ] Peer review functionality
- [ ] Integration with version control systems

### General Features
- [ ] Email notifications for important events
- [ ] Dark/Light theme toggle
- [ ] Accessibility improvements
- [ ] Offline support for basic functionality

## Recent Fixes and Improvements

1. **Faculty Dashboard**:
   - Fixed the issue where review slots and submissions were showing dummy values
   - Implemented API endpoints to fetch actual data for review slots and submissions
   - Added proper loading states and empty state messages
   - Fixed syntax errors in the codebase

2. **Student Dashboard**:
   - Updated to display accurate upcoming reviews based on booked slots
   - Enhanced the display of classroom and team information
   - Improved spacing between sections for better UI/UX

3. **Database**:
   - Created migration scripts to fix relationships between classrooms and teams
   - Implemented functions to count teams and students in classrooms
   - Added a trigger to update team member counts automatically

## Next Steps

### Short-term (1-2 weeks)
1. Complete the filtering functionality for review slots and submissions
2. Implement real data for the calendar view
3. Add edit and cancel functionality for review slots
4. Enhance the file upload system for submissions
5. Fix any remaining UI/UX issues

### Medium-term (3-4 weeks)
1. Implement the grading system for student submissions
2. Add notification system for upcoming reviews and feedback
3. Develop export functionality for review schedules
4. Enhance mobile responsiveness
5. Implement team chat features

### Long-term (2-3 months)
1. Develop analytics dashboard for faculty
2. Implement peer review functionality
3. Add integration with version control systems
4. Develop offline support
5. Implement accessibility improvements

## Conclusion
The ReviewScheduler application has made significant progress in implementing core functionality for both faculty and student users. The recent fixes to the faculty dashboard have improved data accuracy and user experience. The focus now should be on completing the in-progress features and addressing the pending items according to the prioritized timeline.
