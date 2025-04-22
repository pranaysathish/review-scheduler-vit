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

## Architecture Decisions

[2025-04-22 20:26:28] - **Database-Level Student Count Calculation**
- Decision: Move student count calculation to the database level with SQL functions
- Rationale: More efficient and accurate counting, especially for complex relationships
- Implications: Reduced load on the application server, more consistent data across different views

## Implementation Decisions

[2025-04-22 20:26:28] - **Error Handling for API Endpoints**
- Decision: Implement graceful fallbacks for API endpoints that might not exist or return errors
- Rationale: Prevents application crashes when optional features are not available
- Implications: Better user experience, but requires careful testing to ensure fallbacks work correctly
