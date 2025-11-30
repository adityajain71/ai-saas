# Database Update Test

## Issue
After payment, task status is not updating from 'created' to 'paid'.

## Steps to Debug

1. **Check if payment record exists:**
   - Go to Supabase Dashboard → Table Editor → payments
   - Look for recent payment with razorpay_order_id

2. **Check if task status updated:**
   - Go to Supabase Dashboard → Table Editor → tasks  
   - Find your task by ID
   - Check if status column = 'paid'

3. **Check RLS Policies:**
   - Go to Supabase Dashboard → Authentication → Policies
   - Check if there are policies on the `tasks` table that might block updates
   - Service role key should bypass RLS, but verify

4. **Manual Test in SQL Editor:**
   ```sql
   -- Find your task
   SELECT id, status, task_text FROM tasks ORDER BY created_at DESC LIMIT 5;
   
   -- Try to update it manually
   UPDATE tasks SET status = 'paid' WHERE id = 'YOUR_TASK_ID_HERE';
   
   -- Verify the update
   SELECT id, status FROM tasks WHERE id = 'YOUR_TASK_ID_HERE';
   ```

5. **Check server logs:**
   - Look for "✅ Task updated to paid status" message
   - If you see error, note what it says

## Possible Issues

1. **Column doesn't exist**: Check if 'status' column exists with correct type
2. **RLS blocking update**: Even with service role, check policies
3. **Wrong task ID**: Verify taskId being passed is correct
4. **Type mismatch**: Status column might be enum type with specific values

## Quick Fix

If manual SQL update works, but API doesn't, it's likely an RLS or permission issue.

Run this in Supabase SQL Editor:
```sql
-- Check current RLS policies on tasks table
SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- If needed, temporarily disable RLS for testing
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Try payment again, then re-enable:
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```
