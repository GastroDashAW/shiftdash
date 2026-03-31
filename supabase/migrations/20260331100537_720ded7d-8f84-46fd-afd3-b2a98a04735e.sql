
-- Fix leave_requests: Remove overly broad SELECT policy
-- Employees should only see their own requests, not colleagues'
DROP POLICY IF EXISTS "Authenticated can read leave_requests" ON public.leave_requests;
