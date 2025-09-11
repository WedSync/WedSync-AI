import { describe, it, expect, beforeEach } from 'vitest'
import { testSupabase, testCleanup, testDataFactory, integrationHelpers } from '../../../../tests/integration/setup'

// WS-092: Client Journey Integration Workflow Tests
// Critical for preventing wedding planning workflow failures
// Tests complete client onboarding → journey assignment → communication flows
describe('Client Journey Integration Workflows', () => {
  let plannerUser: any
  let clientData: any
  let authenticatedSession: any
  beforeEach(async () => {
    // Create authenticated planner context
    const authContext = await integrationHelpers.createAuthenticatedContext('workflow-planner@wedsync.com')
    plannerUser = authContext.user
    authenticatedSession = authContext.session
    // Create test client
    clientData = testDataFactory.createClient({
      email: 'workflow-client@example.com',
      planner_id: plannerUser.id,
      wedding_date: '2025-09-15',
      venue: 'Sunset Gardens',
      guest_count: 125,
    })
  })
  describe('Complete Client Onboarding Workflow', () => {
    it('should create client → assign journey → send welcome communication', async () => {
      // Step 1: Create client
      const { data: createdClient, error: clientError } = await testSupabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()
      expect(clientError).toBeNull()
      expect(createdClient).toMatchObject({
        email: clientData.email,
        status: 'active',
        planner_id: plannerUser.id,
      })
      // Step 2: Auto-assign default journey
      const journeyData = testDataFactory.createJourney(createdClient.id, {
        name: 'Wedding Planning Journey 2025',
      const { data: journey, error: journeyError } = await testSupabase
        .from('journeys')
        .insert(journeyData)
      expect(journeyError).toBeNull()
      expect(journey.client_id).toBe(createdClient.id)
      // Step 3: Trigger welcome communication
      const welcomeComm = {
        id: crypto.randomUUID(),
        client_id: createdClient.id,
        type: 'email',
        status: 'sent',
        subject: 'Welcome to Your Wedding Planning Journey!',
        message: `Dear ${createdClient.first_name}, welcome to WedSync! Your wedding on ${createdClient.wedding_date} at ${createdClient.venue} is going to be amazing.`,
        created_at: new Date().toISOString(),
      }
      const { data: communication, error: commError } = await testSupabase
        .from('communications')
        .insert(welcomeComm)
      expect(commError).toBeNull()
      expect(communication).toMatchObject({
      // Verify complete workflow state
      const workflowState = await Promise.all([
        integrationHelpers.verifyDatabaseState('clients', { id: createdClient.id }),
        integrationHelpers.verifyDatabaseState('journeys', { client_id: createdClient.id }),
        integrationHelpers.verifyDatabaseState('communications', { client_id: createdClient.id }),
      ])
      expect(workflowState[0]).toHaveLength(1) // Client created
      expect(workflowState[1]).toHaveLength(1) // Journey assigned
      expect(workflowState[2]).toHaveLength(1) // Communication sent
    it('should handle journey step progression workflow', async () => {
      // Create client and journey
      const { data: client } = await testSupabase
      const journeyData = testDataFactory.createJourney(client.id, {
        steps: [
          { id: 1, name: 'Initial Consultation', status: 'pending', due_date: '2025-03-01' },
          { id: 2, name: 'Venue Selection', status: 'pending', due_date: '2025-03-15' },
          { id: 3, name: 'Vendor Booking', status: 'pending', due_date: '2025-04-01' },
        ],
      const { data: journey } = await testSupabase
      // Complete first step
      const updatedSteps = journey.steps.map((step: any) =>
        step.id === 1 ? { ...step, status: 'completed', completed_at: new Date().toISOString() } : step
      )
      const { data: updatedJourney, error: updateError } = await testSupabase
        .update({
          steps: updatedSteps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', journey.id)
      expect(updateError).toBeNull()
      // Verify step completion triggered next step activation
      const firstStep = updatedJourney.steps.find((s: any) => s.id === 1)
      const secondStep = updatedJourney.steps.find((s: any) => s.id === 2)
      expect(firstStep.status).toBe('completed')
      expect(firstStep.completed_at).toBeTruthy()
      // Verify communication was triggered for step completion
      const stepComm = {
        client_id: client.id,
        subject: 'Journey Step Completed - Next Steps',
        message: 'Your Initial Consultation has been completed. Next up: Venue Selection!',
        journey_step_id: 1,
      const { data: communication } = await testSupabase
        .insert(stepComm)
      expect(communication.journey_step_id).toBe(1)
      expect(communication.client_id).toBe(client.id)
  describe('Vendor Booking Integration Workflow', () => {
    it('should complete vendor booking → payment setup → communication flow', async () => {
      // Setup client and vendor
      const vendorData = testDataFactory.createVendor({
        business_name: 'Elite Photography Studio',
        category: 'photography',
        contact_email: 'booking@elitephoto.com',
      const { data: vendor } = await testSupabase
        .from('vendors')
        .insert(vendorData)
      // Step 1: Create vendor assignment
      const assignment = {
        vendor_id: vendor.id,
        service_date: client.wedding_date,
        contract_amount: 3500,
      const { data: vendorAssignment, error: assignError } = await testSupabase
        .from('client_vendor_assignments')
        .insert(assignment)
      expect(assignError).toBeNull()
      // Step 2: Create payment schedule
      const paymentSchedule = [
        {
          id: crypto.randomUUID(),
          client_id: client.id,
          vendor_assignment_id: vendorAssignment.id,
          amount: 1000,
          due_date: '2025-04-01',
          description: 'Photography booking deposit',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
          amount: 2500,
          due_date: client.wedding_date,
          description: 'Photography final payment',
          status: 'scheduled',
      ]
      const { data: payments, error: paymentError } = await testSupabase
        .from('payments')
        .insert(paymentSchedule)
      expect(paymentError).toBeNull()
      expect(payments).toHaveLength(2)
      // Step 3: Send vendor confirmation communication
      const vendorComm = {
        subject: 'Vendor Booking Confirmed - Elite Photography Studio',
        message: `Great news! ${vendor.business_name} has been booked for your wedding on ${client.wedding_date}. Your deposit of $${paymentSchedule[0].amount} is due by ${paymentSchedule[0].due_date}.`,
        .insert(vendorComm)
      // Verify complete vendor booking workflow
      const workflowVerification = await Promise.all([
        integrationHelpers.verifyDatabaseState('client_vendor_assignments', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('payments', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('communications', { client_id: client.id, vendor_id: vendor.id }),
      expect(workflowVerification[0]).toHaveLength(1) // Vendor assigned
      expect(workflowVerification[1]).toHaveLength(2) // Payment schedule created
      expect(workflowVerification[2]).toHaveLength(1) // Confirmation sent
      // Verify payment amounts total the contract
      const totalPayments = workflowVerification[1].reduce((sum: number, payment: any) => sum + payment.amount, 0)
      expect(totalPayments).toBe(assignment.contract_amount)
  describe('Guest List Integration Workflow', () => {
    it('should complete guest import → RSVP setup → communication flow', async () => {
      // Setup client
      // Step 1: Import guest list
      const guestList = [
        testDataFactory.createGuest(client.id, {
          first_name: 'Alice',
          last_name: 'Johnson',
          email: 'alice@example.com',
          relationship: 'bride_family',
        }),
          first_name: 'Bob',
          last_name: 'Wilson',
          email: 'bob@example.com',
          relationship: 'groom_family',
          plus_one: true,
          first_name: 'Carol',
          last_name: 'Davis',
          email: 'carol@example.com',
          relationship: 'friend',
          dietary_restrictions: ['vegetarian'],
      const { data: guests, error: guestError } = await testSupabase
        .from('guests')
        .insert(guestList)
      expect(guestError).toBeNull()
      expect(guests).toHaveLength(3)
      // Step 2: Create RSVP invitations
      const rsvpInvitations = guests.map((guest: any) => ({
        guest_id: guest.id,
        status: 'pending',
        invitation_sent_at: new Date().toISOString(),
        rsvp_deadline: '2025-08-01',
      }))
      const { data: rsvps, error: rsvpError } = await testSupabase
        .from('rsvps')
        .insert(rsvpInvitations)
      expect(rsvpError).toBeNull()
      expect(rsvps).toHaveLength(3)
      // Step 3: Send RSVP invitation communications
      const inviteComm = guests.map((guest: any) => ({
        subject: `You're Invited! ${client.first_name} & ${client.partner_first_name}'s Wedding`,
        message: `Dear ${guest.first_name}, you're invited to our wedding on ${client.wedding_date} at ${client.venue}. Please RSVP by August 1st!`,
      const { data: communications, error: commError } = await testSupabase
        .insert(inviteComm)
      expect(communications).toHaveLength(3)
      // Step 4: Simulate guest responses
      const guestResponse = rsvps[0]
      const { data: updatedRsvp } = await testSupabase
          status: 'accepted',
          response_date: new Date().toISOString(),
          guest_count: guestResponse.guest_id === guests.find((g: any) => g.plus_one)?.id ? 2 : 1,
          dietary_notes: 'No allergies',
        .eq('id', guestResponse.id)
      expect(updatedRsvp.status).toBe('accepted')
      // Verify complete guest workflow
        integrationHelpers.verifyDatabaseState('guests', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('rsvps', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('communications', { client_id: client.id, guest_id: guests[0].id }),
      expect(workflowState[0]).toHaveLength(3) // All guests imported
      expect(workflowState[1]).toHaveLength(3) // All RSVPs created
  describe('Timeline Integration Workflow', () => {
    it('should create timeline → add tasks → assign vendors → track progress', async () => {
        business_name: 'Elegant Flowers & Decor',
        category: 'florist',
      // Step 1: Create wedding timeline
      const timelineItems = [
          title: 'Venue Setup',
          description: 'Decorate ceremony and reception venues',
          scheduled_date: client.wedding_date,
          start_time: '14:00',
          duration_minutes: 180,
          title: 'Floral Arrangement Delivery',
          description: 'Deliver and set up all floral arrangements',
          start_time: '13:00',
          duration_minutes: 120,
          assigned_vendor_id: vendor.id,
          status: 'assigned',
      const { data: timeline, error: timelineError } = await testSupabase
        .from('timeline_items')
        .insert(timelineItems)
      expect(timelineError).toBeNull()
      expect(timeline).toHaveLength(2)
      // Step 2: Create associated tasks
      const tasks = [
          timeline_item_id: timeline[0].id,
          title: 'Confirm table arrangements',
          description: 'Finalize seating chart and table decorations',
          due_date: '2025-09-10',
          priority: 'high',
          timeline_item_id: timeline[1].id,
          title: 'Prepare bridal bouquet',
          description: 'Create custom bridal bouquet with white roses and baby\'s breath',
          due_date: '2025-09-14',
          priority: 'critical',
      const { data: createdTasks, error: taskError } = await testSupabase
        .from('tasks')
        .insert(tasks)
      expect(taskError).toBeNull()
      expect(createdTasks).toHaveLength(2)
      // Step 3: Update task progress
      const { data: updatedTask } = await testSupabase
          status: 'in_progress',
          progress_notes: 'Bouquet design approved, sourcing flowers',
        .eq('id', createdTasks[1].id)
      expect(updatedTask.status).toBe('in_progress')
      // Step 4: Send progress notification
      const progressComm = {
        task_id: updatedTask.id,
        subject: 'Wedding Task Update - Bridal Bouquet Progress',
        message: `Update on your bridal bouquet: ${updatedTask.progress_notes}. Expected completion: ${updatedTask.due_date}.`,
        .insert(progressComm)
      // Verify complete timeline workflow
        integrationHelpers.verifyDatabaseState('timeline_items', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('tasks', { client_id: client.id }),
        integrationHelpers.verifyDatabaseState('communications', { client_id: client.id, task_id: updatedTask.id }),
      expect(workflowVerification[0]).toHaveLength(2) // Timeline items created
      expect(workflowVerification[1]).toHaveLength(2) // Tasks created
      expect(workflowVerification[2]).toHaveLength(1) // Progress communication sent
      // Verify vendor assignment connectivity
      const vendorTask = workflowVerification[1].find((task: any) => task.assigned_vendor_id === vendor.id)
      expect(vendorTask).toBeTruthy()
      expect(vendorTask.status).toBe('in_progress')
  describe('Cross-Team Integration Workflows', () => {
    it('should handle planner → client → vendor communication chain', async () => {
      // Setup multi-user context
      const clientUser = await testCleanup.createTestUser('client-user@example.com', 'client')
      const vendorUser = await testCleanup.createTestUser('vendor-user@example.com', 'vendor')
      // Create client profile link
      await testSupabase.from('client_profiles').insert({
        user_id: clientUser.id,
        user_id: vendorUser.id,
        business_name: 'Premium Catering Co',
        category: 'catering',
      // Step 1: Planner initiates vendor inquiry
      const plannerToVendor = {
        subject: 'Catering Inquiry - September Wedding',
        message: `Hi ${vendor.contact_name}, we have a wedding on ${client.wedding_date} for ${client.guest_count} guests. Are you available?`,
      const { data: comm1 } = await testSupabase
        .insert(plannerToVendor)
      // Step 2: Vendor responds to planner
      const vendorToPlanner = {
        subject: 'Re: Catering Inquiry - September Wedding',
        message: 'Yes, we are available! Our package for 125 guests would be $4,500. Would you like to schedule a tasting?',
        parent_communication_id: comm1.id,
      const { data: comm2 } = await testSupabase
        .insert(vendorToPlanner)
      // Step 3: Planner forwards to client
      const plannerToClient = {
        subject: 'Catering Quote - Premium Catering Co',
        message: `Great news! Premium Catering Co is available for your wedding. They quoted $4,500 for 125 guests. They're offering a tasting - would you like me to schedule one?`,
        parent_communication_id: comm2.id,
      const { data: comm3 } = await testSupabase
        .insert(plannerToClient)
      // Verify communication chain integrity
      const communicationChain = await integrationHelpers.verifyDatabaseState('communications', {
        client_id: client.id
      expect(communicationChain).toHaveLength(3)
      
      // Verify chain links
      const plannerInitial = communicationChain.find((c: any) => c.id === comm1.id)
      const vendorResponse = communicationChain.find((c: any) => c.id === comm2.id)
      const clientForward = communicationChain.find((c: any) => c.id === comm3.id)
      expect(vendorResponse.parent_communication_id).toBe(plannerInitial.id)
      expect(clientForward.parent_communication_id).toBe(vendorResponse.id)
      // Verify all parties are correctly referenced
      expect(plannerInitial.planner_id).toBe(plannerUser.id)
      expect(vendorResponse.vendor_id).toBe(vendor.id)
      expect(clientForward.client_id).toBe(client.id)
})
