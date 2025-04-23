# Decision Log

## Technical Decisions

[2025-04-22 20:26:28] - **SQL Function for Classroom Student Counts**
- Decision: Implement a dedicated SQL function `get_classrooms_with_student_counts` to retrieve classrooms with accurate student counts
- Rationale: Direct queries were not consistently counting students correctly, especially for the CSE4079 classroom
- Implications: Improved accuracy of student counts in the dashboard, better performance by handling counting at the database level

[2025-04-22 20:26:28] - **Fallback Approach for Classroom Data Fetching**
- Decision: Implement a multi-tier fallback approach for fetching classroom data
- Rationale: The RPC function might not be available in all environments, so having fallbacks ensures the application works reliably
- Implications: More robust data fetching, but slightly more complex code to maintain

[2025-04-22 20:26:28] - **CI/CD Configuration Options**
- Decision: Provide both Jenkins and Azure DevOps configuration files
- Rationale: Allows flexibility in choosing the CI/CD platform based on team preferences and available resources
- Implications: Team can select the most appropriate platform without additional configuration work

[2025-04-23 00:59:48] - **Direct Queries Instead of Foreign Key Relationships**
- Decision: Replace nested relationship queries with direct, separate queries
- Rationale: The database schema doesn't have properly defined relationships between classrooms and teams
- Implications: More reliable data fetching but potentially less efficient than proper foreign key relationships

## Architecture Decisions

[2025-04-22 20:26:28] - **Database-Level Student Count Calculation**
- Decision: Move student count calculation to the database level with SQL functions
- Rationale: More efficient and accurate counting, especially for complex relationships
- Implications: Reduced load on the application server, more consistent data across different views

[2025-04-23 00:59:48] - **Modular API Route Structure**
- Decision: Create dedicated API routes for specific data needs (e.g., teams for a classroom)
- Rationale: Avoids complex nested queries that rely on database relationships
- Implications: Better separation of concerns, more maintainable code, but more API endpoints to manage

## Implementation Decisions

[2025-04-22 20:26:28] - **Error Handling for API Endpoints**
- Decision: Implement graceful fallbacks for API endpoints that might not exist or return errors
- Rationale: Prevents application crashes when optional features are not available
- Implications: Better user experience, but requires careful testing to ensure fallbacks work correctly

[2025-04-23 00:59:48] - **Enhanced Faculty Name Fetching**
- Decision: Implement multi-tier approach to fetch faculty names with fallbacks
- Rationale: Ensures faculty names are displayed correctly even when primary query fails
- Implications: More robust user experience but slightly more complex code

[2025-04-23 00:59:48] - **Tabular Display for Booked Review Slots**
- Decision: Implement a table view for displaying booked review slots in the team page
- Rationale: Provides clear, organized presentation of review schedule information
- Implications: Better user experience for students to track their upcoming reviews
