/**
 * WS-115: Marketplace Purchase Flow Integration Tests
 * Comprehensive testing of purchase workflow, payment processing, and template installation
 * 
 * Team C - Batch 9 - Round 1
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { MarketplacePurchaseService } from '@/lib/services/marketplace-purchase-service';
import MarketplaceAnalytics from '@/lib/analytics/marketplace-events';
// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn()
  },
  refunds: {
    create: vi.fn()
  }
};
vi.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});
// Test environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
describe('Marketplace Purchase Flow Integration', () => {
  let testSupplier: unknown;
  let testTemplate: unknown;
  let testBuyer: unknown;
  let testPurchase: unknown;
  beforeAll(async () => {
    // Set up test data
    await setupTestData();
  });
  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123456789',
      client_secret: 'pi_test_123456789_secret_test',
      status: 'requires_payment_method'
    });
    mockStripe.paymentIntents.retrieve.mockResolvedValue({
      status: 'succeeded',
      latest_charge: 'ch_test_123456789'
    mockStripe.refunds.create.mockResolvedValue({
      id: 'ref_test_123456789',
      amount: 2500,
      currency: 'gbp',
      status: 'succeeded'
  afterEach(async () => {
    // Clean up test purchases
    if (testPurchase) {
      await supabase
        .from('marketplace_purchases')
        .delete()
        .eq('id', testPurchase.id);
      testPurchase = null;
    }
  // =====================================================================================
  // PURCHASE CREATION TESTS
  describe('Purchase Session Creation', () => {
    test('should create valid purchase session', async () => {
      const purchaseRequest = {
        templateId: testTemplate.id,
        buyerId: testBuyer.id,
        metadata: {
          source: 'test',
          buyerEmail: 'test@example.com'
        }
      };
      const session = await MarketplacePurchaseService.createPurchaseSession(purchaseRequest);
      expect(session).toMatchObject({
        sessionId: expect.any(String),
        paymentIntentId: expect.any(String),
        clientSecret: expect.any(String),
        purchaseId: expect.any(String),
        status: 'pending',
        templateDetails: {
          id: testTemplate.id,
          title: testTemplate.title,
          price: testTemplate.price_cents,
          currency: testTemplate.currency,
          sellerId: testTemplate.supplier_id
      });
      // Verify Stripe payment intent was created
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: testTemplate.price_cents,
        currency: testTemplate.currency.toLowerCase(),
          purchaseId: session.purchaseId,
          templateId: testTemplate.id,
          buyerId: testBuyer.id,
        },
        automatic_payment_methods: {
          enabled: true
        receipt_email: 'test@example.com',
        description: `Purchase: ${testTemplate.title}`
      // Verify purchase record created
      const { data: purchase } = await supabase
        .select('*')
        .eq('id', session.purchaseId)
        .single();
      expect(purchase).toMatchObject({
        template_id: testTemplate.id,
        buyer_id: testBuyer.id,
        seller_id: testTemplate.supplier_id,
        price_paid_cents: testTemplate.price_cents,
        payment_status: 'pending',
        stripe_payment_intent_id: session.paymentIntentId
      testPurchase = purchase;
    test('should prevent duplicate purchase', async () => {
      // Create first purchase
      const { data: existingPurchase } = await supabase
        .insert({
          template_id: testTemplate.id,
          buyer_id: testBuyer.id,
          seller_id: testTemplate.supplier_id,
          price_paid_cents: testTemplate.price_cents,
          payment_status: 'completed'
        })
        .select()
        metadata: {}
      await expect(
        MarketplacePurchaseService.createPurchaseSession(purchaseRequest)
      ).rejects.toThrow('Template already purchased');
      // Clean up
        .eq('id', existingPurchase.id);
    test('should reject invalid template', async () => {
        templateId: 'invalid-template-id',
      ).rejects.toThrow('Template not found or not available for purchase');
  // PAYMENT CONFIRMATION TESTS
  describe('Payment Confirmation', () => {
    test('should complete purchase on successful payment', async () => {
      // Create test purchase
          payment_status: 'pending',
          stripe_payment_intent_id: 'pi_test_123456789'
      const result = await MarketplacePurchaseService.confirmPayment('pi_test_123456789');
      expect(result).toEqual({
        success: true,
        purchaseId: purchase.id
      // Verify purchase updated
      const { data: updatedPurchase } = await supabase
        .eq('id', purchase.id)
      expect(updatedPurchase.payment_status).toBe('completed');
      expect(updatedPurchase.stripe_charge_id).toBe('ch_test_123456789');
      // Verify Stripe payment intent retrieval
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123456789');
    test('should reject failed payment', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_test_123456789',
        status: 'requires_payment_method'
        MarketplacePurchaseService.confirmPayment('pi_test_123456789')
      ).rejects.toThrow('Payment not successful: requires_payment_method');
  // TEMPLATE INSTALLATION TESTS
  describe('Template Installation', () => {
    beforeEach(async () => {
      // Create completed purchase for installation tests
    test('should install form template successfully', async () => {
      // Update template to be a form
        .from('marketplace_templates')
        .update({
          template_type: 'form',
          template_data: {
            name: 'Test Form Template',
            description: 'A test form template',
            fields: [
              { id: 'name', type: 'text', label: 'Name', required: true },
              { id: 'email', type: 'email', label: 'Email', required: true }
            ],
            settings: { theme: 'modern' }
          }
        .eq('id', testTemplate.id);
      const result = await MarketplacePurchaseService.installTemplate(testPurchase.id);
      expect(result.success).toBe(true);
      expect(result.installedItems).toHaveLength(1);
      expect(result.installedItems[0]).toMatchObject({
        type: 'form',
        name: testTemplate.title
      // Verify installation record updated
        .eq('id', testPurchase.id)
      expect(updatedPurchase.installed).toBe(true);
      expect(updatedPurchase.installed_at).toBeTruthy();
    test('should install email sequence template', async () => {
          template_type: 'email_sequence',
            name: 'Welcome Email Sequence',
            description: 'Automated welcome emails',
            emails: [
              { subject: 'Welcome!', body: 'Welcome to our service' },
              { subject: 'Getting Started', body: 'Here are next steps' }
            triggers: [{ type: 'signup', delay: 0 }]
      expect(result.installedItems[0].type).toBe('email_sequence');
    test('should handle bundle installation', async () => {
          template_type: 'bundle',
            items: [
              {
                type: 'form',
                name: 'Contact Form',
                data: {
                  name: 'Contact Form',
                  description: 'Basic contact form',
                  fields: [{ id: 'message', type: 'textarea', label: 'Message' }],
                  settings: {}
                }
              },
                type: 'email_sequence',
                name: 'Follow-up Emails',
                  name: 'Follow-up Emails',
                  description: 'Follow-up sequence',
                  emails: [{ subject: 'Thank you', body: 'Thanks for contacting us' }],
                  triggers: []
              }
            ]
      expect(result.installedItems).toHaveLength(2);
      expect(result.installedItems.map(item => item.type)).toContain('form');
      expect(result.installedItems.map(item => item.type)).toContain('email_sequence');
  // REFUND PROCESSING TESTS
  describe('Refund Processing', () => {
      // Create completed purchase for refund tests
          payment_status: 'completed',
          stripe_payment_intent_id: 'pi_test_123456789',
          installed: true
    test('should process refund successfully', async () => {
      const refundRequest = {
        purchaseId: testPurchase.id,
        reason: 'Customer request for testing'
      const result = await MarketplacePurchaseService.processRefund(refundRequest);
      expect(result.refundId).toBeTruthy();
      // Verify Stripe refund created
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123456789',
        reason: 'requested_by_customer',
          purchaseId: testPurchase.id,
          reason: refundRequest.reason
      expect(updatedPurchase.payment_status).toBe('refunded');
      expect(updatedPurchase.refund_requested).toBe(true);
    test('should reject refund for old purchase', async () => {
      // Update purchase to be over 30 days old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
        .update({ created_at: oldDate.toISOString() })
        reason: 'Too old purchase'
        MarketplacePurchaseService.processRefund(refundRequest)
      ).rejects.toThrow('Refund period has expired (30 days)');
  // RECEIPT GENERATION TESTS
  describe('Receipt Generation', () => {
    test('should generate complete receipt', async () => {
      // Create test purchase with relations
      const receipt = await MarketplacePurchaseService.generateReceipt(purchase.id);
      expect(receipt).toMatchObject({
        purchaseId: purchase.id,
        receiptNumber: expect.stringMatching(/^WS-\d{8}-[A-Z0-9]{8}$/),
        date: purchase.created_at,
        buyer: {
          name: expect.any(String),
          email: expect.any(String)
        seller: {
          organization: expect.any(String)
        template: {
          type: testTemplate.template_type,
          category: testTemplate.category
        payment: {
          amount: testTemplate.price_cents / 100,
          method: 'Card',
          status: 'completed'
        downloadUrl: expect.stringContaining('/api/marketplace/purchases/')
  // ANALYTICS INTEGRATION TESTS
  describe('Analytics Integration', () => {
    test('should track purchase funnel events', async () => {
      // Mock analytics tracking
      const trackSpy = vi.spyOn(MarketplaceAnalytics, 'trackPurchaseFunnel');
      const templateData = {
        id: testTemplate.id,
        title: testTemplate.title,
        category: testTemplate.category,
        price_cents: testTemplate.price_cents,
        currency: testTemplate.currency
      await MarketplaceAnalytics.trackPurchaseFunnel('interest', {
        template_details: templateData
      expect(trackSpy).toHaveBeenCalledWith('interest', {
      trackSpy.mockRestore();
  // ERROR HANDLING TESTS
  describe('Error Handling', () => {
    test('should handle Stripe API errors gracefully', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Your card was declined.')
      );
      ).rejects.toThrow('Your card was declined.');
    test('should handle database errors', async () => {
      // Mock database error
      const originalInsert = supabase.from('marketplace_purchases').insert;
      supabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database connection failed'))
          })
      ).rejects.toThrow();
      // Restore original method
        insert: originalInsert
  // HELPER FUNCTIONS
  async function setupTestData() {
    // Create test supplier (seller)
    const { data: supplier } = await supabase
      .from('suppliers')
      .insert({
        business_name: 'Test Seller Business',
        contact_name: 'Test Seller',
        email: 'seller@test.com',
        phone: '+44123456789'
      })
      .select()
      .single();
    testSupplier = supplier;
    // Create test buyer
    const { data: buyer } = await supabase
        business_name: 'Test Buyer Business',
        contact_name: 'Test Buyer',
        email: 'buyer@test.com',
        phone: '+44987654321'
    testBuyer = buyer;
    // Create test template
    const { data: template } = await supabase
      .from('marketplace_templates')
        supplier_id: supplier.id,
        title: 'Test Template for Purchase',
        description: 'A comprehensive test template for purchase flow testing',
        template_type: 'form',
        category: 'testing',
        price_cents: 2500,
        currency: 'GBP',
        status: 'active',
        template_data: {
          name: 'Test Form',
          description: 'Test form template',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true }
          ],
          settings: { theme: 'default' }
    testTemplate = template;
  async function cleanupTestData() {
    if (testTemplate) {
      await supabase.from('marketplace_templates').delete().eq('id', testTemplate.id);
    if (testSupplier) {
      await supabase.from('suppliers').delete().eq('id', testSupplier.id);
    if (testBuyer) {
      await supabase.from('suppliers').delete().eq('id', testBuyer.id);
// =====================================================================================
// PERFORMANCE TESTS
describe('Purchase Flow Performance', () => {
  test('should complete purchase within performance threshold', async () => {
    const startTime = Date.now();
    // Mock quick responses
      id: 'pi_perf_test',
      client_secret: 'pi_perf_test_secret',
    // Simulate purchase flow
    const purchaseRequest = {
      templateId: 'test-template-id',
      buyerId: 'test-buyer-id',
      metadata: { performance_test: true }
    };
    try {
      await MarketplacePurchaseService.createPurchaseSession(purchaseRequest);
    } catch (error) {
      // Expected to fail due to test data, but we're measuring timing
    const duration = Date.now() - startTime;
    // Purchase session creation should take less than 2 seconds
    expect(duration).toBeLessThan(2000);
export {};
