/**
 * Dashboard Template Service Unit Tests
 * WS-065 Team B Round 2 Implementation
 * 
 * Comprehensive test coverage for DashboardTemplateService
 * Tests CRUD operations, validation, assignment logic, and performance tracking
 */

import { describe, it, expect, beforeEach, jest, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { DashboardTemplateService } from '@/lib/services/dashboardTemplateService';
// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  filter: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  overlaps: jest.fn(() => mockSupabase),
  contains: jest.fn(() => mockSupabase),
  rpc: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase)
};
describe('DashboardTemplateService', () => {
  let service: DashboardTemplateService;
  const supplierId = 'supplier-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardTemplateService(mockSupabase as any, supplierId);
  });
  afterEach(() => {
  describe('Template CRUD Operations', () => {
    describe('getTemplates', () => {
      it('should fetch all templates for supplier', async () => {
        const mockTemplates = [
          { id: '1', name: 'Luxury Template', category: 'luxury', is_active: true },
          { id: '2', name: 'Budget Template', category: 'budget', is_active: true }
        ];
        mockSupabase.single.mockResolvedValue({ data: mockTemplates, error: null });
        const result = await service.getTemplates();
        expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_templates');
        expect(mockSupabase.select).toHaveBeenCalledWith('*');
        expect(mockSupabase.eq).toHaveBeenCalledWith('supplier_id', supplierId);
        expect(mockSupabase.order).toHaveBeenCalledWith('sort_order', { ascending: true });
        expect(result).toEqual(mockTemplates);
      });
      it('should filter templates by category', async () => {
          { id: '1', name: 'Luxury Template', category: 'luxury' }
        await service.getTemplates({ category: 'luxury' });
        expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'luxury');
      it('should filter templates by active status', async () => {
          { id: '1', name: 'Active Template', is_active: true }
        await service.getTemplates({ is_active: true });
        expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      it('should handle database errors', async () => {
        mockSupabase.single.mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        });
        await expect(service.getTemplates()).rejects.toThrow('Failed to fetch templates: Database connection failed');
    });
    describe('getTemplateById', () => {
      it('should fetch template with sections', async () => {
        const mockTemplate = { id: '1', name: 'Test Template' };
        const mockSections = [
          { id: 's1', section_type: 'welcome', title: 'Welcome' },
          { id: 's2', section_type: 'timeline', title: 'Timeline' }
        mockSupabase.single
          .mockResolvedValueOnce({ data: mockTemplate, error: null })
          .mockResolvedValueOnce({ data: mockSections, error: null });
        const result = await service.getTemplateById('1');
        expect(result).toEqual({
          template: mockTemplate,
          sections: mockSections
      it('should return null for non-existent template', async () => {
          error: { code: 'PGRST116' } 
        const result = await service.getTemplateById('999');
        expect(result).toBeNull();
          error: { message: 'Connection timeout' } 
        await expect(service.getTemplateById('1')).rejects.toThrow('Failed to fetch template: Connection timeout');
    describe('createTemplate', () => {
      it('should create template with sections', async () => {
        const templateData = {
          name: 'New Template',
          description: 'Test description',
          category: 'luxury' as const,
          brand_color: '#7F56D9',
          is_active: true,
          is_default: false,
          priority_loading: false,
          cache_duration_minutes: 5,
          target_criteria: {},
          assignment_rules: []
        };
        const sectionsData = [
          {
            section_type: 'welcome' as const,
            title: 'Welcome Section',
            position_x: 0,
            position_y: 0,
            width: 12,
            height: 4,
            is_active: true,
            is_required: false,
            sort_order: 0,
            section_config: {}
          }
        const mockCreatedTemplate = { id: '1', ...templateData };
        const mockCreatedSections = [{ id: 's1', template_id: '1', ...sectionsData[0] }];
          .mockResolvedValueOnce({ data: mockCreatedTemplate, error: null })
          .mockResolvedValueOnce({ data: mockCreatedSections, error: null });
        const result = await service.createTemplate(templateData, sectionsData);
          template: mockCreatedTemplate,
          sections: mockCreatedSections
      it('should validate template data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          description: 'Test',
          brand_color: 'invalid-color', // Invalid: not hex color
        await expect(service.createTemplate(invalidData, [])).rejects.toThrow();
      it('should clean up template if sections creation fails', async () => {
          name: 'Test Template',
            title: 'Welcome',
          .mockResolvedValueOnce({ data: null, error: { message: 'Sections failed' } });
        await expect(service.createTemplate(templateData, sectionsData)).rejects.toThrow();
        
        // Verify cleanup
        expect(mockSupabase.delete).toHaveBeenCalled();
    describe('updateTemplate', () => {
      it('should update template and replace sections', async () => {
        const templateId = '1';
        const updateData = { name: 'Updated Template' };
        const newSections = [
            section_type: 'timeline' as const,
            title: 'New Timeline',
            height: 6,
        const mockExistingTemplate = { id: templateId };
        const mockUpdatedTemplate = { id: templateId, name: 'Updated Template' };
        const mockCreatedSections = [{ id: 's2', template_id: templateId, ...newSections[0] }];
          .mockResolvedValueOnce({ data: mockExistingTemplate, error: null })
          .mockResolvedValueOnce({ data: mockUpdatedTemplate, error: null })
        const result = await service.updateTemplate(templateId, updateData, newSections);
          template: mockUpdatedTemplate,
        // Verify sections were deleted and recreated
      it('should deny access to templates from other suppliers', async () => {
        await expect(service.updateTemplate('999', {})).rejects.toThrow('Template not found or access denied');
    describe('deleteTemplate', () => {
      it('should delete template after checking assignments', async () => {
        const mockTemplate = { id: templateId };
        const mockAssignments = []; // No active assignments
          .mockResolvedValueOnce({ data: mockAssignments, error: null })
          .mockResolvedValueOnce({ error: null });
        await service.deleteTemplate(templateId);
      it('should prevent deletion of templates with active assignments', async () => {
        const mockAssignments = [{ id: 'a1', template_id: templateId }]; // Active assignment
          .mockResolvedValueOnce({ data: mockAssignments, error: null });
        await expect(service.deleteTemplate(templateId)).rejects.toThrow('Cannot delete template that is currently assigned to clients');
  describe('Section Library', () => {
    describe('getSectionLibrary', () => {
      it('should fetch all active sections', async () => {
          { id: '1', section_type: 'welcome', name: 'Welcome Message', is_active: true },
          { id: '2', section_type: 'timeline', name: 'Timeline', is_active: true }
        mockSupabase.single.mockResolvedValue({ data: mockSections, error: null });
        const result = await service.getSectionLibrary();
        expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_section_library');
        expect(result).toEqual(mockSections);
      it('should filter by category', async () => {
          { id: '1', section_type: 'welcome', category: 'communication' }
        await service.getSectionLibrary({ category: 'communication' });
        expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'communication');
      it('should filter by client types', async () => {
        mockSupabase.single.mockResolvedValue({ data: [], error: null });
        await service.getSectionLibrary({ client_types: ['luxury', 'standard'] });
        expect(mockSupabase.overlaps).toHaveBeenCalledWith('client_types', ['luxury', 'standard']);
      it('should filter by wedding stage', async () => {
        await service.getSectionLibrary({ wedding_stage: 'planning' });
        expect(mockSupabase.contains).toHaveBeenCalledWith('wedding_stage', ['planning']);
  describe('Template Assignment', () => {
    describe('assignTemplateToClient', () => {
      it('should assign template to client', async () => {
        const clientId = 'client-123';
        const templateId = 'template-456';
        const mockTemplate = { id: templateId, is_active: true };
        const mockAssignment = { 
          id: 'assignment-789',
          client_id: clientId,
          template_id: templateId,
          supplier_id: supplierId
          .mockResolvedValueOnce({ data: mockAssignment, error: null });
        const result = await service.assignTemplateToClient(clientId, templateId);
        expect(result).toEqual(mockAssignment);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_template_usage', {
          template_id: templateId
      it('should reject assignment of inactive template', async () => {
        const mockTemplate = { id: 'template-456', is_active: false };
        mockSupabase.single.mockResolvedValue({ data: mockTemplate, error: null });
        await expect(service.assignTemplateToClient('client-123', 'template-456'))
          .rejects.toThrow('Cannot assign inactive template');
      it('should support custom configurations', async () => {
        const customizations = {
          sections: [{ section_id: 's1', config: { custom: true } }],
          branding: { color: '#FF0000' },
          config: { feature: 'enabled' }
        const mockAssignment = { id: 'assignment-789' };
        await service.assignTemplateToClient(clientId, templateId, 'manual', customizations);
        const expectedAssignmentData = {
          supplier_id: supplierId,
          assignment_reason: 'manual',
          custom_sections: customizations.sections,
          custom_branding: customizations.branding,
          custom_config: customizations.config,
          is_active: true
        expect(mockSupabase.upsert).toHaveBeenCalledWith(expectedAssignmentData, {
          onConflict: 'client_id,supplier_id'
    describe('getClientTemplate', () => {
      it('should fetch client assigned template', async () => {
        const mockAssignment = {
          dashboard_templates: { id: 'template-456', name: 'Luxury Template' },
          dashboard_template_sections: [
            { id: 's1', section_type: 'welcome' }
          ]
        mockSupabase.single.mockResolvedValue({ data: mockAssignment, error: null });
        const result = await service.getClientTemplate(clientId);
      it('should return null if no template assigned', async () => {
        const result = await service.getClientTemplate('client-123');
    describe('autoAssignTemplate', () => {
      it('should call database function for auto-assignment', async () => {
        const clientData = {
          budget_range: 'luxury',
          guest_count: 150,
          venue_type: 'estate',
          wedding_style: 'traditional'
        mockSupabase.rpc.mockResolvedValue({ data: 'template-456', error: null });
          data: { assignment: mockAssignment }, 
          error: null 
        const result = await service.autoAssignTemplate(clientId, clientData);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('auto_assign_template_to_client', {
          p_client_id: clientId,
          p_supplier_id: supplierId
      it('should return null if no matching template found', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
        const result = await service.autoAssignTemplate('client-123', {});
  describe('Performance Tracking', () => {
    describe('trackTemplatePerformance', () => {
      it('should record performance metrics', async () => {
        const metrics = {
          render_time_ms: 250,
          cache_hit: true,
          sections_count: 5,
          data_load_time_ms: 100
          .mockResolvedValueOnce({ error: null })
        await service.trackTemplatePerformance('template-123', 'client-456', metrics);
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          template_id: 'template-123',
          client_id: 'client-456',
          ...metrics,
          measured_at: expect.any(String)
        expect(mockSupabase.rpc).toHaveBeenCalledWith('update_assignment_render_stats', {
          p_client_id: 'client-456',
          p_template_id: 'template-123',
          p_render_time: 250
      it('should handle tracking errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
        mockSupabase.single.mockResolvedValue({ error: { message: 'Tracking failed' } });
        await service.trackTemplatePerformance('template-123', 'client-456', {
          render_time_ms: 250
        expect(consoleSpy).toHaveBeenCalledWith('Failed to track template performance:', { message: 'Tracking failed' });
        consoleSpy.mockRestore();
    describe('getTemplateAnalytics', () => {
      it('should fetch analytics from materialized view', async () => {
        const mockAnalytics = [
            id: 'template-1',
            name: 'Luxury Template',
            category: 'luxury',
            clients_count: 25,
            render_count: 150,
            avg_render_time: 180,
            usage_category: 'high_usage',
            performance_category: 'fast'
        mockSupabase.single.mockResolvedValue({ data: mockAnalytics, error: null });
        const result = await service.getTemplateAnalytics();
        expect(result.templates).toEqual(mockAnalytics);
        expect(result.summary.total_templates).toBe(1);
        expect(result.summary.active_assignments).toBe(25);
        expect(result.summary.avg_render_time).toBe(180);
        expect(result.summary.performance_score).toBe(100); // 1 fast template / 1 total * 100
      it('should filter by template ID', async () => {
        await service.getTemplateAnalytics('template-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'template-123');
  describe('Template Duplication', () => {
    describe('duplicateTemplate', () => {
      it('should create copy of existing template', async () => {
        const originalTemplate = {
          id: 'original-123',
          name: 'Original Template',
          description: 'Original description',
          category: 'luxury',
          is_default: true,
          sort_order: 1
        const originalSections = [
            id: 's1',
            template_id: 'original-123',
            section_type: 'welcome',
            title: 'Welcome'
        const duplicatedTemplate = {
          id: 'duplicate-456',
          name: 'Copy of Original Template',
          sort_order: 999
        // Mock getTemplateById
          .mockResolvedValueOnce({ data: originalTemplate, error: null })
          .mockResolvedValueOnce({ data: originalSections, error: null })
          // Mock createTemplate
          .mockResolvedValueOnce({ data: duplicatedTemplate, error: null })
          .mockResolvedValueOnce({ data: [], error: null });
        const result = await service.duplicateTemplate('original-123', 'Copy of Original Template');
        expect(result.name).toBe('Copy of Original Template');
        expect(result.is_default).toBe(false);
        expect(result.sort_order).toBe(999);
      it('should handle non-existent template', async () => {
        mockSupabase.single.mockResolvedValue({ data: null, error: null });
        await expect(service.duplicateTemplate('999', 'Copy')).rejects.toThrow('Template not found');
  describe('Validation', () => {
    it('should validate dashboard template schema', async () => {
      const validData = {
        name: 'Valid Template',
        description: 'Valid description',
        category: 'luxury' as const,
        brand_color: '#7F56D9',
        is_active: true,
        is_default: false,
        priority_loading: false,
        cache_duration_minutes: 5,
        target_criteria: {},
        assignment_rules: []
      };
      mockSupabase.single.mockResolvedValue({ data: { id: '1', ...validData }, error: null });
      await expect(service.createTemplate(validData, [])).resolves.toBeDefined();
    it('should reject invalid template data', async () => {
      const invalidData = {
        name: '', // Empty name
        description: '',
        category: 'invalid' as any,
        brand_color: 'not-a-color',
        is_active: 'not-boolean' as any,
        is_default: 'not-boolean' as any,
        priority_loading: 'not-boolean' as any,
        cache_duration_minutes: -1, // Negative
      await expect(service.createTemplate(invalidData, [])).rejects.toThrow();
    it('should validate dashboard section schema', async () => {
      const validTemplateData = {
        name: 'Template',
        description: 'Description',
      const invalidSectionData = [
        {
          section_type: 'invalid' as any,
          title: '',
          position_x: -1,
          position_y: -1,
          width: 0,
          height: 0,
          is_active: 'not-boolean' as any,
          is_required: 'not-boolean' as any,
          sort_order: 0,
          section_config: {}
        }
      ];
      await expect(service.createTemplate(validTemplateData, invalidSectionData)).rejects.toThrow();
  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network timeout'));
      await expect(service.getTemplates()).rejects.toThrow('Network timeout');
    it('should handle malformed responses', async () => {
      mockSupabase.single.mockResolvedValue({ data: 'not-an-array', error: null });
      const result = await service.getTemplates();
      expect(result).toEqual([]);
    it('should handle permission errors', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Insufficient permissions' } 
      await expect(service.getTemplateById('1')).rejects.toThrow('Failed to fetch template: Insufficient permissions');
});
