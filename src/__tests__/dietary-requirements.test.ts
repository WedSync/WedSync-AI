/**
 * Test Suite for WS-152 Dietary Requirements Management
 * Team C Implementation - Batch 13
 * 
 * Tests:
 * - Critical alert system
 * - Export processing engine
 * - Safety integration layer
 * - Medical compliance
 * - Cross-contamination risk analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import {
  DietaryAlertService,
  AlertSeverity,
  DeliveryChannel,
  DietaryAlert
} from '../lib/alerts/dietary-alerts';
  CatererReportExporter,
  ExportFormat,
  CardLayout,
  GuestDietaryInfo
} from '../lib/export/caterer-reports';
  DietarySafetyIntegration,
  ComplianceStandard,
  ContaminationRisk,
  ProtocolType
} from '../lib/safety/dietary-safety-integration';
// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: vi.fn() })) })),
      select: jest.fn(() => ({ eq: vi.fn(), or: vi.fn() })),
      update: jest.fn(() => ({ eq: vi.fn() }))
    }))
  }))
}));
// Mock fetch for API calls
global.fetch = vi.fn();
describe('WS-152 Dietary Requirements Management - Team C', () => {
  let alertService: DietaryAlertService;
  let exportService: CatererReportExporter;
  let safetyIntegration: DietarySafetyIntegration;
  beforeEach(() => {
    // Initialize services
    alertService = new DietaryAlertService('mock-url', 'mock-key');
    exportService = new CatererReportExporter();
    safetyIntegration = new DietarySafetyIntegration();
    
    // Reset mocks
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('Critical Alert System', () => {
    describe('Life-Threatening Allergy Alerts', () => {
      it('should create critical alert with all notification channels', async () => {
        const alert: DietaryAlert = {
          guestId: 'guest-123',
          guestName: 'John Doe',
          restriction: 'Peanut Allergy',
          severity: AlertSeverity.LIFE_THREATENING,
          medicalNotes: 'Severe anaphylaxis risk',
          emergencyContact: {
            name: 'Jane Doe',
            phone: '555-0100',
            relationship: 'Spouse'
          },
          crossContaminationRisk: true,
          requiresEpipen: true,
          hospitalNearby: 'General Hospital - 5 miles',
          lastUpdated: new Date(),
          verifiedBy: 'nurse-456'
        };
        // Mock successful API responses
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          statusText: 'OK'
        });
        const alertId = await alertService.createCriticalAlert(alert);
        expect(alertId).toBeDefined();
        expect(alertId).toContain('alert_');
        
        // Verify all channels were attempted
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const endpoints = fetchCalls.map(call => call[0]);
        expect(endpoints).toContain('/api/sms/send');
        expect(endpoints).toContain('/api/email/send');
        expect(endpoints).toContain('/api/push/send');
      });
      it('should escalate failed life-threatening alerts', async () => {
          restriction: 'Shellfish Allergy',
          lastUpdated: new Date()
        // Mock all channels failing
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
        await expect(alertService.createCriticalAlert(alert)).rejects.toThrow();
        // Verify emergency escalation was attempted
        const emergencyCall = fetchCalls.find(call => 
          call[0] === '/api/emergency/escalate'
        );
        expect(emergencyCall).toBeDefined();
      it('should retry failed notifications with exponential backoff', async () => {
          guestId: 'guest-789',
          guestName: 'Alice Smith',
          restriction: 'Tree Nut Allergy',
          severity: AlertSeverity.CRITICAL,
        let attempts = 0;
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ ok: true, statusText: 'OK' });
        expect(attempts).toBeGreaterThanOrEqual(3);
      it('should handle multiple alerts in bulk processing', async () => {
        const guestList = [
          {
            id: 'guest-1',
            name: 'Guest One',
            dietaryRestrictions: [
              { type: 'Peanut allergy', requiresEpipen: true }
            ]
            id: 'guest-2',
            name: 'Guest Two',
              { type: 'Celiac disease', notes: 'Severe gluten intolerance' }
            id: 'guest-3',
            name: 'Guest Three',
              { type: 'Lactose intolerant' }
        ];
        await alertService.processEventDietaryAlerts('event-123', guestList);
        // Verify alerts were created for each guest
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });
    describe('Alert Severity Classification', () => {
      const testCases = [
        { restriction: 'peanut allergy', expected: AlertSeverity.LIFE_THREATENING },
        { restriction: 'shellfish intolerance', expected: AlertSeverity.LIFE_THREATENING },
        { restriction: 'celiac disease', expected: AlertSeverity.CRITICAL },
        { restriction: 'diabetic', expected: AlertSeverity.CRITICAL },
        { restriction: 'gluten intolerance', expected: AlertSeverity.HIGH },
        { restriction: 'vegetarian', expected: AlertSeverity.MEDIUM },
        { restriction: 'vegan preference', expected: AlertSeverity.MEDIUM }
      ];
      testCases.forEach(({ restriction, expected }) => {
        it(`should classify "${restriction}" as ${expected}`, () => {
          // Access private method through prototype
          const service = alertService as any;
          const severity = service.determineSeverity(restriction);
          expect(severity).toBe(expected);
  describe('Export Processing Engine', () => {
    describe('Kitchen Cards PDF Generation', () => {
      it('should generate PDF with critical allergy highlighting', async () => {
        const guests: GuestDietaryInfo[] = [
            name: 'John Doe',
            table: 'Table 1',
            mealChoice: 'Chicken',
            restrictions: [],
            allergies: [
              {
                allergen: 'Peanut',
                severity: AlertSeverity.LIFE_THREATENING,
                requiresEpipen: true,
                crossContaminationRisk: true
              }
            ],
            preferences: [],
            emergencyContact: {
              name: 'Jane Doe',
              phone: '555-0100'
            }
        const eventDetails = {
          eventName: 'Smith Wedding',
          eventDate: '2025-06-15'
        const config = {
          format: ExportFormat.PDF,
          layout: CardLayout.ALLERGEN_FOCUS,
          includeEmergencyContacts: true,
          includePhotos: false,
          groupByTable: true,
          highlightCritical: true,
          language: 'en',
          paperSize: 'A4' as const,
          orientation: 'portrait' as const,
          marginSize: 10,
          fontSize: 12,
          colorScheme: 'color' as const
        const pdfBlob = await exportService.generateKitchenCardsPDF(
          guests, 
          eventDetails, 
          config
        expect(pdfBlob).toBeInstanceOf(Blob);
        expect(pdfBlob.type).toBe('application/pdf');
      it('should group guests by table when requested', async () => {
            allergies: [],
            preferences: ['Vegetarian']
            preferences: ['Vegan']
            table: 'Table 2',
            preferences: []
          eventName: 'Test Event',
          eventDate: '2025-06-01'
          layout: CardLayout.STANDARD,
          includeEmergencyContacts: false,
          guests,
          eventDetails,
    describe('Dietary Matrix Excel Generation', () => {
      it('should create comprehensive Excel with multiple sheets', async () => {
            restrictions: [
              { type: 'Gluten Free', severity: AlertSeverity.HIGH, notes: 'Celiac' }
            preferences: ['No pork'],
            specialInstructions: 'Please ensure separate preparation'
          eventName: 'Test Wedding',
          eventDate: '2025-07-01'
          format: ExportFormat.EXCEL,
          groupByTable: false,
          orientation: 'landscape' as const,
          fontSize: 11,
        const excelBlob = await exportService.generateDietaryMatrixExcel(
        expect(excelBlob).toBeInstanceOf(Blob);
        expect(excelBlob.type).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      it('should validate export data before processing', () => {
        const invalidGuests = [
            name: '', // Invalid: empty name
        const validation = exportService.validateExportData(invalidGuests as unknown);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      it('should handle bulk export for multiple events', async () => {
        const events = [
          { id: 'event-1', eventName: 'Wedding 1', eventDate: '2025-06-01' },
          { id: 'event-2', eventName: 'Wedding 2', eventDate: '2025-06-15' }
        const exports = await exportService.processBulkExport(events, config);
        expect(exports).toBeInstanceOf(Map);
        expect(exports.size).toBe(2);
  describe('Safety Integration Layer', () => {
    describe('Medical Information Compliance', () => {
      it('should encrypt sensitive medical data', async () => {
        const guestData = {
          id: 'guest-123',
          name: 'John Doe',
          medicalConditions: ['Diabetes Type 1'],
          medications: ['Insulin'],
          allergies: ['Peanuts', 'Shellfish']
        const consentInfo = {
          given: true,
          date: new Date().toISOString(),
          purposes: ['catering', 'safety'],
          collectedBy: 'staff-456'
        const medicalInfo = await safetyIntegration.processMedicalInformation(
          guestData,
          consentInfo,
          [ComplianceStandard.HIPAA, ComplianceStandard.GDPR]
        expect(medicalInfo.encryptedData).toBeDefined();
        expect(medicalInfo.encryptedData).not.toContain('Diabetes');
        expect(medicalInfo.dataClassification).toBe('PHI');
      it('should reject processing without consent', async () => {
          allergies: ['Peanuts']
          given: false,
          date: new Date().toISOString()
        await expect(
          safetyIntegration.processMedicalInformation(
            guestData,
            consentInfo,
            [ComplianceStandard.GDPR]
          )
        ).rejects.toThrow('Medical information cannot be processed without consent');
      it('should ensure HIPAA compliance', async () => {
        const medicalData = {
          encryptedData: 'encrypted-string',
          auditLog: [{ action: 'ACCESS', timestamp: new Date() }],
          consentGiven: true
        const compliance = await safetyIntegration.ensureCompliance(
          medicalData,
          [ComplianceStandard.HIPAA]
        expect(compliance.compliant).toBe(true);
        expect(compliance.issues).toHaveLength(0);
      it('should ensure GDPR compliance', async () => {
          consentGiven: true,
          retentionPeriod: 90,
          allowedPurposes: ['catering']
          [ComplianceStandard.GDPR]
    describe('Kitchen Protocol Generation', () => {
      it('should generate comprehensive protocols for life-threatening allergies', async () => {
        const protocols = await safetyIntegration.generateKitchenProtocols(
          ['peanut', 'shellfish'],
          AlertSeverity.LIFE_THREATENING,
          { eventId: 'event-123' }
        expect(protocols.length).toBeGreaterThan(0);
        // Should have all protocol types for critical allergies
        const protocolTypes = protocols.map(p => p.type);
        expect(protocolTypes).toContain(ProtocolType.PREPARATION);
        expect(protocolTypes).toContain(ProtocolType.COOKING);
        expect(protocolTypes).toContain(ProtocolType.SERVING);
        expect(protocolTypes).toContain(ProtocolType.EMERGENCY);
        // Check critical protocols have verification steps
        const prepProtocol = protocols.find(p => p.type === ProtocolType.PREPARATION);
        expect(prepProtocol?.steps.some(s => s.verificationRequired)).toBe(true);
        expect(prepProtocol?.separationRequired).toBe(true);
      it('should generate standard protocols for lower severity restrictions', async () => {
          ['vegetarian'],
          AlertSeverity.LOW,
        // Should not have emergency protocol for low severity
        expect(protocolTypes).not.toContain(ProtocolType.EMERGENCY);
    describe('Cross-Contamination Risk Analysis', () => {
      it('should identify critical contamination risks', async () => {
        const allergens = ['peanut', 'shellfish', 'gluten'];
        const kitchenSetup = {
          hasSeparateAllergenArea: false,
          hasAllergenTraining: false,
          hasSharedFryer: true
        const menuItems = [
          { ingredients: ['peanut oil', 'flour', 'eggs'] },
          { ingredients: ['shrimp', 'butter', 'garlic'] }
        const riskMap = await safetyIntegration.analyzeCrossContaminationRisk(
          allergens,
          kitchenSetup,
          menuItems
        expect(riskMap.get('peanut')).toBe(ContaminationRisk.CRITICAL);
        expect(riskMap.get('shellfish')).toBe(ContaminationRisk.CRITICAL);
        expect(riskMap.get('gluten')).toBe(ContaminationRisk.CRITICAL);
      it('should identify no risk when allergen not in kitchen', async () => {
        const allergens = ['sesame'];
          hasSeparateAllergenArea: true,
          hasAllergenTraining: true,
          hasSharedFryer: false
          { ingredients: ['chicken', 'rice', 'vegetables'] }
        expect(riskMap.get('sesame')).toBe(ContaminationRisk.NONE);
    describe('Emergency System Integration', () => {
      it('should setup comprehensive emergency system', async () => {
        const venueDetails = {
          location: { lat: 40.7128, lng: -74.0060 },
            name: 'Venue Manager',
            phone: '555-0200'
          hasDefibrillator: true,
          defibrillatorLocation: 'Main entrance'
              { 
                allergen: 'Peanut'
              phone: '555-0101'
        const emergencySystem = await safetyIntegration.setupEmergencyIntegration(
          'event-123',
          venueDetails,
          guestList
        expect(emergencySystem.primaryContact).toBeDefined();
        expect(emergencySystem.nearestHospital).toBeDefined();
        expect(emergencySystem.emergencyServices.number).toBe('911');
        expect(emergencySystem.onSiteResources.length).toBeGreaterThan(0);
        // Should have EpiPen for life-threatening allergy
        const epipenResource = emergencySystem.onSiteResources.find(
          r => r.type === 'EPIPEN'
        expect(epipenResource).toBeDefined();
    describe('Compliance Reporting', () => {
      it('should generate compliance report', async () => {
        const report = await safetyIntegration.generateComplianceReport(
          new Date('2025-01-01'),
          new Date('2025-01-31')
        expect(report.eventId).toBe('event-123');
        expect(report.complianceStatus).toBe('COMPLIANT');
        expect(report.standardsMet).toContain(ComplianceStandard.HIPAA);
        expect(report.standardsMet).toContain(ComplianceStandard.GDPR);
        expect(report.recommendations.length).toBeGreaterThan(0);
  describe('Integration Tests', () => {
    it('should handle complete dietary alert workflow', async () => {
      // 1. Create alert
      const alert: DietaryAlert = {
        guestId: 'guest-integration',
        guestName: 'Integration Test',
        restriction: 'Severe Peanut Allergy',
        severity: AlertSeverity.LIFE_THREATENING,
        requiresEpipen: true,
        crossContaminationRisk: true,
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '555-9999',
          relationship: 'Parent'
        },
        lastUpdated: new Date()
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        statusText: 'OK'
      const alertId = await alertService.createCriticalAlert(alert);
      expect(alertId).toBeDefined();
      // 2. Generate kitchen protocols
      const protocols = await safetyIntegration.generateKitchenProtocols(
        ['peanut'],
        AlertSeverity.LIFE_THREATENING,
        { eventId: 'event-integration' }
      );
      expect(protocols.length).toBeGreaterThan(0);
      // 3. Generate export documents
      const guests: GuestDietaryInfo[] = [{
        id: alert.guestId,
        name: alert.guestName,
        restrictions: [],
        allergies: [{
          allergen: 'Peanut',
          severity: alert.severity,
          requiresEpipen: alert.requiresEpipen!,
          crossContaminationRisk: alert.crossContaminationRisk!
        }],
        preferences: [],
        emergencyContact: alert.emergencyContact
      }];
      const config = {
        format: ExportFormat.PDF,
        layout: CardLayout.ALLERGEN_FOCUS,
        includeEmergencyContacts: true,
        includePhotos: false,
        groupByTable: false,
        highlightCritical: true,
        language: 'en',
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        marginSize: 10,
        fontSize: 12,
        colorScheme: 'high-contrast' as const
      const pdfBlob = await exportService.generateKitchenCardsPDF(
        guests,
        { eventName: 'Integration Test Event', eventDate: '2025-06-01' },
        config
      expect(pdfBlob).toBeInstanceOf(Blob);
    it('should handle performance under load', async () => {
      // Generate 100 guests with various dietary requirements
      const guests: GuestDietaryInfo[] = [];
      for (let i = 0; i < 100; i++) {
        guests.push({
          id: `guest-${i}`,
          name: `Guest ${i}`,
          table: `Table ${Math.floor(i / 10) + 1}`,
          restrictions: i % 3 === 0 ? [
            { type: 'Gluten Free', severity: AlertSeverity.HIGH }
          ] : [],
          allergies: i % 5 === 0 ? [{
            allergen: 'Peanut',
            severity: i % 10 === 0 ? AlertSeverity.LIFE_THREATENING : AlertSeverity.MEDIUM,
            requiresEpipen: i % 10 === 0,
            crossContaminationRisk: i % 10 === 0
          }] : [],
          preferences: i % 2 === 0 ? ['Vegetarian'] : []
      }
      const startTime = Date.now();
      
        format: ExportFormat.EXCEL,
        layout: CardLayout.STANDARD,
        includeEmergencyContacts: false,
        groupByTable: true,
        orientation: 'landscape' as const,
        fontSize: 11,
        colorScheme: 'color' as const
      const excelBlob = await exportService.generateDietaryMatrixExcel(
        { eventName: 'Performance Test', eventDate: '2025-06-01' },
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      expect(excelBlob).toBeInstanceOf(Blob);
      expect(processingTime).toBeLessThan(5000); // Should process 100 guests in < 5 seconds
});
