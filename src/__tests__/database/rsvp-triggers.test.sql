-- RSVP Database Triggers and Functions Test Suite
-- Tests database triggers, RLS policies, and real-time functionality

-- Test 1: RSVP Response Statistics Update Trigger
BEGIN;

-- Insert test event
INSERT INTO events (id, user_id, name, expected_guests) 
VALUES ('test-event-123', 'user-123', 'Test Wedding', 100);

-- Insert test RSVP link
INSERT INTO rsvp_links (id, event_id, token, household_name, primary_email)
VALUES ('link-123', 'test-event-123', 'test-token-123', 'Smith Family', 'smith@test.com');

-- Test: Statistics should update when RSVP response is inserted
INSERT INTO rsvp_responses (id, rsvp_link_id, event_id, guest_name, guest_email, status)
VALUES ('response-1', 'link-123', 'test-event-123', 'John Smith', 'john@smith.com', 'attending');

-- Verify statistics were calculated
SELECT 
  total_responses,
  attending_count,
  not_attending_count,
  pending_count
FROM rsvp_stats 
WHERE event_id = 'test-event-123' 
AND DATE(calculated_at) = CURRENT_DATE;

-- Should return: total_responses=1, attending_count=1, not_attending_count=0, pending_count=0

-- Test: Statistics should update when response status changes
UPDATE rsvp_responses 
SET status = 'not_attending' 
WHERE id = 'response-1';

-- Verify updated statistics
SELECT attending_count, not_attending_count 
FROM rsvp_stats 
WHERE event_id = 'test-event-123' 
AND DATE(calculated_at) = CURRENT_DATE;

-- Should return: attending_count=0, not_attending_count=1

ROLLBACK;

-- Test 2: Real-time Broadcast Trigger
BEGIN;

-- Set up test data
INSERT INTO events (id, user_id, name) 
VALUES ('broadcast-event', 'user-456', 'Broadcast Test');

INSERT INTO rsvp_links (id, event_id, token, household_name, primary_email)
VALUES ('broadcast-link', 'broadcast-event', 'broadcast-token', 'Test Family', 'test@broadcast.com');

-- Listen for notifications (this would be handled by the application in real scenarios)
-- The broadcast trigger should fire pg_notify when RSVP response is inserted

INSERT INTO rsvp_responses (id, rsvp_link_id, event_id, guest_name, status)
VALUES ('broadcast-response', 'broadcast-link', 'broadcast-event', 'Test Guest', 'attending');

-- The trigger should have called pg_notify with:
-- - Channel: 'rsvp_updates_broadcast-event'
-- - Payload: JSON with event details

ROLLBACK;

-- Test 3: RLS Policy Enforcement
BEGIN;

-- Create test users
INSERT INTO auth.users (id, email) VALUES 
('owner-user', 'owner@test.com'),
('other-user', 'other@test.com');

-- Create events for different users
INSERT INTO events (id, user_id, name) VALUES 
('owner-event', 'owner-user', 'Owner Event'),
('other-event', 'other-user', 'Other Event');

-- Create RSVP stats
INSERT INTO rsvp_stats (event_id, total_responses, attending_count) VALUES
('owner-event', 5, 3),
('other-event', 8, 6);

-- Test: User should only see their own event stats
SET ROLE authenticated;
SET SESSION "auth.uid" = 'owner-user';

SELECT event_id, total_responses 
FROM rsvp_stats 
WHERE event_id IN ('owner-event', 'other-event');

-- Should only return 'owner-event' record

-- Reset
RESET ROLE;

ROLLBACK;

-- Test 4: RSVP Link Expiration and Token Validation
BEGIN;

-- Insert expired RSVP link
INSERT INTO rsvp_links (
  id, event_id, token, household_name, primary_email, expires_at
) VALUES (
  'expired-link', 
  'test-event-123', 
  'expired-token', 
  'Expired Family', 
  'expired@test.com',
  NOW() - INTERVAL '1 day'  -- Expired yesterday
);

-- Test function to validate token (this would be in application code)
-- Should return null for expired tokens

-- Insert valid RSVP link
INSERT INTO rsvp_links (
  id, event_id, token, household_name, primary_email, expires_at
) VALUES (
  'valid-link',
  'test-event-123',
  'valid-token',
  'Valid Family',
  'valid@test.com', 
  NOW() + INTERVAL '30 days'  -- Valid for 30 days
);

-- This should be accessible
SELECT id, household_name 
FROM rsvp_links 
WHERE token = 'valid-token' 
AND expires_at > NOW();

-- Should return the valid link

ROLLBACK;

-- Test 5: Real-time Summary Function
BEGIN;

INSERT INTO events (id, user_id, name, expected_guests) 
VALUES ('summary-event', 'user-789', 'Summary Test', 50);

INSERT INTO rsvp_responses (event_id, guest_name, status, dietary_restrictions) VALUES
('summary-event', 'Guest 1', 'attending', 'Vegetarian'),
('summary-event', 'Guest 2', 'attending', NULL),
('summary-event', 'Guest 3', 'not_attending', NULL),
('summary-event', 'Guest 4', 'pending', 'Gluten-free');

-- Test the real-time summary function
SELECT get_rsvp_realtime_summary('summary-event');

-- Should return JSON with:
-- total_responses: 4
-- attending: 2  
-- not_attending: 1
-- pending: 1
-- response_rate: 8.0 (4/50 * 100)
-- dietary_restrictions: 2

ROLLBACK;

-- Test 6: Concurrent Response Handling
BEGIN;

-- Set up test scenario
INSERT INTO events (id, user_id, name) 
VALUES ('concurrent-event', 'user-concurrent', 'Concurrent Test');

INSERT INTO rsvp_links (
  id, event_id, token, household_name, primary_email, max_responses
) VALUES (
  'concurrent-link', 'concurrent-event', 'concurrent-token', 
  'Concurrent Family', 'concurrent@test.com', 4
);

-- Simulate concurrent inserts (in real scenario, these would be separate transactions)
INSERT INTO rsvp_responses (rsvp_link_id, event_id, guest_name, status) VALUES
('concurrent-link', 'concurrent-event', 'Guest 1', 'attending'),
('concurrent-link', 'concurrent-event', 'Guest 2', 'attending'),  
('concurrent-link', 'concurrent-event', 'Guest 3', 'not_attending'),
('concurrent-link', 'concurrent-event', 'Guest 4', 'attending');

-- Verify all responses were recorded
SELECT COUNT(*) as total_responses 
FROM rsvp_responses 
WHERE event_id = 'concurrent-event';

-- Should return 4

-- Verify response_count was updated correctly in rsvp_links
SELECT response_count 
FROM rsvp_links 
WHERE id = 'concurrent-link';

-- Should return 4

ROLLBACK;

-- Test 7: Performance and Index Usage
BEGIN;

-- Create performance test data
INSERT INTO events (id, user_id, name) 
VALUES ('perf-event', 'user-perf', 'Performance Test');

-- Insert many RSVP responses to test index performance
INSERT INTO rsvp_responses (event_id, guest_name, guest_email, status, created_at)
SELECT 
  'perf-event',
  'Guest ' || i,
  'guest' || i || '@test.com',
  CASE (i % 3) 
    WHEN 0 THEN 'attending'
    WHEN 1 THEN 'not_attending' 
    ELSE 'pending'
  END,
  NOW() - (i || ' minutes')::INTERVAL
FROM generate_series(1, 1000) i;

-- Test query performance with index
EXPLAIN ANALYZE 
SELECT * FROM rsvp_responses 
WHERE event_id = 'perf-event' 
AND status = 'attending'
ORDER BY created_at DESC 
LIMIT 50;

-- Should use index idx_rsvp_responses_event_id_realtime

-- Test statistics calculation performance
EXPLAIN ANALYZE
SELECT get_rsvp_realtime_summary('perf-event');

ROLLBACK;

-- Test 8: Cleanup Function
BEGIN;

-- Insert old statistics data
INSERT INTO rsvp_stats (event_id, calculated_at, total_responses) VALUES
('old-event', NOW() - INTERVAL '45 days', 10),
('recent-event', NOW() - INTERVAL '5 days', 15),  
('current-event', NOW(), 20);

-- Test cleanup function
SELECT cleanup_old_rsvp_stats();

-- Should return 1 (one old record deleted)

-- Verify only recent data remains
SELECT COUNT(*) FROM rsvp_stats WHERE calculated_at > NOW() - INTERVAL '30 days';

-- Should return 2

ROLLBACK;

-- Summary of Expected Test Results:
-- Test 1: ✓ Statistics trigger updates counts correctly  
-- Test 2: ✓ Broadcast trigger fires pg_notify
-- Test 3: ✓ RLS policies enforce user isolation
-- Test 4: ✓ Token validation handles expiration
-- Test 5: ✓ Summary function returns correct JSON
-- Test 6: ✓ Concurrent responses handled properly
-- Test 7: ✓ Queries use indexes efficiently (<10ms)
-- Test 8: ✓ Cleanup removes old data correctly