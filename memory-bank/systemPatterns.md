# System Patterns

## Coding Patterns

[2025-04-22 20:26:28] - **Component Structure**
- React components are organized by role (faculty, student, shared)
- Each component focuses on a single responsibility
- Props are properly typed with TypeScript interfaces

[2025-04-22 20:26:28] - **Data Fetching**
- Primary: Use RPC functions for complex data operations
- Fallback: Direct database queries with proper joins
- Error handling with graceful degradation

[2025-04-22 20:26:28] - **State Management**
- Local component state for UI-specific state
- Server-side data fetching for database operations
- Proper loading and error states

## Architecture Patterns

[2025-04-22 20:26:28] - **Database Design**
- Tables organized by domain (users, classrooms, teams, slots)
- Foreign key relationships for data integrity
- SQL functions for complex operations

[2025-04-22 20:26:28] - **API Structure**
- RESTful endpoints organized by resource
- Route handlers with proper error handling
- Authentication and authorization checks

## Testing Patterns

[2025-04-22 20:26:28] - **Error Handling**
- Try-catch blocks for async operations
- Fallback UI for error states
- Console logging for debugging

## DevOps Patterns

[2025-04-22 20:26:28] - **CI/CD Pipeline**
- Automated testing on code push
- Build verification
- Environment-specific deployments (dev/prod)
- Database migration handling
