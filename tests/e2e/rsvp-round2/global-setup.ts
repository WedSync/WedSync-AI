import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for WS-057 Round 2 RSVP Testing
 * Prepares test environment and creates test data
 */

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up WS-057 Round 2 RSVP Test Environment...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Database Setup and Seeding
    console.log('📊 Setting up test database...');
    await setupTestDatabase();
    
    // 2. Create Test Vendor Account
    console.log('👤 Creating test vendor account...');
    const testVendor = await createTestVendor(page);
    
    // 3. Create Test Event with Round 2 Features
    console.log('🎉 Creating test event with Round 2 features...');
    const testEvent = await createTestEvent(page, testVendor.id);
    
    // 4. Generate Test RSVP Data
    console.log('📝 Generating test RSVP data...');
    await generateTestRSVPData(testEvent.id);
    
    // 5. Setup Test Invitations
    console.log('✉️ Creating test invitations...');
    await createTestInvitations(testEvent.id);
    
    // 6. Setup Custom Questions
    console.log('❓ Setting up custom questions...');
    await createTestCustomQuestions(testEvent.id);
    
    // 7. Setup Plus-One Relationships
    console.log('👥 Creating plus-one relationships...');
    await createTestPlusOnes(testEvent.id);
    
    // 8. Setup Households
    console.log('🏠 Creating household groupings...');
    await createTestHouseholds(testEvent.id);
    
    // 9. Setup Waitlist
    console.log('⏳ Setting up waitlist entries...');
    await createTestWaitlist(testEvent.id);
    
    // 10. Store test IDs for use in tests
    process.env.TEST_VENDOR_ID = testVendor.id;
    process.env.TEST_EVENT_ID = testEvent.id;
    
    console.log('✅ Global setup complete!');
    console.log(`📋 Test Event ID: ${testEvent.id}`);
    console.log(`👤 Test Vendor ID: ${testVendor.id}`);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestDatabase() {
  // Reset test database and ensure Round 2 schemas are applied
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  // Clean existing test data
  await supabase.from('rsvp_export_history').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_custom_responses').delete().like('response_id', 'test-%');
  await supabase.from('rsvp_custom_questions').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_plus_one_relationships').delete().like('primary_invitation_id', 'test-%');
  await supabase.from('rsvp_invitation_households').delete().like('invitation_id', 'test-%');
  await supabase.from('rsvp_households').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_waitlist').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_reminder_escalation').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_responses').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_invitations').delete().like('event_id', 'test-%');
  await supabase.from('rsvp_events').delete().like('id', 'test-%');
  
  console.log('🧹 Test database cleaned');
}

async function createTestVendor(page: any) {
  // Create or use existing test vendor
  const vendorId = 'test-vendor-' + Date.now();
  
  // Navigate to signup page and create vendor account
  await page.goto('/signup');
  await page.fill('[data-testid="email"]', 'vendor@test.com');
  await page.fill('[data-testid="password"]', 'testpass123');
  await page.fill('[data-testid="business-name"]', 'Test Wedding Venue');
  await page.click('[data-testid="signup-button"]');
  
  // Wait for account creation
  await page.waitForURL('**/dashboard**');
  
  return { id: vendorId, email: 'vendor@test.com' };
}

async function createTestEvent(page: any, vendorId: string) {
  const eventId = 'test-event-' + Date.now();
  
  // Navigate to create event page
  await page.goto('/dashboard/events/new');
  
  // Fill event details with Round 2 features enabled
  await page.fill('[data-testid="event-name"]', 'WS-057 Round 2 Test Event');
  await page.fill('[data-testid="event-date"]', '2025-12-31');
  await page.fill('[data-testid="venue-name"]', 'Test Wedding Venue');
  await page.fill('[data-testid="max-guests"]', '150');
  
  // Enable Round 2 features
  await page.check('[data-testid="allow-plus-ones"]');
  await page.check('[data-testid="enable-waitlist"]');
  await page.check('[data-testid="enable-custom-questions"]');
  await page.check('[data-testid="enable-household-grouping"]');
  await page.check('[data-testid="enable-analytics"]');
  
  // Save event
  await page.click('[data-testid="create-event"]');
  await page.waitForURL('**/events/**');
  
  // Extract event ID from URL
  const actualEventId = page.url().split('/').pop();
  
  return { id: actualEventId || eventId };
}

async function generateTestRSVPData(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  // Create varied test responses for analytics
  const testResponses = [
    { status: 'attending', count: 80 },
    { status: 'not_attending', count: 15 },
    { status: 'maybe', count: 5 }
  ];
  
  for (const responseType of testResponses) {
    for (let i = 0; i < responseType.count; i++) {
      const guestId = `test-guest-${responseType.status}-${i}`;
      
      // Create invitation
      const { data: invitation } = await supabase
        .from('rsvp_invitations')
        .insert({
          event_id: eventId,
          guest_name: `Test Guest ${i + 1}`,
          guest_email: `guest${i}@test.com`,
          guest_phone: `+123456789${i.toString().padStart(2, '0')}`,
          max_party_size: Math.floor(Math.random() * 4) + 1,
          invitation_code: `TEST${i.toString().padStart(4, '0')}`
        })
        .select()
        .single();
      
      if (invitation) {
        // Create response
        await supabase
          .from('rsvp_responses')
          .insert({
            event_id: eventId,
            invitation_id: invitation.id,
            response_status: responseType.status,
            party_size: Math.floor(Math.random() * invitation.max_party_size) + 1,
            responded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          });
      }
    }
  }
  
  console.log(`📊 Generated ${testResponses.reduce((sum, r) => sum + r.count, 0)} test responses`);
}

async function createTestInvitations(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  // Create additional pending invitations
  const pendingGuests = [
    'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson', 'David Brown'
  ];
  
  for (let i = 0; i < pendingGuests.length; i++) {
    await supabase
      .from('rsvp_invitations')
      .insert({
        event_id: eventId,
        guest_name: pendingGuests[i],
        guest_email: `${pendingGuests[i].toLowerCase().replace(' ', '.')}@test.com`,
        guest_phone: `+1555${(i + 100).toString()}`,
        max_party_size: 2,
        invitation_code: `PEND${i.toString().padStart(3, '0')}`
      });
  }
  
  console.log(`✉️ Created ${pendingGuests.length} pending invitations`);
}

async function createTestCustomQuestions(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const questions = [
    {
      question_text: 'Do you have any dietary restrictions?',
      question_type: 'multiple_choice',
      category: 'dietary',
      options: JSON.stringify(['Vegetarian', 'Vegan', 'Gluten-free', 'No restrictions']),
      required: true,
      display_order: 1
    },
    {
      question_text: 'Will you need transportation to the venue?',
      question_type: 'checkbox',
      category: 'transport',
      options: JSON.stringify(['Yes, please arrange', 'No, I have my own transport']),
      required: false,
      display_order: 2
    },
    {
      question_text: 'Any song requests for the DJ?',
      question_type: 'textarea',
      category: 'entertainment',
      required: false,
      display_order: 3
    }
  ];
  
  for (const question of questions) {
    await supabase
      .from('rsvp_custom_questions')
      .insert({
        event_id: eventId,
        ...question
      });
  }
  
  console.log(`❓ Created ${questions.length} custom questions`);
}

async function createTestPlusOnes(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  // Get some test invitations to add plus-ones to
  const { data: invitations } = await supabase
    .from('rsvp_invitations')
    .select('id')
    .eq('event_id', eventId)
    .limit(5);
  
  if (invitations) {
    for (let i = 0; i < invitations.length; i++) {
      await supabase
        .from('rsvp_plus_one_relationships')
        .insert({
          primary_invitation_id: invitations[i].id,
          plus_one_name: `Plus One ${i + 1}`,
          plus_one_email: `plusone${i}@test.com`,
          relationship_type: ['partner', 'spouse', 'friend'][i % 3],
          age_group: 'adult',
          dietary_restrictions: JSON.stringify(['vegetarian']),
          is_confirmed: i % 2 === 0
        });
    }
  }
  
  console.log(`👥 Created plus-one relationships`);
}

async function createTestHouseholds(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const households = [
    { name: 'The Smith Family', expected_guests: 4 },
    { name: 'The Johnson Household', expected_guests: 2 },
    { name: 'The Brown Extended Family', expected_guests: 6 }
  ];
  
  for (const household of households) {
    await supabase
      .from('rsvp_households')
      .insert({
        event_id: eventId,
        household_name: household.name,
        total_expected_guests: household.expected_guests,
        address_line1: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345'
      });
  }
  
  console.log(`🏠 Created ${households.length} household groupings`);
}

async function createTestWaitlist(eventId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const waitlistGuests = [
    { name: 'Wait List Guest 1', priority: 1 },
    { name: 'Wait List Guest 2', priority: 2 },
    { name: 'Wait List Guest 3', priority: 3 }
  ];
  
  for (let i = 0; i < waitlistGuests.length; i++) {
    await supabase
      .from('rsvp_waitlist')
      .insert({
        event_id: eventId,
        guest_name: waitlistGuests[i].name,
        guest_email: `waitlist${i}@test.com`,
        party_size: 2,
        priority: waitlistGuests[i].priority,
        status: 'waiting'
      });
  }
  
  console.log(`⏳ Created ${waitlistGuests.length} waitlist entries`);
}

export default globalSetup;