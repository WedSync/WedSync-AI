import { describe, it, expect, beforeEach } from 'vitest'
import { testSupabase, testCleanup, testDataFactory, integrationHelpers } from '../../../../tests/integration/setup'

// WS-092: Vendor Portal Integration Workflow Tests
// Critical for vendor collaboration and task completion workflows
// Tests vendor dashboard → task management → communication → payment flows
describe('Vendor Portal Integration Workflows', () => {
  let plannerUser: any
  let vendorUser: any
  let clientData: any
  let vendorData: any
  let vendorAssignment: any
  beforeEach(async () => {
    // Create test users
    const plannerAuth = await integrationHelpers.createAuthenticatedContext('vendor-workflow-planner@wedsync.com')
    plannerUser = plannerAuth.user
    vendorUser = await testCleanup.createTestUser('vendor-workflow@wedsync.com', 'vendor')
    // Create client and vendor
    clientData = testDataFactory.createClient({
      email: 'vendor-workflow-client@example.com',
      planner_id: plannerUser.id,
      wedding_date: '2025-10-12',
      venue: 'Riverside Manor',
      guest_count: 140,
    })
    const { data: client } = await testSupabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()
    clientData = client
    vendorData = testDataFactory.createVendor({
      user_id: vendorUser.id,
      business_name: 'Artisan Wedding Cakes',
      category: 'catering',
      contact_email: 'orders@artisancakes.com',
      services: ['wedding cakes', 'dessert tables', 'cake tastings'],
    const { data: vendor } = await testSupabase
      .from('vendors')
      .insert(vendorData)
    vendorData = vendor
    // Create vendor assignment
    vendorAssignment = {
      id: crypto.randomUUID(),
      client_id: clientData.id,
      vendor_id: vendorData.id,
      status: 'active',
      service_date: clientData.wedding_date,
      contract_amount: 2800,
      service_details: {
        tier: '3-tier custom cake',
        flavors: ['vanilla', 'chocolate', 'strawberry'],
        servings: 140,
        delivery_time: '15:00',
      },
      created_at: new Date().toISOString(),
    }
    await testSupabase.from('client_vendor_assignments').insert(vendorAssignment)
  })
  describe('Vendor Dashboard Access Workflow', () => {
    it('should allow vendor to access assigned weddings and tasks', async () => {
      // Authenticate as vendor
      await testCleanup.authenticateAs('vendor-workflow@wedsync.com')
      // Vendor should see their assignments
      const { data: assignments, error } = await testSupabase
        .from('client_vendor_assignments')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            partner_first_name,
            partner_last_name,
            wedding_date,
            venue,
            guest_count
          )
        `)
      expect(error).toBeNull()
      expect(assignments).toHaveLength(1)
      expect(assignments![0].vendor_id).toBe(vendorData.id)
      expect(assignments![0].clients.id).toBe(clientData.id)
      // Create vendor tasks
      const vendorTasks = [
        {
          id: crypto.randomUUID(),
          client_id: clientData.id,
          assigned_vendor_id: vendorData.id,
          title: 'Schedule cake tasting',
          description: 'Set up tasting appointment with couple',
          due_date: '2025-09-01',
          priority: 'high',
          status: 'assigned',
          task_type: 'consultation',
          created_at: new Date().toISOString(),
        },
          title: 'Finalize cake design',
          description: 'Complete custom cake design based on tasting feedback',
          due_date: '2025-09-15',
          priority: 'medium',
          status: 'pending',
          task_type: 'design',
          dependencies: ['Schedule cake tasting'],
          title: 'Deliver wedding cake',
          description: 'Deliver and set up 3-tier custom cake at venue',
          due_date: clientData.wedding_date,
          priority: 'critical',
          status: 'scheduled',
          task_type: 'delivery',
      ]
      const { data: tasks, error: taskError } = await testSupabase
        .from('tasks')
        .insert(vendorTasks)
        .select()
      expect(taskError).toBeNull()
      expect(tasks).toHaveLength(3)
      // Vendor should see only their assigned tasks
      const { data: vendorTaskView, error: taskViewError } = await testSupabase
        .select('*')
        .eq('assigned_vendor_id', vendorData.id)
      expect(taskViewError).toBeNull()
      expect(vendorTaskView).toHaveLength(3)
      // Verify task types and priorities
      const consultationTask = vendorTaskView!.find(t => t.task_type === 'consultation')
      const deliveryTask = vendorTaskView!.find(t => t.task_type === 'delivery')
      expect(consultationTask.priority).toBe('high')
      expect(deliveryTask.priority).toBe('critical')
      expect(deliveryTask.due_date).toBe(clientData.wedding_date)
    it('should prevent vendor from accessing unassigned wedding data', async () => {
      // Create another client with different planner
      const otherPlannerAuth = await integrationHelpers.createAuthenticatedContext('other-planner@wedsync.com')
      const otherClientData = testDataFactory.createClient({
        email: 'other-client@example.com',
        planner_id: otherPlannerAuth.user.id,
      })
      await testSupabase.from('clients').insert(otherClientData)
      // Vendor should not see unassigned clients
        .select('*, clients(*)')
      expect(assignments).toHaveLength(1) // Only the assigned client
      expect(assignments![0].clients.email).toBe(clientData.email)
      expect(assignments![0].clients.email).not.toBe(otherClientData.email)
      // Direct client access should be blocked by RLS
      const { data: directClients, error: clientError } = await testSupabase
        .from('clients')
      expect(clientError).toBeNull()
      expect(directClients).toHaveLength(0) // Vendor cannot directly access client table
  describe('Vendor Task Management Workflow', () => {
    it('should complete task → update status → notify planner workflow', async () => {
      // Create task for vendor
      const vendorTask = {
        id: crypto.randomUUID(),
        client_id: clientData.id,
        assigned_vendor_id: vendorData.id,
        title: 'Submit cake design mockup',
        description: 'Create visual mockup of 3-tier custom cake design',
        due_date: '2025-08-20',
        priority: 'high',
        status: 'assigned',
        created_at: new Date().toISOString(),
      }
      const { data: task } = await testSupabase
        .insert(vendorTask)
        .single()
      // Vendor starts task
      const { data: startedTask } = await testSupabase
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          progress_notes: 'Working on initial design concepts',
        })
        .eq('id', task.id)
      expect(startedTask.status).toBe('in_progress')
      // Vendor completes task with deliverable
      const { data: completedTask } = await testSupabase
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_notes: 'Design mockup completed and uploaded',
          completion_details: {
            deliverables: ['cake_mockup_v1.pdf', 'flavor_options.pdf'],
            notes: 'Three design options provided based on couple preferences',
            next_steps: 'Awaiting client feedback for final design selection',
          },
      expect(completedTask.status).toBe('completed')
      expect(completedTask.completion_details.deliverables).toHaveLength(2)
      // System sends automatic notification to planner
      const completionNotification = {
        planner_id: plannerUser.id,
        vendor_id: vendorData.id,
        task_id: completedTask.id,
        type: 'email',
        status: 'sent',
        subject: 'Task Completed - Cake Design Mockup',
        message: `${vendorData.business_name} has completed: ${completedTask.title}. Deliverables: ${completedTask.completion_details.deliverables.join(', ')}. Next steps: ${completedTask.completion_details.next_steps}`,
      const { data: notification } = await testSupabase
        .from('communications')
        .insert(completionNotification)
      expect(notification.task_id).toBe(completedTask.id)
      expect(notification.vendor_id).toBe(vendorData.id)
      // Verify workflow completion
      const workflowState = await Promise.all([
        integrationHelpers.verifyDatabaseState('tasks', { id: task.id }),
        integrationHelpers.verifyDatabaseState('communications', { task_id: task.id }),
      ])
      expect(workflowState[0][0].status).toBe('completed')
      expect(workflowState[1]).toHaveLength(1)
    it('should handle task dependency workflow', async () => {
      // Create dependent tasks
      const parentTask = {
        title: 'Cake tasting session',
        description: 'Conduct tasting with couple to select flavors',
        due_date: '2025-08-10',
      const dependentTask = {
        title: 'Finalize cake order',
        description: 'Process final cake order with selected flavors and design',
        due_date: '2025-08-25',
        status: 'blocked',
        dependencies: [parentTask.id],
      const { data: tasks } = await testSupabase
        .insert([parentTask, dependentTask])
      const parent = tasks!.find(t => t.title === 'Cake tasting session')!
      const dependent = tasks!.find(t => t.title === 'Finalize cake order')!
      // Complete parent task
      const { data: completedParent } = await testSupabase
            selected_flavors: ['vanilla-raspberry', 'chocolate-salted-caramel'],
            tasting_notes: 'Couple loved both flavors, decided on alternating layers',
        .eq('id', parent.id)
      expect(completedParent.status).toBe('completed')
      // Dependent task should now be unblocked (simulate system trigger)
      const { data: unblockedTask } = await testSupabase
          status: 'assigned', // Moved from 'blocked' to 'assigned'
          updated_at: new Date().toISOString(),
        .eq('id', dependent.id)
      expect(unblockedTask.status).toBe('assigned')
      // Verify dependency workflow
      const taskStates = await integrationHelpers.verifyDatabaseState('tasks', {
      const parentFinal = taskStates.find((t: any) => t.id === parent.id)
      const dependentFinal = taskStates.find((t: any) => t.id === dependent.id)
      expect(parentFinal.status).toBe('completed')
      expect(dependentFinal.status).toBe('assigned') // No longer blocked
  describe('Vendor Communication Workflow', () => {
    it('should handle vendor → planner → client communication chain', async () => {
      // Step 1: Vendor sends message to planner about client request
      const vendorToPlanner = {
        subject: 'Cake Design Question - Additional Cost',
        message: `Hi! The couple has requested gold leaf accents on their cake which would add $200 to the total. Should I proceed with this upgrade?`,
        communication_type: 'vendor_inquiry',
      const { data: vendorMessage } = await testSupabase
        .insert(vendorToPlanner)
      expect(vendorMessage.vendor_id).toBe(vendorData.id)
      // Step 2: Planner forwards to client with recommendation
      await testCleanup.authenticateAs('vendor-workflow-planner@wedsync.com')
      const plannerToClient = {
        subject: 'Cake Upgrade Option - Gold Leaf Accents',
        message: `${vendorData.business_name} can add beautiful gold leaf accents to your cake for an additional $200. Based on your style preferences, I think it would be a stunning addition. Would you like to proceed?`,
        parent_communication_id: vendorMessage.id,
        communication_type: 'planner_recommendation',
      const { data: plannerMessage } = await testSupabase
        .insert(plannerToClient)
      // Step 3: Client approves via planner
      const clientApproval = {
        subject: 'Re: Cake Upgrade Approved',
        message: 'Yes! We love the gold leaf idea. Please proceed with the upgrade. Looking forward to seeing it on our special day!',
        parent_communication_id: plannerMessage.id,
        communication_type: 'client_approval',
      const { data: clientMessage } = await testSupabase
        .insert(clientApproval)
      // Step 4: Planner confirms with vendor
      const plannerToVendor = {
        subject: 'Gold Leaf Upgrade Approved',
        message: 'Great news! The couple has approved the gold leaf upgrade. Please proceed with adding this to their cake design. I\'ll update the contract with the additional $200.',
        parent_communication_id: clientMessage.id,
        communication_type: 'planner_approval',
      const { data: finalMessage } = await testSupabase
        .insert(plannerToVendor)
      // Verify communication chain
      const communicationChain = await integrationHelpers.verifyDatabaseState('communications', {
      expect(communicationChain).toHaveLength(4)
      // Verify chain integrity
      const chain = communicationChain.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      expect(chain[0].communication_type).toBe('vendor_inquiry')
      expect(chain[1].communication_type).toBe('planner_recommendation')
      expect(chain[2].communication_type).toBe('client_approval')
      expect(chain[3].communication_type).toBe('planner_approval')
      // Verify parent-child relationships
      expect(chain[1].parent_communication_id).toBe(chain[0].id)
      expect(chain[2].parent_communication_id).toBe(chain[1].id)
      expect(chain[3].parent_communication_id).toBe(chain[2].id)
  describe('Vendor Payment Integration Workflow', () => {
    it('should handle payment milestone → invoice → payment confirmation flow', async () => {
      // Create payment milestones
      const paymentMilestones = [
          vendor_assignment_id: vendorAssignment.id,
          amount: 800, // Deposit
          due_date: '2025-08-01',
          description: 'Cake design and booking deposit',
          milestone_type: 'deposit',
          amount: 2200, // Final payment (includes $200 upgrade)
          due_date: '2025-10-08',
          description: 'Final payment including gold leaf upgrade',
          milestone_type: 'final_payment',
      const { data: payments } = await testSupabase
        .from('payments')
        .insert(paymentMilestones)
      expect(payments).toHaveLength(2)
      const depositPayment = payments!.find(p => p.milestone_type === 'deposit')!
      const finalPayment = payments!.find(p => p.milestone_type === 'final_payment')!
      // Simulate deposit payment completion
      const { data: paidDeposit } = await testSupabase
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card',
          transaction_id: 'txn_deposit_123',
        .eq('id', depositPayment.id)
      expect(paidDeposit.status).toBe('completed')
      // Trigger vendor notification
      const depositNotification = {
        payment_id: paidDeposit.id,
        subject: 'Deposit Payment Received - Proceed with Cake Order',
        message: `Great news! We've received the $${paidDeposit.amount} deposit for ${clientData.first_name} & ${clientData.partner_first_name}'s wedding cake. You can now proceed with the order preparation.`,
        .insert(depositNotification)
      // Create vendor invoice for tracking
      const vendorInvoice = {
        payment_id: finalPayment.id,
        invoice_number: 'INV-2025-001',
        amount: finalPayment.amount,
        due_date: finalPayment.due_date,
        status: 'pending',
        line_items: [
          {
            description: '3-tier custom wedding cake',
            quantity: 1,
            unit_price: 2600,
            total: 2600,
            description: 'Gold leaf accent upgrade',
            unit_price: 200,
            total: 200,
        ],
      const { data: invoice } = await testSupabase
        .from('invoices')
        .insert(vendorInvoice)
      // Verify payment workflow
      const paymentState = await Promise.all([
        integrationHelpers.verifyDatabaseState('payments', { client_id: clientData.id }),
        integrationHelpers.verifyDatabaseState('communications', { payment_id: paidDeposit.id }),
        integrationHelpers.verifyDatabaseState('invoices', { client_id: clientData.id }),
      const depositPmt = paymentState[0].find((p: any) => p.milestone_type === 'deposit')
      const finalPmt = paymentState[0].find((p: any) => p.milestone_type === 'final_payment')
      expect(depositPmt.status).toBe('completed')
      expect(finalPmt.status).toBe('scheduled')
      expect(paymentState[1]).toHaveLength(1) // Payment notification sent
      expect(paymentState[2]).toHaveLength(1) // Invoice created
      // Verify invoice total matches payment amount
      const createdInvoice = paymentState[2][0]
      const invoiceTotal = createdInvoice.line_items.reduce((sum: number, item: any) => sum + item.total, 0)
      expect(invoiceTotal).toBe(finalPayment.amount)
  describe('Vendor Performance Tracking Workflow', () => {
    it('should track vendor performance metrics and client feedback', async () => {
      // Complete vendor assignment with performance data
      const { data: completedAssignment } = await testSupabase
          service_rating: 5,
          quality_rating: 5,
          timeliness_rating: 4,
          communication_rating: 5,
          feedback_notes: 'Absolutely gorgeous cake! Exceeded our expectations. Delivered exactly on time and setup was perfect.',
          performance_metrics: {
            on_time_delivery: true,
            quality_score: 95,
            client_satisfaction: 98,
            repeat_bookings: 0,
        .eq('id', vendorAssignment.id)
      expect(completedAssignment.status).toBe('completed')
      expect(completedAssignment.service_rating).toBe(5)
      // Create performance review record
      const performanceReview = {
        assignment_id: completedAssignment.id,
        overall_rating: 4.75, // Average of all ratings
        service_quality: 5,
        communication: 5,
        timeliness: 4,
        professionalism: 5,
        would_recommend: true,
        review_text: completedAssignment.feedback_notes,
        review_date: new Date().toISOString(),
        verified_booking: true,
      const { data: review } = await testSupabase
        .from('vendor_reviews')
        .insert(performanceReview)
      expect(review.overall_rating).toBe(4.75)
      expect(review.would_recommend).toBe(true)
      // Update vendor aggregate metrics
      const { data: currentVendor } = await testSupabase
        .from('vendors')
        .select('performance_metrics')
        .eq('id', vendorData.id)
      const updatedMetrics = {
        ...currentVendor.performance_metrics,
        total_completed_bookings: 1,
        average_rating: 4.75,
        recommendation_rate: 100,
        on_time_delivery_rate: 100,
        client_satisfaction_score: 98,
        last_review_date: new Date().toISOString(),
      const { data: updatedVendor } = await testSupabase
          performance_metrics: updatedMetrics,
      // Create vendor performance alert for high ratings
      if (review.overall_rating >= 4.5) {
        const performanceAlert = {
          vendor_id: vendorData.id,
          planner_id: plannerUser.id,
          alert_type: 'high_performance',
          message: `${vendorData.business_name} received exceptional ratings (${review.overall_rating}/5) for recent wedding service. Consider featuring as preferred vendor.`,
          priority: 'low',
          status: 'active',
        }
        await testSupabase.from('vendor_alerts').insert(performanceAlert)
      // Verify performance tracking workflow
      const performanceState = await Promise.all([
        integrationHelpers.verifyDatabaseState('vendor_reviews', { vendor_id: vendorData.id }),
        integrationHelpers.verifyDatabaseState('vendors', { id: vendorData.id }),
        integrationHelpers.verifyDatabaseState('vendor_alerts', { vendor_id: vendorData.id }),
      expect(performanceState[0]).toHaveLength(1) // Review created
      expect(performanceState[1][0].performance_metrics.average_rating).toBe(4.75)
      expect(performanceState[2]).toHaveLength(1) // High performance alert created
      const vendorMetrics = performanceState[1][0].performance_metrics
      expect(vendorMetrics.total_completed_bookings).toBe(1)
      expect(vendorMetrics.recommendation_rate).toBe(100)
      expect(vendorMetrics.on_time_delivery_rate).toBe(100)
})
