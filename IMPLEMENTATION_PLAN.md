# Implementation Plan
# VIT Review Scheduler

## Core Functionality Focus

This implementation plan focuses on the essential features needed for the Review Scheduler application:

1. Faculty creates classrooms and shares unique codes via WhatsApp
2. Students join classrooms using these codes
3. Faculty parses timetables and publishes available slots
4. Students view and book these slots

## Phase 1: Essential Infrastructure (1 week)

### Authentication System
- ✅ Set up Supabase project and database
- ✅ Implement authentication with Supabase Auth
- ✅ Create signup form with role selection (faculty/student)
- ✅ Implement role-based redirection

### Database Schema
- ✅ Create users table with role information
- ✅ Set up classrooms table with unique codes
- ✅ Establish slots table for review scheduling
- ✅ Create bookings table to track slot reservations

## Phase 2: Faculty Dashboard (1 week)

### Classroom Creation
- ⏳ Create classroom form with:
  - Name input
  - Course code input
  - Review stages configuration
  - Automatic unique code generation
- ⏳ Implement copy-to-clipboard for easy sharing via WhatsApp
- ⏳ Display list of created classrooms with student counts
- ⏳ Add classroom details view with enrolled students

### Timetable Management
- ✅ Create timetable input interface
- ✅ Implement timetable parsing algorithm
- ✅ Develop slot splitting functionality
- ✅ Build slot selection interface
- ⏳ Implement slot publishing to database with:
  - Duration selection
  - Review stage assignment
  - Maximum teams per slot

## Phase 3: Student Dashboard (1 week)

### Classroom Joining
- ⏳ Create simple code input form
- ⏳ Implement code validation
- ⏳ Show success/error messages
- ⏳ Display joined classrooms list

### Team Management
- ⏳ Create team formation interface
- ⏳ Implement team size limitations
- ⏳ Add team member management

### Slot Booking
- ⏳ Display available slots by classroom
- ⏳ Implement slot booking functionality
- ⏳ Add booking confirmation
- ⏳ Show booked slots in student dashboard

## Phase 4: Real-time Updates & Integration (1 week)

### Real-time Updates
- ⏳ Implement Supabase Realtime for slot availability
- ⏳ Add real-time updates for bookings
- ⏳ Create notifications for booking confirmations

### System Integration
- ⏳ Connect all components
- ⏳ Implement proper error handling
- ⏳ Add loading states
- ⏳ Test end-to-end workflow

## Implementation Details

### 1. Faculty Creating Classrooms

#### Database Structure
```sql
CREATE TABLE classrooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  faculty_id UUID REFERENCES users(supabase_user_id),
  link_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Classroom Creation Component
```typescript
// Component for creating a new classroom
const CreateClassroom = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  
  const generateUniqueCode = () => {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const uniqueCode = generateUniqueCode();
      
      // Insert into database
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          name,
          faculty_id: user.id,
          link_code: uniqueCode
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setCode(uniqueCode);
      // Reset form
      setName('');
    } catch (error) {
      console.error('Error creating classroom:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Classroom Name" 
          required 
        />
        <button type="submit" disabled={loading}>
          Create Classroom
        </button>
      </form>
      
      {code && (
        <div>
          <p>Share this code with your students: {code}</p>
          <button onClick={() => navigator.clipboard.writeText(code)}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};
```

### 2. Students Joining Classrooms

#### Database Structure
```sql
CREATE TABLE classroom_students (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER REFERENCES classrooms(id),
  student_id UUID REFERENCES users(supabase_user_id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(classroom_id, student_id)
);
```

#### Join Classroom Component
```typescript
// Component for students to join a classroom
const JoinClassroom = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // Find classroom with the given code
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('link_code', code)
        .single();
        
      if (findError) throw new Error('Invalid classroom code');
      
      // Join the classroom
      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: user.id
        });
        
      if (joinError) {
        if (joinError.code === '23505') { // Unique violation
          throw new Error('You have already joined this classroom');
        }
        throw joinError;
      }
      
      setMessage(`Successfully joined ${classroom.name}`);
      setCode('');
    } catch (error) {
      console.error('Error joining classroom:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={code} 
          onChange={(e) => setCode(e.target.value.toUpperCase())} 
          placeholder="Enter Classroom Code" 
          maxLength={6}
          required 
        />
        <button type="submit" disabled={loading}>
          Join Classroom
        </button>
      </form>
      
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### 3. Faculty Publishing Slots

#### Database Structure
```sql
CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER REFERENCES classrooms(id),
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  max_teams INTEGER DEFAULT 1,
  review_stage TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Slot Publishing Component
```typescript
// Component for faculty to publish slots
const PublishSlots = ({ selectedSlots, classrooms }) => {
  const [reviewDuration, setReviewDuration] = useState('10');
  const [maxTeams, setMaxTeams] = useState(1);
  const [reviewStage, setReviewStage] = useState('Review 1');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const handlePublish = async () => {
    if (!selectedClassroomId) {
      setMessage('Please select a classroom');
      return;
    }
    
    if (selectedSlots.length === 0) {
      setMessage('Please select at least one slot');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Prepare slots for insertion
      const slotsToInsert = selectedSlots.map(slot => ({
        classroom_id: parseInt(selectedClassroomId),
        day: slot.day,
        start_time: slot.start,
        end_time: slot.end,
        duration: parseInt(reviewDuration),
        max_teams: maxTeams,
        review_stage: reviewStage,
        status: 'available'
      }));
      
      // Insert slots into database
      const { data, error } = await supabase
        .from('slots')
        .insert(slotsToInsert)
        .select();
        
      if (error) throw error;
      
      setMessage(`Successfully published ${data.length} slots`);
    } catch (error) {
      console.error('Error publishing slots:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h3>Publish Selected Slots</h3>
      
      <div>
        <label>
          Review Duration:
          <select 
            value={reviewDuration} 
            onChange={(e) => setReviewDuration(e.target.value)}
          >
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="20">20 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </label>
      </div>
      
      <div>
        <label>
          Max Teams Per Slot:
          <select 
            value={maxTeams} 
            onChange={(e) => setMaxTeams(parseInt(e.target.value))}
          >
            <option value="1">1 team</option>
            <option value="2">2 teams</option>
            <option value="3">3 teams</option>
          </select>
        </label>
      </div>
      
      <div>
        <label>
          Review Stage:
          <select 
            value={reviewStage} 
            onChange={(e) => setReviewStage(e.target.value)}
          >
            <option value="Review 1">Review 1</option>
            <option value="Review 2">Review 2</option>
            <option value="Final">Final Review</option>
          </select>
        </label>
      </div>
      
      <div>
        <label>
          Classroom:
          <select 
            value={selectedClassroomId} 
            onChange={(e) => setSelectedClassroomId(e.target.value)}
          >
            <option value="">Select a classroom</option>
            {classrooms.map(classroom => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      
      <button 
        onClick={handlePublish} 
        disabled={loading || !selectedClassroomId || selectedSlots.length === 0}
      >
        Publish Slots
      </button>
      
      {message && <p>{message}</p>}
    </div>
  );
};
```

### 4. Students Booking Slots

#### Database Structure
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES slots(id),
  team_id INTEGER REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, team_id)
);
```

#### Slot Booking Component
```typescript
// Component for students to book slots
const BookSlot = ({ classroomId, teamId }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data, error } = await supabase
          .from('slots')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('status', 'available');
          
        if (error) throw error;
        
        setSlots(data || []);
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSlots();
  }, [classroomId]);
  
  const handleBookSlot = async (slotId) => {
    setBookingSlot(slotId);
    setMessage('');
    
    try {
      // Check if team exists
      if (!teamId) {
        throw new Error('You need to be in a team to book a slot');
      }
      
      // Book the slot
      const { error } = await supabase
        .from('bookings')
        .insert({
          slot_id: slotId,
          team_id: teamId
        });
        
      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Your team has already booked this slot');
        }
        throw error;
      }
      
      // Update slot status
      const { error: updateError } = await supabase
        .from('slots')
        .update({ status: 'booked' })
        .eq('id', slotId);
        
      if (updateError) throw updateError;
      
      setMessage('Slot booked successfully!');
      
      // Remove booked slot from the list
      setSlots(slots.filter(slot => slot.id !== slotId));
    } catch (error) {
      console.error('Error booking slot:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setBookingSlot(null);
    }
  };
  
  if (loading) return <p>Loading available slots...</p>;
  
  return (
    <div>
      <h3>Available Slots</h3>
      
      {slots.length === 0 ? (
        <p>No available slots for this classroom</p>
      ) : (
        <ul>
          {slots.map(slot => (
            <li key={slot.id}>
              {slot.day}, {slot.start_time} - {slot.end_time} ({slot.duration} min)
              <button 
                onClick={() => handleBookSlot(slot.id)}
                disabled={bookingSlot === slot.id}
              >
                {bookingSlot === slot.id ? 'Booking...' : 'Book Slot'}
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {message && <p>{message}</p>}
    </div>
  );
};
```

## Testing Plan

### 1. Faculty Workflow Testing
- Create a classroom and verify unique code generation
- Parse a timetable and select slots
- Publish slots to a classroom
- Verify slots appear in the database

### 2. Student Workflow Testing
- Join a classroom using the code
- Create or join a team
- View available slots
- Book a slot
- Verify booking is recorded

### 3. Integration Testing
- End-to-end testing of the complete workflow
- Verify real-time updates
- Test concurrent bookings
- Verify proper error handling

## Deployment Plan

1. Set up Vercel project
2. Configure environment variables
3. Deploy to production
4. Monitor for any issues

---

*This implementation plan focuses on the core functionality requested and will be updated as the project progresses.*
