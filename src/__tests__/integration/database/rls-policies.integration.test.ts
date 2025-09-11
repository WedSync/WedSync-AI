import { describe, it, expect, beforeEach } from 'vitest'
import { testSupabase, testCleanup, testDataFactory, integrationHelpers } from '../../../tests/integration/setup'

// WS-092: Database RLS Policy Integration Tests
// Critical for preventing wedding data leaks between clients/planners
describe('Database RLS Policy Integration', () => {
  let plannerUser1: any
  let plannerUser2: any
  let clientUser1: any
  let vendorUser1: any
  let client1Data: any
  let client2Data: any
  beforeEach(async () => {
    // Create test users with different roles
    plannerUser1 = await testCleanup.createTestUser('planner1@wedsync.com', 'planner')
    plannerUser2 = await testCleanup.createTestUser('planner2@wedsync.com', 'planner')
    clientUser1 = await testCleanup.createTestUser('client1@example.com', 'client')
    vendorUser1 = await testCleanup.createTestUser('vendor1@example.com', 'vendor')
    // Create client data for different planners
    client1Data = testDataFactory.createClient({
      email: 'wedding1@example.com',
      planner_id: plannerUser1.id,
    })
    
    client2Data = testDataFactory.createClient({
      email: 'wedding2@example.com',  
      planner_id: plannerUser2.id,
    // Insert test clients
    await testSupabase.from('clients').insert([client1Data, client2Data])
  })
  describe('Client Data Access Control', () => {
    it('should allow planners to only see their own clients', async () => {
      // Authenticate as planner 1
      await testCleanup.authenticateAs('planner1@wedsync.com')
      const { data: clients, error } = await testSupabase
        .from('clients')
        .select('*')
      expect(error).toBeNull()
      expect(clients).toHaveLength(1)
      expect(clients![0].id).toBe(client1Data.id)
      expect(clients![0].planner_id).toBe(plannerUser1.id)
      // Switch to planner 2
      await testCleanup.authenticateAs('planner2@wedsync.com')
      const { data: clients2, error: error2 } = await testSupabase
      expect(error2).toBeNull()
      expect(clients2).toHaveLength(1)
      expect(clients2![0].id).toBe(client2Data.id)
      expect(clients2![0].planner_id).toBe(plannerUser2.id)
    it('should prevent clients from accessing other clients data', async () => {
      // Create client profile for client user
      await testSupabase.from('client_profiles').insert({
        user_id: clientUser1.id,
        client_id: client1Data.id,
      })
      await testCleanup.authenticateAs('client1@example.com')
      // Client should only see their own client record
      // Attempt to access other client's data directly should fail
      const { data: otherClient, error: accessError } = await testSupabase
        .eq('id', client2Data.id)
      expect(otherClient).toHaveLength(0)
    it('should prevent vendors from accessing client management data', async () => {
      await testCleanup.authenticateAs('vendor1@example.com')
      // Vendors should not see any client management data
      expect(clients).toHaveLength(0)
  describe('Journey Data Access Control', () => {
    let journey1: any
    let journey2: any
    beforeEach(async () => {
      journey1 = testDataFactory.createJourney(client1Data.id, {
        planner_id: plannerUser1.id,
      
      journey2 = testDataFactory.createJourney(client2Data.id, {
        planner_id: plannerUser2.id,
      await testSupabase.from('journeys').insert([journey1, journey2])
    it('should enforce journey access based on client ownership', async () => {
      const { data: journeys, error } = await testSupabase
        .from('journeys')
      expect(journeys).toHaveLength(1)
      expect(journeys![0].id).toBe(journey1.id)
      expect(journeys![0].client_id).toBe(client1Data.id)
    it('should prevent cross-planner journey modification', async () => {
      // Attempt to update journey belonging to different planner
      const { data, error } = await testSupabase
        .update({ status: 'completed' })
        .eq('id', journey2.id)
      expect(data).toHaveLength(0) // No rows updated
      // Verify original journey unchanged
      const { data: originalJourney } = await testSupabase
        .select('status')
        
      // This should return empty because of RLS
      expect(originalJourney).toHaveLength(0)
  describe('Communication Data Access Control', () => {
    let communication1: any
    let communication2: any
      communication1 = {
        id: crypto.randomUUID(),
        message: 'Message for client 1',
        type: 'email',
        status: 'sent',
        created_at: new Date().toISOString(),
      }
      communication2 = {
        client_id: client2Data.id,
        message: 'Message for client 2',
        type: 'sms',
      await testSupabase.from('communications').insert([communication1, communication2])
    it('should isolate communication history between planners', async () => {
      const { data: communications, error } = await testSupabase
        .from('communications')
      expect(communications).toHaveLength(1)
      expect(communications![0].id).toBe(communication1.id)
      expect(communications![0].client_id).toBe(client1Data.id)
    it('should prevent clients from seeing other clients communications', async () => {
      // Create client profile association
  describe('Guest Data Access Control', () => {
    let guestList1: any[]
    let guestList2: any[]
      guestList1 = [
        testDataFactory.createGuest(client1Data.id, { 
          email: 'guest1-wedding1@example.com',
          first_name: 'Guest1',
        }),
          email: 'guest2-wedding1@example.com',
          first_name: 'Guest2',
      ]
      guestList2 = [
        testDataFactory.createGuest(client2Data.id, { 
          email: 'guest1-wedding2@example.com',
      await testSupabase.from('guests').insert([...guestList1, ...guestList2])
    it('should enforce guest list privacy between weddings', async () => {
      const { data: guests, error } = await testSupabase
        .from('guests')
      expect(guests).toHaveLength(2)
      const clientIds = guests!.map(g => g.client_id)
      expect(clientIds.every(id => id === client1Data.id)).toBe(true)
    it('should allow clients to see only their guest list', async () => {
      expect(guests!.every(g => g.client_id === client1Data.id)).toBe(true)
  describe('Vendor Portal Access Control', () => {
    let vendor1Profile: any
    let vendor2Profile: any
    let client1VendorAssignment: any
      // Create vendor profiles
      vendor1Profile = {
        user_id: vendorUser1.id,
        business_name: 'Test Vendor 1',
        category: 'photography',
        status: 'verified',
      const vendor2User = await testCleanup.createTestUser('vendor2@example.com', 'vendor')
      vendor2Profile = {
        user_id: vendor2User.id,
        business_name: 'Test Vendor 2', 
        category: 'catering',
      await testSupabase.from('vendor_profiles').insert([vendor1Profile, vendor2Profile])
      // Assign vendor 1 to client 1
      client1VendorAssignment = {
        vendor_id: vendor1Profile.id,
        status: 'active',
      await testSupabase.from('client_vendor_assignments').insert(client1VendorAssignment)
    it('should allow vendors to see only assigned weddings', async () => {
      // Vendor should see clients through assignments
      const { data: assignments, error } = await testSupabase
        .from('client_vendor_assignments')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            wedding_date,
            venue
          )
        `)
      expect(assignments).toHaveLength(1)
      expect(assignments![0].client_id).toBe(client1Data.id)
      expect(assignments![0].clients.id).toBe(client1Data.id)
    it('should prevent vendors from accessing unassigned wedding data', async () => {
      await testCleanup.authenticateAs('vendor2@example.com')
      // Vendor 2 has no assignments, should see no client data
      expect(assignments).toHaveLength(0)
      // Direct client access should also be blocked
      const { data: clients, error: clientError } = await testSupabase
      expect(clientError).toBeNull()
  describe('Payment Data Access Control', () => {
    let payment1: any
    let payment2: any
      payment1 = {
        amount: 5000,
        status: 'completed',
        description: 'Venue deposit',
      payment2 = {
        amount: 7500,
        status: 'pending',
        description: 'Photography payment',
      await testSupabase.from('payments').insert([payment1, payment2])
    it('should protect sensitive payment information', async () => {
      const { data: payments, error } = await testSupabase
        .from('payments')
      expect(payments).toHaveLength(1)
      expect(payments![0].client_id).toBe(client1Data.id)
      expect(payments![0].amount).toBe(5000)
    it('should prevent cross-client payment data leaks', async () => {
      // Should only see payments for their clients
      expect(payments![0].client_id).toBe(client2Data.id)
      // Attempt to access other client's payment directly should fail
      const { data: otherPayment, error: accessError } = await testSupabase
        .eq('id', payment1.id)
      expect(otherPayment).toHaveLength(0)
  describe('Database Transaction Integrity', () => {
    it('should maintain data consistency during complex operations', async () => {
      // Perform complex multi-table operation
      const { data: transaction, error } = await testSupabase
        .rpc('create_wedding_package', {
          client_data: client1Data,
          journey_data: testDataFactory.createJourney(client1Data.id),
          initial_payment: {
            amount: 1000,
            description: 'Initial deposit'
          }
        })
      // Verify all related data was created atomically
      const verifications = await Promise.all([
        integrationHelpers.verifyDatabaseState('clients', { id: client1Data.id }),
        integrationHelpers.verifyDatabaseState('journeys', { client_id: client1Data.id }),
        integrationHelpers.verifyDatabaseState('payments', { client_id: client1Data.id }),
      ])
      verifications.forEach(data => {
        expect(data.length).toBeGreaterThan(0)
    it('should rollback on transaction failure', async () => {
      // Attempt operation that should fail and rollback
        .rpc('create_invalid_wedding_package', {
          client_data: { 
            ...client1Data, 
            email: null // This should cause constraint violation
          },
      expect(error).toBeTruthy()
      // Verify no partial data was committed
      const clientCount = await integrationHelpers.verifyDatabaseState('clients', { 
        first_name: client1Data.first_name 
      expect(clientCount).toHaveLength(1) // Only the original test data should exist
})
