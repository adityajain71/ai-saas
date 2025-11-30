-- Add missing columns to payments table
-- Run this in your Supabase SQL Editor

-- Add razorpay_order_id column (to store Razorpay order ID)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add provider_payment_id column (to store actual payment ID after payment)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;

-- Add user_id column (to track which user made the payment)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_task_id ON payments(task_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments';

-- ============================================
-- TROUBLESHOOTING: Task Status Update Issues
-- ============================================

-- 1. Check if status column exists and its type
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'status';

-- 2. If status is an ENUM, check valid values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT enumtypid 
  FROM pg_type 
  WHERE typname = 'task_status'
);

-- 3. Check RLS policies on tasks table
SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- 4. Test manual update (replace with your actual task ID)
-- UPDATE tasks SET status = 'paid' WHERE id = 'YOUR_TASK_ID_HERE';

-- 5. If RLS is blocking, you can temporarily disable for testing:
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- After testing, re-enable:
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
