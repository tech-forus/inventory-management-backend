# Teams Feature Testing Guide

## Overview
This guide will help you test the Teams feature that has been added to the Library page.

## Prerequisites

1. **Database Migration**: Run the teams table migration
   ```bash
   # Option 1: Run migration script
   cd BACKEND/database
   node migrate.js
   
   # Option 2: Run SQL directly
   psql -U your_user -d your_database -f migrations/014_create_teams.sql
   ```

2. **Backend Server**: Ensure the backend server is running
   ```bash
   cd BACKEND
   npm start
   # or
   node server.js
   ```

3. **Frontend Server**: Ensure the frontend server is running
   ```bash
   cd FRONTEND
   npm run dev
   ```

## Testing Steps

### 1. Database Migration Test

Verify the teams table was created:
```sql
-- Connect to your database and run:
SELECT * FROM teams LIMIT 1;
-- Should return empty result (no error means table exists)

-- Check table structure:
\d teams
```

### 2. Backend API Testing

#### Option A: Use the Test Script
```bash
cd BACKEND
node test_teams_api.js
```

**Note**: Update the test credentials in `test_teams_api.js`:
- `TEST_COMPANY_ID`: Your test company ID
- `TEST_EMAIL`: Your test user email
- `TEST_PASSWORD`: Your test user password

#### Option B: Manual API Testing with curl/Postman

**Get Auth Token:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "email": "your_email@example.com",
    "password": "your_password"
  }'
```

**Get All Teams:**
```bash
curl -X GET http://localhost:5000/api/library/teams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Team:**
```bash
curl -X POST http://localhost:5000/api/library/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "contactNumber": "9876543210",
    "emailId": "john.doe@example.com",
    "department": "Sales",
    "designation": "Sales Manager"
  }'
```

**Update Team:**
```bash
curl -X PUT http://localhost:5000/api/library/teams/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "contactNumber": "9876543211",
    "emailId": "john.doe.updated@example.com",
    "department": "Marketing",
    "designation": "Marketing Manager"
  }'
```

**Delete Team:**
```bash
curl -X DELETE http://localhost:5000/api/library/teams/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Frontend Testing

1. **Login** to the application
2. **Navigate** to Library page (`/app/library`)
3. **Click** on the "Teams" tab
4. **Test Add Team**:
   - Click "Add Team" button
   - Fill in all required fields:
     - Name: "John Doe"
     - Contact Number: "9876543210"
     - Email ID: "john.doe@example.com"
     - Department: "Sales"
     - Designation: "Sales Manager"
   - Click "Save"
   - Verify team member appears in the table

5. **Test Search**:
   - Type in search box (e.g., "John")
   - Verify filtering works

6. **Test Edit**:
   - Click edit icon on a team member
   - Modify fields
   - Click "Save"
   - Verify changes are reflected

7. **Test Delete**:
   - Click delete icon on a team member
   - Confirm deletion
   - Verify team member is removed from table

8. **Test Validation**:
   - Try to save with empty required fields
   - Try invalid email format
   - Try invalid phone number
   - Verify error messages appear

## Expected Results

### Backend API
- ✅ GET `/api/library/teams` returns list of teams
- ✅ POST `/api/library/teams` creates new team member
- ✅ PUT `/api/library/teams/:id` updates team member
- ✅ DELETE `/api/library/teams/:id` soft deletes team member (sets is_active = false)
- ✅ Validation rejects missing required fields
- ✅ Unique constraint prevents duplicate emails per company

### Frontend
- ✅ Teams tab appears in Library page
- ✅ Add Team dialog opens with all fields
- ✅ Form validation works (required fields, email format, phone format)
- ✅ Team members display in table
- ✅ Search filters team members
- ✅ Edit updates team member
- ✅ Delete removes team member
- ✅ Loading states work correctly

## Troubleshooting

### Database Issues
- **Table doesn't exist**: Run the migration file `014_create_teams.sql`
- **Permission errors**: Check database user has CREATE TABLE permissions

### API Issues
- **404 Not Found**: Check routes are registered in `library.js`
- **401 Unauthorized**: Verify JWT token is valid
- **400 Bad Request**: Check request body matches expected format

### Frontend Issues
- **Tab not showing**: Check `LibraryPage.tsx` includes 'teams' in tabs array
- **API errors**: Check browser console for error messages
- **Form not submitting**: Check validation errors in form

## Files Modified/Created

### Backend
- ✅ `BACKEND/database/migrations/014_create_teams.sql` - Database migration
- ✅ `BACKEND/routes/library.js` - Added teams API routes
- ✅ `BACKEND/test_teams_api.js` - Test script

### Frontend
- ✅ `FRONTEND/src/components/library/TeamsTab.tsx` - Teams component
- ✅ `FRONTEND/src/services/libraryService.ts` - Added teams service methods
- ✅ `FRONTEND/src/pages/LibraryPage.tsx` - Added teams tab

## Next Steps

After testing:
1. Verify all CRUD operations work
2. Test with multiple team members
3. Test edge cases (duplicate emails, long names, etc.)
4. Verify data persists after page refresh
5. Test with different user roles if applicable

