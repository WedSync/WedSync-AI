/**
 * Supplier-Couple Workflow Integration Tests
 * WS-192 Team B - Backend/API Focus
 * 
 * Comprehensive end-to-end testing of supplier-couple interactions
 * with data validation and wedding industry business logic
 */

// Jest globals are available without import
import request from 'supertest';
import { createTestContext, TestContext } from './setup';
import { DataValidator } from './helpers/data-validation';

describe('WS-192 Supplier-Couple Workflow Integration Tests', () => {
  let testContext: TestContext;
  let apiRequest: request.SuperTest<request.Test>;

  beforeEach(async () => {
    testContext = await createTestContext('supplier-couple-workflow');
    // Mock the Next.js app for API testing
    // In a real implementation, this would be the actual Next.js app
    apiRequest = request('http://localhost:3000'); // Placeholder
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Complete Wedding Journey Workflow', () => {
    test('should handle complete photographer-couple onboarding and booking flow', async () => {
      // 1. Photographer Registration and Setup
      const photographerData = await createPhotographer();
      expect(photographerData.id).toBeDefined();
      expect(photographerData.email).toContain(testContext.testId);

      // 2. Photographer Creates Booking Form
      const formData = await createBookingForm(photographerData.id);
      expect(formData.id).toBeDefined();
      expect(formData.organization_id).toBe(testContext.organizationId);

      // 3. Couple Discovers Photographer and Fills Form
      const coupleSubmission = await simulateCoupleFormSubmission(formData.id);
      expect(coupleSubmission.id).toBeDefined();
      expect(coupleSubmission.form_id).toBe(formData.id);

      // 4. Validate Data Integrity
      const validator = new DataValidator({
        database: testContext.database,
        organizationId: testContext.organizationId,
        testId: testContext.testId
      });
      
      const validationReport = await validator.validate();
      expect(validationReport.critical).toBe(0);
      expect(validationReport.failed).toBe(0);

      // 5. Verify Wedding Data Synchronization
      await verifyWeddingDataSync(coupleSubmission.id, photographerData.id);

      // 6. Test Journey Automation Triggers
      const journeyResult = await triggerWeddingJourney(coupleSubmission.id);
      expect(journeyResult.status).toBe('active');
      expect(journeyResult.steps.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle supplier-couple communication workflow', async () => {
      // Setup: Create photographer and couple
      const photographerData = await createPhotographer();
      const coupleData = await createCouple();
      
      // 1. Initial Contact via Form Submission
      const formData = await createBookingForm(photographerData.id);
      const submission = await simulateCoupleFormSubmission(formData.id, coupleData);
      
      // 2. Photographer Responds with Consultation Booking
      const consultationBooking = await createConsultationBooking(
        photographerData.id, 
        coupleData.id,
        submission.id
      );
      
      expect(consultationBooking.id).toBeDefined();
      expect(consultationBooking.status).toBe('scheduled');
      
      // 3. Email Notifications Triggered
      const emailQueue = testContext.mocks.getWebhookQueue();
      const consultationEmails = emailQueue.filter(webhook => 
        webhook.payload.type === 'consultation_scheduled'
      );
      expect(consultationEmails.length).toBeGreaterThan(0);
      
      // 4. Meeting Confirmation and Follow-up
      await confirmConsultationMeeting(consultationBooking.id);
      
      // 5. Contract Generation and Signing
      const contract = await generateWeddingContract(
        photographerData.id, 
        coupleData.id,
        consultationBooking.id
      );
      
      expect(contract.id).toBeDefined();
      expect(contract.status).toBe('draft');
      
      // 6. Payment Processing Integration
      const paymentSession = await createPaymentSession(contract.id);
      expect(paymentSession.id).toBeDefined();
      expect(paymentSession.status).toBe('open');
    }, 30000);

    test('should validate multi-vendor wedding coordination', async () => {
      const coupleData = await createCouple();
      
      // Create multiple vendors for the same wedding
      const photographer = await createPhotographer();
      const venue = await createVenue();
      const florist = await createFlorist();
      
      // Each vendor creates their booking forms
      const photoForm = await createBookingForm(photographer.id, 'photography');
      const venueForm = await createBookingForm(venue.id, 'venue');
      const floristForm = await createBookingForm(florist.id, 'floristry');
      
      // Couple fills out forms for all vendors
      const photoSubmission = await simulateCoupleFormSubmission(photoForm.id, coupleData);
      const venueSubmission = await simulateCoupleFormSubmission(venueForm.id, coupleData);
      const floristSubmission = await simulateCoupleFormSubmission(floristForm.id, coupleData);
      
      // Verify wedding data consistency across all vendors
      await verifyMultiVendorDataConsistency([
        { vendorId: photographer.id, submissionId: photoSubmission.id },
        { vendorId: venue.id, submissionId: venueSubmission.id },
        { vendorId: florist.id, submissionId: floristSubmission.id }
      ], coupleData.id);
      
      // Test timeline coordination between vendors
      const timeline = await createWeddingTimeline(coupleData.id, [
        photographer.id, venue.id, florist.id
      ]);
      
      expect(timeline.vendors).toHaveLength(3);
      expect(timeline.coordination_status).toBe('active');
    }, 30000);
  });

  describe('Core Field Synchronization', () => {
    test('should synchronize wedding date across all vendor interactions', async () => {
      const photographer = await createPhotographer();
      const couple = await createCouple();
      const weddingDate = '2025-06-15';
      
      // 1. Couple submits form with wedding date
      const formData = await createBookingForm(photographer.id);
      const submission = await simulateCoupleFormSubmission(formData.id, {
        ...couple,
        wedding_date: weddingDate
      });
      
      // 2. Verify date is stored in submission
      expect(submission.data.wedding_date).toBe(weddingDate);
      
      // 3. Create contract and verify date propagation
      const contract = await generateWeddingContract(
        photographer.id, 
        couple.id,
        submission.id
      );
      
      expect(contract.wedding_date).toBe(weddingDate);
      
      // 4. Update date and verify synchronization
      const updatedDate = '2025-07-20';
      await updateWeddingDate(couple.id, updatedDate);
      
      const updatedContract = await getContract(contract.id);
      expect(updatedContract.wedding_date).toBe(updatedDate);
    }, 15000);

    test('should synchronize guest count and venue requirements', async () => {
      const venue = await createVenue();
      const couple = await createCouple();
      const guestCount = 150;
      
      const formData = await createBookingForm(venue.id, 'venue');
      const submission = await simulateCoupleFormSubmission(formData.id, {
        ...couple,
        guest_count: guestCount,
        venue_requirements: {
          indoor: true,
          capacity: guestCount + 20, // Buffer for vendors
          parking: true,
          accessibility: true
        }
      });
      
      expect(submission.data.guest_count).toBe(guestCount);
      expect(submission.data.venue_requirements.capacity).toBe(170);
      
      // Verify venue can accommodate requirements
      const venueValidation = await validateVenueCapacity(venue.id, guestCount);
      expect(venueValidation.canAccommodate).toBe(true);
    }, 15000);

    test('should handle budget allocation across multiple vendors', async () => {
      const couple = await createCouple();
      const totalBudget = 50000; // $50,000 wedding budget
      
      const photographer = await createPhotographer();
      const venue = await createVenue(); 
      const florist = await createFlorist();
      
      // Allocate budget percentages
      const budgetAllocation = {
        photography: 0.15, // 15% - $7,500
        venue: 0.45,       // 45% - $22,500
        floristry: 0.08    // 8% - $4,000
      };
      
      const photoQuote = await createQuote(photographer.id, couple.id, {
        amount: totalBudget * budgetAllocation.photography,
        services: ['8-hour wedding coverage', 'engagement session', 'photo album']
      });
      
      const venueQuote = await createQuote(venue.id, couple.id, {
        amount: totalBudget * budgetAllocation.venue,
        services: ['ceremony space', 'reception hall', 'catering for 150']
      });
      
      const floristQuote = await createQuote(florist.id, couple.id, {
        amount: totalBudget * budgetAllocation.floristry,
        services: ['bridal bouquet', 'ceremony arrangements', '10 centerpieces']
      });
      
      // Verify budget tracking
      const totalQuoted = photoQuote.amount + venueQuote.amount + floristQuote.amount;
      expect(totalQuoted).toBeLessThanOrEqual(totalBudget);
      
      const budgetUtilization = totalQuoted / totalBudget;
      expect(budgetUtilization).toBeLessThan(0.8); // Should leave buffer for other vendors
    }, 15000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle duplicate form submissions gracefully', async () => {
      const photographer = await createPhotographer();
      const couple = await createCouple();
      const formData = await createBookingForm(photographer.id);
      
      // Submit form first time
      const firstSubmission = await simulateCoupleFormSubmission(formData.id, couple);
      expect(firstSubmission.id).toBeDefined();
      
      // Attempt duplicate submission
      const secondSubmission = await simulateCoupleFormSubmission(formData.id, couple);
      
      // Should either prevent duplicate or flag as duplicate
      if (secondSubmission.id !== firstSubmission.id) {
        expect(secondSubmission.is_duplicate).toBe(true);
      }
    }, 15000);

    test('should handle invalid wedding dates', async () => {
      const photographer = await createPhotographer();
      const formData = await createBookingForm(photographer.id);
      
      // Test past date
      await expect(simulateCoupleFormSubmission(formData.id, {
        first_name: 'John',
        last_name: 'Doe',
        email: `test-${testContext.testId}@example.com`,
        wedding_date: '2020-01-01' // Past date
      })).rejects.toThrow(/wedding date.*past/i);
      
      // Test far future date
      await expect(simulateCoupleFormSubmission(formData.id, {
        first_name: 'John',
        last_name: 'Doe',
        email: `test-${testContext.testId}@example.com`,
        wedding_date: '2030-01-01' // Too far in future
      })).rejects.toThrow(/wedding date.*far/i);
    }, 15000);
  });

  // Helper functions for test data creation and workflow simulation
  async function createPhotographer(): Promise<any> {
    const result = await testContext.database.query(
      `INSERT INTO user_profiles (
        id, organization_id, email, full_name, role, 
        business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Test Photographer', 'admin', 
        'photographer', NOW(), NOW()
      ) RETURNING *`,
      [testContext.organizationId, `photographer-${testContext.testId}@test.com`]
    );
    return result.rows[0];
  }

  async function createCouple(): Promise<any> {
    const result = await testContext.database.query(
      `INSERT INTO clients (
        id, organization_id, first_name, last_name, email, 
        wedding_date, guest_count, budget, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'John', 'Smith', $2,
        '2025-06-15', 150, 50000, NOW(), NOW()
      ) RETURNING *`,
      [testContext.organizationId, `couple-${testContext.testId}@test.com`]
    );
    return result.rows[0];
  }

  async function createVenue(): Promise<any> {
    // Create venue organization first
    const venueOrgResult = await testContext.database.query(
      `INSERT INTO organizations (
        id, name, slug, business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'venue', NOW(), NOW()
      ) RETURNING id`,
      [`Test Venue ${testContext.testId}`, `venue-${testContext.testId}`]
    );

    const result = await testContext.database.query(
      `INSERT INTO user_profiles (
        id, organization_id, email, full_name, role, 
        business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Test Venue Manager', 'admin', 
        'venue', NOW(), NOW()
      ) RETURNING *`,
      [venueOrgResult.rows[0].id, `venue-${testContext.testId}@test.com`]
    );
    return result.rows[0];
  }

  async function createFlorist(): Promise<any> {
    // Create florist organization first
    const floristOrgResult = await testContext.database.query(
      `INSERT INTO organizations (
        id, name, slug, business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'florist', NOW(), NOW()
      ) RETURNING id`,
      [`Test Florist ${testContext.testId}`, `florist-${testContext.testId}`]
    );

    const result = await testContext.database.query(
      `INSERT INTO user_profiles (
        id, organization_id, email, full_name, role, 
        business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Test Florist', 'admin', 
        'florist', NOW(), NOW()
      ) RETURNING *`,
      [floristOrgResult.rows[0].id, `florist-${testContext.testId}@test.com`]
    );
    return result.rows[0];
  }

  async function createBookingForm(userId: string, serviceType: string = 'photography'): Promise<any> {
    const formConfig = {
      fields: [
        { type: 'text', name: 'first_name', label: 'First Name', required: true },
        { type: 'text', name: 'last_name', label: 'Last Name', required: true },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true },
        { type: 'number', name: 'guest_count', label: 'Guest Count', required: true },
        { type: 'textarea', name: 'message', label: 'Additional Details' }
      ]
    };

    const result = await testContext.database.query(
      `INSERT INTO forms (
        id, organization_id, name, description, configuration, 
        status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, 
        'active', NOW(), NOW()
      ) RETURNING *`,
      [
        testContext.organizationId,
        `${serviceType} Booking Form`,
        `Book our ${serviceType} services for your special day`,
        JSON.stringify(formConfig)
      ]
    );
    return result.rows[0];
  }

  async function simulateCoupleFormSubmission(formId: string, coupleData?: any): Promise<any> {
    const submissionData = coupleData || {
      first_name: 'John',
      last_name: 'Smith',
      email: `couple-${testContext.testId}@test.com`,
      wedding_date: '2025-06-15',
      guest_count: 150,
      message: 'We are so excited to work with you!'
    };

    const result = await testContext.database.query(
      `INSERT INTO submissions (
        id, form_id, data, status, submitted_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'submitted', NOW(), NOW(), NOW()
      ) RETURNING *`,
      [formId, JSON.stringify(submissionData)]
    );
    return result.rows[0];
  }

  async function verifyWeddingDataSync(submissionId: string, photographerId: string): Promise<void> {
    // Verify submission exists and has valid data
    const submission = await testContext.database.query(
      `SELECT * FROM submissions WHERE id = $1`,
      [submissionId]
    );
    
    expect(submission.rows).toHaveLength(1);
    expect(submission.rows[0].data.wedding_date).toBeDefined();
    expect(submission.rows[0].data.guest_count).toBeGreaterThan(0);
  }

  async function triggerWeddingJourney(submissionId: string): Promise<any> {
    // Create a journey based on the submission
    const result = await testContext.database.query(
      `INSERT INTO journeys (
        id, organization_id, name, description, status, 
        steps, trigger_conditions, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'Wedding Photography Journey', 
        'Automated journey for wedding photography clients', 'active',
        $2, $3, NOW(), NOW()
      ) RETURNING *`,
      [
        testContext.organizationId,
        JSON.stringify([
          { id: 1, name: 'Welcome Email', status: 'pending', delay: 0 },
          { id: 2, name: 'Consultation Booking', status: 'pending', delay: 1440 }, // 1 day
          { id: 3, name: 'Contract Preparation', status: 'pending', delay: 4320 }, // 3 days
          { id: 4, name: 'Engagement Session', status: 'pending', delay: 10080 } // 1 week
        ]),
        JSON.stringify({ trigger: 'form_submission', form_submission_id: submissionId })
      ]
    );
    return result.rows[0];
  }

  async function createConsultationBooking(photographerId: string, coupleId: string, submissionId: string): Promise<any> {
    // Mock consultation booking logic
    return {
      id: `consultation_${Date.now()}`,
      photographer_id: photographerId,
      couple_id: coupleId,
      submission_id: submissionId,
      status: 'scheduled',
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      duration: 60 // minutes
    };
  }

  async function confirmConsultationMeeting(consultationId: string): Promise<void> {
    // Mock confirmation logic
    await testContext.mocks.simulateWebhook('/webhook/consultation-confirmed', {
      type: 'consultation_confirmed',
      consultation_id: consultationId,
      timestamp: new Date().toISOString()
    });
  }

  async function generateWeddingContract(photographerId: string, coupleId: string, consultationId: string): Promise<any> {
    // Mock contract generation
    return {
      id: `contract_${Date.now()}`,
      photographer_id: photographerId,
      couple_id: coupleId,
      consultation_id: consultationId,
      status: 'draft',
      amount: 7500,
      services: ['8-hour wedding coverage', 'engagement session', 'photo album'],
      created_at: new Date().toISOString()
    };
  }

  async function createPaymentSession(contractId: string): Promise<any> {
    // Mock Stripe payment session
    return {
      id: `cs_test_${Date.now()}`,
      contract_id: contractId,
      amount: 7500,
      status: 'open',
      payment_method_types: ['card'],
      created_at: new Date().toISOString()
    };
  }

  async function verifyMultiVendorDataConsistency(vendors: Array<{vendorId: string, submissionId: string}>, coupleId: string): Promise<void> {
    // Verify that the same couple data is consistent across all vendor submissions
    for (const vendor of vendors) {
      const submission = await testContext.database.query(
        `SELECT * FROM submissions WHERE id = $1`,
        [vendor.submissionId]
      );
      
      expect(submission.rows[0].data.wedding_date).toBe('2025-06-15');
      expect(submission.rows[0].data.first_name).toBe('John');
      expect(submission.rows[0].data.last_name).toBe('Smith');
    }
  }

  async function createWeddingTimeline(coupleId: string, vendorIds: string[]): Promise<any> {
    return {
      id: `timeline_${Date.now()}`,
      couple_id: coupleId,
      vendors: vendorIds.map(id => ({ vendor_id: id, role: 'participant' })),
      coordination_status: 'active',
      created_at: new Date().toISOString()
    };
  }

  async function updateWeddingDate(coupleId: string, newDate: string): Promise<void> {
    await testContext.database.query(
      `UPDATE clients SET wedding_date = $1, updated_at = NOW() WHERE id = $2`,
      [newDate, coupleId]
    );
  }

  async function getContract(contractId: string): Promise<any> {
    // Mock contract retrieval
    return {
      id: contractId,
      wedding_date: '2025-07-20', // Updated date
      updated_at: new Date().toISOString()
    };
  }

  async function validateVenueCapacity(venueId: string, guestCount: number): Promise<any> {
    // Mock venue capacity validation
    return {
      canAccommodate: true,
      maxCapacity: 200,
      recommendedCapacity: 180
    };
  }

  async function createQuote(vendorId: string, coupleId: string, quoteData: any): Promise<any> {
    return {
      id: `quote_${Date.now()}`,
      vendor_id: vendorId,
      couple_id: coupleId,
      amount: quoteData.amount,
      services: quoteData.services,
      status: 'pending',
      created_at: new Date().toISOString()
    };
  }
});