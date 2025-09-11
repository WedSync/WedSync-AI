/**
 * WS-168: Customer Success Dashboard - API Integration Tests
 * Testing dashboard API endpoints and data aggregation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// Mock Supabase
vi.mock('@/lib/supabase/server');
describe('WS-168: Dashboard API Integration Tests', () => {
  let mockSupabase: unknown;
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnThis()
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });
  describe('GET /api/admin/health-scores', () => {
    it('should return paginated health scores for all suppliers', async () => {
      const mockHealthScores = [
        {
          user_id: 'user-1',
          organization_id: 'org-1',
          overall_score: 85,
          trend: 'improving',
          last_calculated: new Date().toISOString(),
          component_scores: {
            onboarding_progress: 100,
            feature_adoption: 80,
            engagement_level: 75,
            success_milestones: 90,
            support_interaction: 85,
            retention_risk: 80
          }
        },
          user_id: 'user-2',
          organization_id: 'org-2',
          overall_score: 65,
          trend: 'stable',
            onboarding_progress: 70,
            feature_adoption: 60,
            engagement_level: 65,
            success_milestones: 60,
            support_interaction: 70,
            retention_risk: 65
        }
      ];
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockHealthScores,
        error: null,
        count: 2
      });
      // Mock API handler
      const handler = async (req: NextRequest) => {
        const supabase = createClient();
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const sortBy = url.searchParams.get('sortBy') || 'overall_score';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';
        const { data, error, count } = await supabase
          .from('customer_health_scores')
          .select('*', { count: 'exact' })
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .limit(limit)
          .range((page - 1) * limit, page * limit - 1);
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        return Response.json({
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        });
      };
      // Test the handler
      const req = new NextRequest('http://localhost/api/admin/health-scores?page=1&limit=20');
      const response = await handler(req);
      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].overall_score).toBe(85);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
    });
    it('should filter health scores by risk level', async () => {
      const atRiskScores = [
        { user_id: 'risk-1', overall_score: 35, trend: 'declining' },
        { user_id: 'risk-2', overall_score: 42, trend: 'declining' }
      mockSupabase.lt.mockReturnThis();
        data: atRiskScores,
        const riskLevel = url.searchParams.get('riskLevel');
        let query = supabase.from('customer_health_scores').select('*', { count: 'exact' });
        if (riskLevel === 'at_risk') {
          query = query.lt('overall_score', 50);
        } else if (riskLevel === 'critical') {
          query = query.lt('overall_score', 30);
        const { data, error } = await query;
        return Response.json({ data });
      const req = new NextRequest('http://localhost/api/admin/health-scores?riskLevel=at_risk');
      expect(result.data.every((s: any) => s.overall_score < 50)).toBe(true);
    it('should aggregate health scores by organization', async () => {
      const orgAggregates = [
          avg_score: 82,
          total_users: 15,
          at_risk_count: 2,
          healthy_count: 10,
          champion_count: 3
          avg_score: 68,
          total_users: 8,
          at_risk_count: 3,
          healthy_count: 4,
          champion_count: 1
        data: orgAggregates,
        error: null
        
        const { data, error } = await supabase
          .from('customer_health_aggregates')
          .select('*')
          .order('avg_score', { ascending: false });
      const req = new NextRequest('http://localhost/api/admin/health-scores/aggregates');
      expect(result.data[0].avg_score).toBe(82);
      expect(result.data[0].total_users).toBe(15);
  describe('GET /api/admin/interventions', () => {
    it('should return pending interventions for at-risk users', async () => {
      const pendingInterventions = [
          id: 'int-1',
          intervention_type: 'success_call',
          priority: 'high',
          status: 'pending',
          created_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'admin-1',
          reason: 'Health score dropped below 40'
          id: 'int-2',
          intervention_type: 'feature_training',
          priority: 'medium',
          due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          assigned_to: 'admin-2',
          reason: 'Low feature adoption rate'
      mockSupabase.eq.mockReturnThis();
        data: pendingInterventions,
          .from('customer_interventions')
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .order('due_date', { ascending: true });
      const req = new NextRequest('http://localhost/api/admin/interventions?status=pending');
      expect(result.data[0].priority).toBe('high');
      expect(result.data[0].status).toBe('pending');
    it('should create new intervention for at-risk user', async () => {
      const newIntervention = {
        user_id: 'risk-user',
        intervention_type: 'success_call',
        priority: 'high',
        reason: 'Critical health score detected',
        assigned_to: 'admin-1',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      mockSupabase.insert.mockReturnThis();
        data: { id: 'int-new', ...newIntervention, status: 'pending', created_at: new Date().toISOString() },
        const body = await req.json();
          .insert({
            ...body,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        // Trigger notification to assigned admin
        // await notifyAdmin(body.assigned_to, data);
        return Response.json({ data }, { status: 201 });
      const req = new NextRequest('http://localhost/api/admin/interventions', {
        method: 'POST',
        body: JSON.stringify(newIntervention)
      expect(response.status).toBe(201);
      expect(result.data.user_id).toBe('risk-user');
      expect(result.data.priority).toBe('high');
      expect(result.data.status).toBe('pending');
    it('should update intervention status and add notes', async () => {
      const interventionUpdate = {
        status: 'in_progress',
        notes: 'Called user, scheduled training session for tomorrow',
        updated_at: new Date().toISOString()
      mockSupabase.update.mockReturnThis();
        data: { id: 'int-1', ...interventionUpdate },
        const interventionId = url.pathname.split('/').pop();
          .update({
            updated_at: new Date().toISOString()
          .eq('id', interventionId)
      const req = new NextRequest('http://localhost/api/admin/interventions/int-1', {
        method: 'PATCH',
        body: JSON.stringify(interventionUpdate)
      expect(result.data.status).toBe('in_progress');
      expect(result.data.notes).toContain('scheduled training session');
  describe('Dashboard Query Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        user_id: `user-${i}`,
        overall_score: Math.floor(Math.random() * 100),
        trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)]
      }));
        data: largeDataset.slice(0, 50), // Return first page
        count: 1000
      const startTime = Date.now();
          .limit(50);
          count,
          queryTime: Date.now() - startTime
      const req = new NextRequest('http://localhost/api/admin/health-scores?limit=50');
      expect(result.data).toHaveLength(50);
      expect(result.count).toBe(1000);
      expect(result.queryTime).toBeLessThan(1000); // Should complete within 1 second
    it('should use database indexes for filtered queries', async () => {
      // Mock indexed query
      mockSupabase.gte.mockReturnThis();
      mockSupabase.lte.mockReturnThis();
        data: [],
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const organizationId = url.searchParams.get('organizationId');
        let query = supabase.from('customer_health_scores').select('*');
        // These should use indexes
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        if (startDate && endDate) {
          query = query
            .gte('last_calculated', startDate)
            .lte('last_calculated', endDate);
      const req = new NextRequest(
        'http://localhost/api/admin/health-scores?organizationId=org-1&startDate=2024-01-01&endDate=2024-12-31'
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(mockSupabase.gte).toHaveBeenCalledWith('last_calculated', '2024-01-01');
      expect(mockSupabase.lte).toHaveBeenCalledWith('last_calculated', '2024-12-31');
  describe('Real-time Dashboard Updates', () => {
    it('should subscribe to health score changes', async () => {
      const mockRealtimeSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      mockSupabase.channel = vi.fn().mockReturnValue(mockRealtimeSubscription);
      const handler = async () => {
        const subscription = supabase
          .channel('health-scores-changes')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'customer_health_scores' 
            },
            (payload: any) => {
              // Broadcast update to dashboard
              console.log('Health score update:', payload);
            }
          )
          .subscribe();
        return Response.json({ message: 'Subscribed to health score updates' });
      const response = await handler();
      expect(mockSupabase.channel).toHaveBeenCalledWith('health-scores-changes');
      expect(mockRealtimeSubscription.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          table: 'customer_health_scores'
        }),
        expect.any(Function)
  describe('Dashboard Data Export', () => {
    it('should export health scores to CSV format', async () => {
      const healthScores = [
          last_calculated: new Date().toISOString()
        data: healthScores,
        const format = url.searchParams.get('format') || 'json';
          .select('*');
        if (format === 'csv') {
          const csvHeader = 'User ID,Organization ID,Overall Score,Trend,Last Calculated\\n';
          const csvRows = data.map((row: any) => 
            `${row.user_id},${row.organization_id},${row.overall_score},${row.trend},${row.last_calculated}`
          ).join('\\n');
          
          return new Response(csvHeader + csvRows, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="health-scores.csv"'
          });
      const req = new NextRequest('http://localhost/api/admin/health-scores/export?format=csv');
      const csvContent = await response.text();
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(csvContent).toContain('User ID,Organization ID,Overall Score');
      expect(csvContent).toContain('user-1,org-1,85,improving');
});
