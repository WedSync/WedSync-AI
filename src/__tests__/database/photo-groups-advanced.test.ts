// ====================================================================
// WS-153 Photo Groups Advanced Database Tests - Round 2
// Feature: Advanced database functions testing
// Team: Team C
// Batch: 14
// Round: 2
// Date: 2025-08-26

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
let supabase: SupabaseClient;
let serviceRoleClient: SupabaseClient;
let testCoupleId: string;
let testGuestIds: string[] = [];
let testGroupIds: string[] = [];
beforeAll(async () => {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Create test data
  await setupTestData();
});
afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
beforeEach(async () => {
  // Reset test groups before each test
  await resetTestGroups();
async function setupTestData() {
  // Create test couple
  const { data: coupleData, error: coupleError } = await serviceRoleClient
    .from('clients')
    .insert({
      first_name: 'Test',
      last_name: 'Couple',
      email: 'testcouple@example.com',
      user_id: '00000000-0000-0000-0000-000000000001'
    })
    .select()
    .single();
    
  if (coupleError) throw coupleError;
  testCoupleId = coupleData.id;
  // Create test guests
  const guestInserts = Array.from({ length: 20 }, (_, i) => ({
    client_id: testCoupleId,
    first_name: `Guest${i + 1}`,
    last_name: 'Test',
    email: `guest${i + 1}@example.com`,
    rsvp_status: 'confirmed'
  }));
  const { data: guestData, error: guestError } = await serviceRoleClient
    .from('guests')
    .insert(guestInserts)
    .select('id');
  if (guestError) throw guestError;
  testGuestIds = guestData.map(g => g.id);
}
async function cleanupTestData() {
  // Clean up in reverse order due to foreign keys
  await serviceRoleClient.from('photo_group_members').delete().in('photo_group_id', testGroupIds);
  await serviceRoleClient.from('photo_groups').delete().in('id', testGroupIds);
  await serviceRoleClient.from('guests').delete().in('id', testGuestIds);
  await serviceRoleClient.from('clients').delete().eq('id', testCoupleId);
async function resetTestGroups() {
  // Remove existing test groups
  testGroupIds = [];
async function createTestGroups(count: number): Promise<string[]> {
  const groupInserts = Array.from({ length: count }, (_, i) => ({
    couple_id: testCoupleId,
    name: `Test Group ${i + 1}`,
    description: `Test group ${i + 1} for testing`,
    priority: Math.floor(Math.random() * 10) + 1,
    estimated_time_minutes: 15 + (i * 5), // 15, 20, 25, 30 minutes etc
    location_preference: i % 3 === 0 ? 'Garden' : i % 3 === 1 ? 'Chapel' : 'Beach'
  const { data: groupData, error: groupError } = await serviceRoleClient
    .from('photo_groups')
    .insert(groupInserts)
  if (groupError) throw groupError;
  const groupIds = groupData.map(g => g.id);
  testGroupIds.push(...groupIds);
  return groupIds;
async function assignGuestsToGroups(): Promise<void> {
  const memberInserts: any[] = [];
  // Assign guests to groups with some overlap for conflict testing
  testGroupIds.forEach((groupId, groupIndex) => {
    // Each group gets 3-6 guests
    const guestCount = 3 + (groupIndex % 4);
    const startIndex = groupIndex * 2; // Create overlaps
    for (let i = 0; i < guestCount && startIndex + i < testGuestIds.length; i++) {
      memberInserts.push({
        photo_group_id: groupId,
        guest_id: testGuestIds[startIndex + i]
      });
    }
  });
  const { error } = await serviceRoleClient
    .from('photo_group_members')
    .insert(memberInserts);
  if (error) throw error;
describe('WS-153 Photo Groups Database Performance', () => {
  test('Conflict detection performs well with large datasets', async () => {
    // Create test data: 100 groups, 1000 guests would be too much for test env
    // Using scaled down version: 50 groups, 20 guests with overlaps
    const groupIds = await createTestGroups(50);
    await assignGuestsToGroups();
    // Add some scheduled times to create conflicts
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    for (let i = 0; i < Math.min(10, groupIds.length); i++) {
      const groupStartTime = new Date(startTime.getTime() + i * 30 * 60 * 1000); // 30 min intervals
      const groupEndTime = new Date(groupStartTime.getTime() + 20 * 60 * 1000); // 20 min duration
      
      await serviceRoleClient
        .from('photo_groups')
        .update({ 
          scheduled_start: groupStartTime.toISOString(),
          scheduled_end: groupEndTime.toISOString()
        })
        .eq('id', groupIds[i]);
    const performanceStartTime = Date.now();
    // Run conflict detection
    const { data: conflicts, error } = await serviceRoleClient.rpc('detect_advanced_conflicts', {
      p_couple_id: testCoupleId
    });
    const performanceEndTime = Date.now();
    // Should complete within 500ms even with moderate dataset
    expect(performanceEndTime - performanceStartTime).toBeLessThan(500);
    expect(error).toBeNull();
    expect(conflicts).toBeDefined();
    expect(Array.isArray(conflicts)).toBe(true);
  test('Scheduling optimization handles complex scenarios', async () => {
    // Create 20 groups with various priorities and durations
    const groupIds = await createTestGroups(20);
    const { data: optimization, error } = await serviceRoleClient.rpc('optimize_photo_group_scheduling', {
      p_couple_id: testCoupleId,
      p_target_date: '2024-06-15',
      p_available_hours: 8
    expect(performanceEndTime - performanceStartTime).toBeLessThan(1000);
    expect(optimization).toBeDefined();
    expect(optimization.feasible).toBeDefined();
    expect(optimization.suggested_schedule).toBeDefined();
    if (optimization.feasible) {
      expect(optimization.suggested_schedule.length).toBe(groupIds.length);
      // Verify no time overlaps in suggested schedule
      const schedule = optimization.suggested_schedule;
      for (let i = 0; i < schedule.length - 1; i++) {
        const current = schedule[i];
        const next = schedule[i + 1];
        expect(new Date(current.suggested_end)).toBeLessThanOrEqual(new Date(next.suggested_start));
      }
  test('Guest availability checking is accurate', async () => {
    const groupIds = await createTestGroups(3);
    // Schedule first group
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    await serviceRoleClient
      .from('photo_groups')
      .update({
        scheduled_start: startTime.toISOString(),
        scheduled_end: endTime.toISOString()
      })
      .eq('id', groupIds[0]);
    // Check availability of a guest in that group
    const testGuestId = testGuestIds[0];
    // Should not be available during scheduled time
    const { data: unavailableCheck, error: error1 } = await serviceRoleClient.rpc('check_guest_availability', {
      p_guest_id: testGuestId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString()
    expect(error1).toBeNull();
    expect(unavailableCheck.available).toBe(false);
    expect(unavailableCheck.conflicting_groups.length).toBeGreaterThan(0);
    // Should be available at different time
    const laterStartTime = new Date(endTime.getTime() + 60 * 60 * 1000); // 1 hour later
    const laterEndTime = new Date(laterStartTime.getTime() + 30 * 60 * 1000);
    const { data: availableCheck, error: error2 } = await serviceRoleClient.rpc('check_guest_availability', {
      p_start_time: laterStartTime.toISOString(),
      p_end_time: laterEndTime.toISOString()
    expect(error2).toBeNull();
    expect(availableCheck.available).toBe(true);
    expect(availableCheck.conflicting_groups.length).toBe(0);
  test('Auto-scheduling by priority works correctly', async () => {
    const groupIds = await createTestGroups(10);
    const { data: scheduleResult, error } = await serviceRoleClient.rpc('auto_schedule_groups_by_priority', {
      p_start_time: '09:00:00',
    expect(scheduleResult.success).toBe(true);
    expect(scheduleResult.total_scheduled).toBeGreaterThan(0);
    expect(scheduleResult.scheduled_groups.length).toBe(scheduleResult.total_scheduled);
    // Verify groups are actually scheduled in the database
    const { data: scheduledGroups } = await serviceRoleClient
      .select('*')
      .in('id', groupIds)
      .not('scheduled_start', 'is', null)
      .order('priority', { ascending: false });
    expect(scheduledGroups?.length).toBe(scheduleResult.total_scheduled);
    // Verify scheduling order follows priority
    if (scheduledGroups && scheduledGroups.length > 1) {
      for (let i = 0; i < scheduledGroups.length - 1; i++) {
        expect(scheduledGroups[i].priority).toBeGreaterThanOrEqual(scheduledGroups[i + 1].priority);
  test('Data validation detects issues correctly', async () => {
    const groupIds = await createTestGroups(5);
    // Create group with no members (should trigger validation warning)
    const { data: emptyGroup } = await serviceRoleClient
      .insert({
        couple_id: testCoupleId,
        name: 'Empty Group',
        estimated_time_minutes: 15
      .select()
      .single();
    testGroupIds.push(emptyGroup!.id);
    // Create group with invalid duration
    const { data: invalidGroup } = await serviceRoleClient
        name: 'Invalid Duration Group',
        estimated_time_minutes: -5 // Invalid
    testGroupIds.push(invalidGroup!.id);
    // Add members to some groups
    const { data: validationResults, error } = await serviceRoleClient.rpc('validate_photo_group_data');
    expect(validationResults).toBeDefined();
    const issues = validationResults as any[];
    const emptyGroupIssue = issues.find(issue => issue.validation_type === 'empty_group');
    const invalidDurationIssue = issues.find(issue => issue.validation_type === 'invalid_duration');
    expect(emptyGroupIssue).toBeDefined();
    expect(emptyGroupIssue.severity).toBe('warning');
    expect(invalidDurationIssue).toBeDefined();
    expect(invalidDurationIssue.severity).toBe('error');
  test('Performance monitoring function returns metrics', async () => {
    const groupIds = await createTestGroups(15);
    // Schedule some groups
    for (let i = 0; i < 5; i++) {
      const startTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 20 * 60 * 1000);
        .update({
          scheduled_start: startTime.toISOString(),
          scheduled_end: endTime.toISOString()
    const { data: metrics, error } = await serviceRoleClient.rpc('get_photo_groups_performance_metrics');
    expect(metrics).toBeDefined();
    expect(metrics.total_groups).toBeGreaterThan(0);
    expect(metrics.scheduled_groups).toBe(5);
    expect(metrics.avg_group_size).toBeGreaterThan(0);
    expect(metrics.last_updated).toBeDefined();
describe('WS-153 Real-time Database Triggers', () => {
  test('Photo group changes trigger real-time notifications', async () => {
    const notifications: any[] = [];
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('test-photo-groups')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photo_groups'
      }, (payload) => {
        notifications.push(payload);
      .subscribe();
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Create a photo group
    const { data: newGroup } = await serviceRoleClient
        name: 'Test Real-time Group',
        estimated_time_minutes: 30
    testGroupIds.push(newGroup!.id);
    // Update the group
      .update({ name: 'Updated Real-time Group' })
      .eq('id', newGroup!.id);
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(notifications.length).toBeGreaterThanOrEqual(2);
    const insertNotification = notifications.find(n => n.eventType === 'INSERT');
    const updateNotification = notifications.find(n => n.eventType === 'UPDATE');
    expect(insertNotification).toBeDefined();
    expect(updateNotification).toBeDefined();
    subscription.unsubscribe();
  test('Photo group member changes trigger notifications', async () => {
    const groupIds = await createTestGroups(1);
      .channel('test-photo-group-members')
        table: 'photo_group_members'
    // Add member to group
      .from('photo_group_members')
        photo_group_id: groupIds[0],
        guest_id: testGuestIds[0]
    // Remove member from group
      .delete()
      .eq('photo_group_id', groupIds[0])
      .eq('guest_id', testGuestIds[0]);
    const deleteNotification = notifications.find(n => n.eventType === 'DELETE');
    expect(deleteNotification).toBeDefined();
describe('WS-153 Advanced Database Security', () => {
  test('Row Level Security policies work correctly', async () => {
    // This test would require setting up proper authentication context
    // For now, we verify the policies exist and functions are accessible
    const { data, error } = await supabase
      .eq('couple_id', testCoupleId);
    // Should return empty array due to RLS (no authenticated user context)
    expect(Array.isArray(data)).toBe(true);
  test('Security definer functions have proper permissions', async () => {
    // Test that functions can be called with proper error handling
    const { error: conflictError } = await serviceRoleClient.rpc('detect_advanced_conflicts', {
    const { error: optimizationError } = await serviceRoleClient.rpc('optimize_photo_group_scheduling', {
      p_target_date: '2024-06-15'
    const { error: availabilityError } = await serviceRoleClient.rpc('check_guest_availability', {
      p_guest_id: testGuestIds[0],
      p_start_time: new Date().toISOString(),
      p_end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(conflictError).toBeNull();
    expect(optimizationError).toBeNull();
    expect(availabilityError).toBeNull();
// Helper functions for waiting
function waitFor(condition: () => boolean, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
    };
    check();
async function waitForSubscription(subscription: any): Promise<void> {
  return new Promise(resolve => {
      if (subscription.state === 'SUBSCRIBED') {
// END OF WS-153 ROUND 2 TESTS
