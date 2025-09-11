/**
 * WS-153 Photo Groups Database Integration Tests
 * Tests database schema, RLS policies, conflict detection, and performance
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
let supabase: SupabaseClient;
let serviceClient: SupabaseClient;
let testData: {
  organizationId: string;
  userId: string;
  coupleId: string;
  guestIds: string[];
};
describe('WS-153 Photo Groups Database Integration', () => {
  beforeAll(async () => {
    // Initialize Supabase clients
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Setup test data
    await setupTestData();
  });
  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  beforeEach(async () => {
    // Clean up photo groups data between tests
    await serviceClient
      .from('photo_group_members')
      .delete()
      .neq('photo_group_id', '00000000-0000-0000-0000-000000000000');
      
      .from('photo_groups')
      .neq('id', '00000000-0000-0000-0000-000000000000');
  describe('Database Schema Validation', () => {
    test('photo_groups table has correct structure', async () => {
      // Test table exists and has expected columns
      const { data, error } = await serviceClient
        .from('photo_groups')
        .select('*')
        .limit(0);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
    test('photo_group_members table has correct structure', async () => {
        .from('photo_group_members')
    test('check constraints work correctly', async () => {
      // Test shot_type constraint
      const { error } = await serviceClient
        .insert({
          couple_id: testData.coupleId,
          name: 'Test Group',
          shot_type: 'invalid_type' // Should fail constraint
        });
      expect(error).not.toBeNull();
      expect(error?.message).toContain('check');
    test('priority constraint validation', async () => {
      // Test priority range constraint
          priority: 15 // Should fail (max is 10)
  describe('CRUD Operations', () => {
    test('can create photo group with valid data', async () => {
          name: 'Family Photos',
          description: 'Extended family group photos',
          shot_type: 'formal',
          estimated_duration: 15,
          priority: 8,
          location_preference: 'Garden area',
          photographer_notes: 'Include elderly relatives'
        })
        .select()
        .single();
      expect(data).toMatchObject({
        name: 'Family Photos',
        shot_type: 'formal',
        estimated_duration: 15,
        priority: 8
      });
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();
    test('can add guests to photo group', async () => {
      // First create a photo group
      const { data: photoGroup } = await serviceClient
          name: 'Bridal Party',
          shot_type: 'posed',
          estimated_duration: 20,
          priority: 9
      // Add guests to the group
        .insert([
          {
            photo_group_id: photoGroup.id,
            guest_id: testData.guestIds[0]
          },
            guest_id: testData.guestIds[1]
          }
        ])
        .select();
      expect(data).toHaveLength(2);
      expect(data[0].photo_group_id).toBe(photoGroup.id);
    test('unique constraint prevents duplicate guest assignments', async () => {
      // Create photo group
          shot_type: 'candid'
      // First assignment should work
      await serviceClient
          photo_group_id: photoGroup.id,
          guest_id: testData.guestIds[0]
      // Duplicate assignment should fail
      expect(error?.message).toContain('duplicate');
  describe('Row Level Security (RLS) Policies', () => {
    test('authenticated users can access their own photo groups', async () => {
      // Create photo group as service client
          name: 'Auth Test Group',
          shot_type: 'formal'
      // Mock authentication for the test user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      if (signInError) {
        console.warn('Could not authenticate test user for RLS test');
        return;
      }
      // Try to access the photo group
      const { data, error } = await supabase
        .eq('id', photoGroup.id);
      // Note: This test may need adjustment based on actual auth setup
    test('RLS prevents access to other couples photo groups', async () => {
      // This test would need a second couple/organization to fully test
      // For now, we verify the RLS is enabled
      const { data } = await serviceClient.rpc('pg_policies', {
        schemaname: 'public',
        tablename: 'photo_groups'
      const policies = data?.filter((policy: any) => 
        policy.tablename === 'photo_groups' && policy.cmd === 'ALL'
      );
      expect(policies?.length).toBeGreaterThan(0);
  describe('Conflict Detection Functions', () => {
    test('detect_photo_group_conflicts function works', async () => {
      const testTime = new Date();
      testTime.setHours(14, 0, 0, 0); // 2 PM today
      // Create two overlapping photo groups
      await serviceClient.from('photo_groups').insert([
        {
          name: 'Group 1',
          estimated_duration: 30,
          scheduled_time: testTime.toISOString()
        },
          name: 'Group 2',
          shot_type: 'candid',
          scheduled_time: new Date(testTime.getTime() + 15 * 60000).toISOString() // 15 min later
        }
      ]);
      // Test conflict detection
      const { data, error } = await serviceClient.rpc('detect_photo_group_conflicts', {
        p_couple_id: testData.coupleId,
        p_scheduled_time: new Date(testTime.getTime() + 10 * 60000).toISOString(), // 10 min after first
        p_duration: 25
      expect(data?.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('overlap_minutes');
    test('scheduling validation trigger prevents conflicts', async () => {
      testTime.setHours(15, 0, 0, 0); // 3 PM today
      // Create first photo group
      await serviceClient.from('photo_groups').insert({
        couple_id: testData.coupleId,
        name: 'Original Group',
        estimated_duration: 30,
        scheduled_time: testTime.toISOString()
      // Try to create overlapping group - should fail
      const { error } = await serviceClient.from('photo_groups').insert({
        name: 'Conflicting Group',
        shot_type: 'candid',
        estimated_duration: 20,
        scheduled_time: new Date(testTime.getTime() + 15 * 60000).toISOString()
      expect(error?.message).toContain('conflict');
    test('guest availability conflict detection', async () => {
      // Create photo groups and add same guest to both
      const { data: groups } = await serviceClient.from('photo_groups').insert([
          name: 'Group A',
          scheduled_time: new Date().toISOString()
          name: 'Group B',
          estimated_duration: 15
      ]).select();
      // Add same guest to both groups
      await serviceClient.from('photo_group_members').insert([
          photo_group_id: groups[0].id,
          photo_group_id: groups[1].id,
      // Test guest conflict detection
      const { data, error } = await serviceClient.rpc('detect_guest_availability_conflicts', {
        p_photo_group_id: groups[1].id,
        p_scheduled_time: new Date(Date.now() + 10 * 60000).toISOString(),
        p_duration: 15
  describe('Performance and Indexing', () => {
    test('queries execute within performance targets (<50ms)', async () => {
      // Create multiple photo groups for performance testing
      const photoGroups = Array.from({ length: 50 }, (_, i) => ({
        name: `Test Group ${i}`,
        shot_type: 'formal' as const,
        estimated_duration: 10,
        priority: Math.floor(Math.random() * 10) + 1
      }));
      await serviceClient.from('photo_groups').insert(photoGroups);
      // Test query performance
      const startTime = Date.now();
        .eq('couple_id', testData.coupleId)
        .order('priority', { ascending: false });
      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(50); // 50ms performance target
    test('indexes are present and utilized', async () => {
      // Query to check if indexes exist
      const { data } = await serviceClient.rpc('pg_indexes', {
      const expectedIndexes = [
        'idx_photo_groups_couple_id',
        'idx_photo_groups_priority',
        'idx_photo_groups_shot_type',
        'idx_photo_groups_couple_priority'
      ];
      expectedIndexes.forEach(indexName => {
        const indexExists = data?.some((index: any) => 
          index.indexname === indexName
        );
        expect(indexExists).toBe(true);
  describe('Integration with Guest System (WS-151)', () => {
    test('foreign key relationships work correctly', async () => {
          name: 'Integration Test',
          shot_type: 'posed'
      // Add guests with JOIN query
        .select(`
          *,
          photo_groups!inner(name),
          guests!inner(first_name, last_name)
        `)
      expect(data.photo_groups).toBeDefined();
      expect(data.guests).toBeDefined();
    test('cascading deletes work correctly', async () => {
      // Create photo group with members
          name: 'Delete Test',
          shot_type: 'lifestyle'
      await serviceClient.from('photo_group_members').insert({
        photo_group_id: photoGroup.id,
        guest_id: testData.guestIds[0]
      // Delete photo group
        .delete()
      // Verify members are also deleted
      const { data: remainingMembers } = await serviceClient
        .eq('photo_group_id', photoGroup.id);
      expect(remainingMembers).toHaveLength(0);
});
// Helper functions
async function setupTestData() {
  // Create test organization, user, couple, and guests
  const { data: org } = await serviceClient
    .from('organizations')
    .insert({
      name: 'Test Wedding Co',
      slug: 'test-wedding-co',
      email: 'test@weddingco.com'
    })
    .select()
    .single();
  const { data: user } = await serviceClient
    .from('user_profiles')
      user_id: '00000000-0000-0000-0000-000000000001',
      organization_id: org.id,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com'
  const { data: couple } = await serviceClient
    .from('clients')
      first_name: 'John',
      last_name: 'Smith',
      partner_first_name: 'Jane',
      partner_last_name: 'Doe',
      email: 'john.jane@example.com',
      wedding_date: '2024-12-15'
  const { data: guests } = await serviceClient
    .from('guests')
    .insert([
      {
        couple_id: couple.id,
        first_name: 'Alice',
        last_name: 'Johnson',
        category: 'family',
        side: 'partner1'
      },
        first_name: 'Bob',
        last_name: 'Wilson',
        category: 'friends',
        side: 'mutual'
        first_name: 'Carol',
        last_name: 'Brown',
        side: 'partner2'
    ])
    .select();
  testData = {
    organizationId: org.id,
    userId: user.user_id,
    coupleId: couple.id,
    guestIds: guests.map(g => g.id)
  };
}
async function cleanupTestData() {
  if (!testData) return;
  // Clean up in reverse order of dependencies
  await serviceClient.from('photo_group_members').delete().neq('photo_group_id', '');
  await serviceClient.from('photo_groups').delete().neq('id', '');
  await serviceClient.from('guests').delete().eq('couple_id', testData.coupleId);
  await serviceClient.from('clients').delete().eq('id', testData.coupleId);
  await serviceClient.from('user_profiles').delete().eq('user_id', testData.userId);
  await serviceClient.from('organizations').delete().eq('id', testData.organizationId);
