# Product Context

## Project Overview
The project is a NextJS 14 application for scheduling and managing J-component project reviews at VIT Chennai. This system helps faculty members schedule review slots and allows students to book these slots for their project reviews.

## Tech Stack
- Next.js 14 as the framework
- TypeScript for type safety
- Tailwind CSS for styling
- ShadCN UI for components
- Framer Motion for animations
- React Hook Form for validation
- Supabase for auth, database, storage, and real-time updates
- AWS S3 for file storage
- SendGrid for notifications
- Vercel for deployment

## Database Schema
The database schema has been set up with Supabase PostgreSQL directly (without Prisma) and includes tables for:
- users
- classrooms
- timetables
- slots
- teams
- submissions
- bookings

## Components
- Authentication system with role-based redirection
- Faculty dashboard for managing classrooms and review slots
- Student dashboard for joining classrooms, forming teams, and booking slots
- Timetable parser for faculty to identify free slots
- Review scheduling system

## Project Organization
The project follows Next.js 14 app router structure with:
- `/app` - Main application routes and API endpoints
- `/components` - Reusable UI components
- `/lib` - Utility functions and libraries
- `/db` - Database migrations and queries
- `/types` - TypeScript type definitions

## Standards
- TypeScript for type safety
- Component-based architecture
- Server actions for data mutations
- Responsive design for all device sizes
- Error handling and validation

[2025-04-22 20:26:28] - Initial project context documentation
