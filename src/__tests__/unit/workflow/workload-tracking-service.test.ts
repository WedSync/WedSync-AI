import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkloadTrackingService } from '@/lib/services/workload-tracking-service';
import { TaskPriority, TaskCategory } from '@/types/workflow';

// Mock Supabase
const mockSupabase = {
  rpc: vi.fn()
};
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: () => mockSupabase
}));
vi.mock('next/headers', () => ({
  cookies: () => ({})
describe('WorkloadTrackingService', () => {
  let service: WorkloadTrackingService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkloadTrackingService();
  });
  describe('calculateWorkloadMetrics', () => {
    it('should return workload metrics for team members', async () => {
      const mockMetrics = [
        {
          team_member_id: 'member-1',
          team_member_name: 'John Doe',
          role: 'coordinator',
          specialty: 'venue',
          total_assigned_tasks: 5,
          active_tasks: 3,
          completed_tasks: 2,
          overdue_tasks: 1,
          estimated_hours_total: 40,
          estimated_hours_remaining: 24,
          capacity_utilization: 60,
          workload_score: 12.5,
          availability_status: 'available',
          avg_completion_time_days: 3.2,
          task_completion_rate: 85.5
        },
          team_member_id: 'member-2',
          team_member_name: 'Jane Smith',
          role: 'assistant',
          specialty: 'catering',
          total_assigned_tasks: 8,
          active_tasks: 6,
          overdue_tasks: 2,
          estimated_hours_total: 60,
          estimated_hours_remaining: 45,
          capacity_utilization: 112.5,
          workload_score: 28.0,
          availability_status: 'overloaded',
          avg_completion_time_days: 4.1,
          task_completion_rate: 75.0
        }
      ];
      mockSupabase.rpc.mockResolvedValue({
        data: mockMetrics,
        error: null
      });
      const result = await service.calculateWorkloadMetrics('wedding-123');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_workload_metrics', {
        wedding_id_param: 'wedding-123'
      expect(result).toEqual(mockMetrics);
      expect(result).toHaveLength(2);
      expect(result[0].availability_status).toBe('available');
      expect(result[1].availability_status).toBe('overloaded');
    });
    it('should handle empty team gracefully', async () => {
        data: [],
      const result = await service.calculateWorkloadMetrics('wedding-empty');
      expect(result).toEqual([]);
    it('should throw error on database failure', async () => {
        data: null,
        error: { message: 'Database connection failed' }
      await expect(
        service.calculateWorkloadMetrics('wedding-error')
      ).rejects.toThrow('Failed to calculate workload metrics');
  describe('suggestTeamMemberForTask', () => {
    it('should suggest best team member based on specialty and workload', async () => {
          team_member_name: 'Venue Expert',
          role: 'specialist',
          total_assigned_tasks: 3,
          active_tasks: 2,
          completed_tasks: 1,
          overdue_tasks: 0,
          estimated_hours_total: 30,
          estimated_hours_remaining: 16,
          capacity_utilization: 40,
          workload_score: 8.0,
          avg_completion_time_days: 2.5,
          task_completion_rate: 90.0
          team_member_name: 'General Coordinator',
          total_assigned_tasks: 6,
          active_tasks: 4,
          estimated_hours_total: 50,
          estimated_hours_remaining: 32,
          capacity_utilization: 80,
          workload_score: 18.0,
          availability_status: 'busy',
          avg_completion_time_days: 3.0,
          task_completion_rate: 85.0
      const suggestions = await service.suggestTeamMemberForTask(
        'wedding-123',
        TaskCategory.VENUE,
        TaskPriority.HIGH,
        8,
        '2024-12-31T23:59:59Z'
      );
      expect(suggestions).toHaveLength(2);
      
      // Venue expert should be ranked higher due to specialty match
      const venueExpert = suggestions.find(s => s.team_member_name === 'Venue Expert');
      const coordinator = suggestions.find(s => s.team_member_name === 'General Coordinator');
      expect(venueExpert).toBeDefined();
      expect(coordinator).toBeDefined();
      expect(venueExpert!.confidence_score).toBeGreaterThan(coordinator!.confidence_score);
      expect(venueExpert!.reasons).toContain('Specialized in venue');
    it('should consider workload impact in suggestions', async () => {
          team_member_id: 'member-low-load',
          team_member_name: 'Low Load Member',
          estimated_hours_remaining: 10,
          capacity_utilization: 25,
          task_completion_rate: 85.0,
          overdue_tasks: 0
        TaskPriority.MEDIUM,
        20 // Large task
      expect(suggestions[0].workload_impact).toBe('medium'); // Should be medium impact
      expect(suggestions[0].reasons).toContain('Has available capacity');
    it('should handle critical priority tasks differently', async () => {
          team_member_id: 'member-fast',
          team_member_name: 'Fast Worker',
          estimated_hours_remaining: 15,
          capacity_utilization: 50,
          task_completion_rate: 95.0,
          avg_completion_time_days: 1.5, // Very fast
      const criticalSuggestions = await service.suggestTeamMemberForTask(
        TaskPriority.CRITICAL,
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days deadline
      expect(criticalSuggestions[0].confidence_score).toBeGreaterThan(70);
  describe('analyzeTeamCapacity', () => {
    it('should analyze team capacity and identify bottlenecks', async () => {
      const mockCapacityData = {
        total_team_size: 5,
        total_capacity_hours: 200,
        allocated_hours: 180,
        remaining_capacity: 20,
        capacity_utilization: 90
      };
      const mockBottlenecks = [
          overallocation_percentage: 15.5,
          affected_tasks: 3
          overallocation_percentage: 8.2,
          affected_tasks: 2
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: mockCapacityData, error: null })
        .mockResolvedValueOnce({ data: mockBottlenecks, error: null });
      const result = await service.analyzeTeamCapacity('wedding-123');
      expect(result.wedding_id).toBe('wedding-123');
      expect(result.total_team_size).toBe(5);
      expect(result.capacity_utilization).toBe(90);
      expect(result.bottlenecks).toHaveLength(2);
      expect(result.recommendations).toContain(
        expect.stringContaining('high capacity utilization')
        expect.stringContaining('bottlenecks identified')
    it('should generate appropriate recommendations', async () => {
      const underutilizedCapacity = {
        total_team_size: 3,
        total_capacity_hours: 120,
        allocated_hours: 45,
        remaining_capacity: 75,
        capacity_utilization: 37.5
        .mockResolvedValueOnce({ data: underutilizedCapacity, error: null })
        .mockResolvedValueOnce({ data: [], error: null });
      const result = await service.analyzeTeamCapacity('wedding-underutilized');
        expect.stringContaining('significant available capacity')
    it('should handle overallocated teams', async () => {
      const overallocatedCapacity = {
        total_team_size: 2,
        total_capacity_hours: 80,
        allocated_hours: 100,
        remaining_capacity: -20,
        capacity_utilization: 125
        .mockResolvedValueOnce({ data: overallocatedCapacity, error: null })
      const result = await service.analyzeTeamCapacity('wedding-overallocated');
        expect.stringContaining('overallocated')
  describe('balanceWorkload', () => {
    it('should suggest task reassignments for workload balancing', async () => {
          team_member_id: 'overloaded-member',
          team_member_name: 'Overloaded Member',
          capacity_utilization: 120,
          workload_score: 35.0
          team_member_id: 'available-member',
          team_member_name: 'Available Member',
          capacity_utilization: 45,
          workload_score: 12.0
      // Mock reassignable tasks
      const mockTasks = [
          id: 'task-1',
          title: 'Venue inspection',
          category: 'venue',
          estimated_hours: 4,
          priority: 'medium'
          id: 'task-2',
          title: 'Vendor coordination',
          estimated_hours: 6,
          priority: 'high'
      // Mock supabase.from for task queries
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockTasks,
                  error: null
                })
              })
            })
          })
        })
      // Replace the original from method temporarily
      const originalFrom = service['supabase'].from;
      service['supabase'].from = mockFrom;
      const result = await service.balanceWorkload('wedding-123');
      expect(result.reassignments).toHaveLength(2);
      expect(result.reassignments[0].from_member).toBe('Overloaded Member');
      expect(result.reassignments[0].to_member).toBe('Available Member');
      expect(result.workload_improvement).toBeGreaterThan(0);
      // Restore original method
      service['supabase'].from = originalFrom;
    it('should return no reassignments when workload is balanced', async () => {
      const balancedMetrics = [
          team_member_name: 'Balanced Member 1',
          capacity_utilization: 70
          team_member_name: 'Balanced Member 2',
          capacity_utilization: 75
        data: balancedMetrics,
      const result = await service.balanceWorkload('wedding-balanced');
      expect(result.reassignments).toHaveLength(0);
      expect(result.workload_improvement).toBe(0);
  describe('getWorkloadTrends', () => {
    it('should return workload trends over time', async () => {
      const mockTrends = [
          date: '2024-01-01',
          total_active_tasks: 15,
          average_workload_score: 18.5,
          team_utilization: 75.0
          date: '2024-01-02',
          total_active_tasks: 18,
          average_workload_score: 22.1,
          team_utilization: 82.5
          date: '2024-01-03',
          total_active_tasks: 12,
          average_workload_score: 15.8,
          team_utilization: 68.0
        data: mockTrends,
      const result = await service.getWorkloadTrends('wedding-123', 7);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_workload_trends', {
        wedding_id_param: 'wedding-123',
        days_param: 7
      expect(result).toEqual(mockTrends);
      expect(result).toHaveLength(3);
    it('should use default days parameter', async () => {
      await service.getWorkloadTrends('wedding-123');
        days_param: 30
  describe('Assignment Confidence Calculation', () => {
    it('should calculate confidence scores correctly', () => {
      const service = new WorkloadTrackingService();
      // Test high confidence scenario
      const excellentMember = {
        team_member_id: 'member-1',
        team_member_name: 'Expert',
        role: 'specialist',
        specialty: 'venue',
        availability_status: 'available' as const,
        capacity_utilization: 75,
        task_completion_rate: 95,
        avg_completion_time_days: 2,
        overdue_tasks: 0
      // Test private method via accessing it
      const confidence = service['calculateAssignmentConfidence'](
        excellentMember as any,
      expect(confidence).toBeGreaterThan(80);
    it('should penalize overloaded members', () => {
      const overloadedMember = {
        team_member_id: 'member-2',
        team_member_name: 'Overloaded',
        role: 'coordinator',
        availability_status: 'overloaded' as const,
        capacity_utilization: 120,
        task_completion_rate: 70,
        avg_completion_time_days: 5,
        overdue_tasks: 3
        overloadedMember as any,
        8
      expect(confidence).toBeLessThan(50);
  describe('Workload Impact Assessment', () => {
    it('should assess workload impact correctly', () => {
      const lightLoadMember = {
        estimated_hours_remaining: 15,
        estimated_hours_total: 40
      const heavyLoadMember = {
        estimated_hours_remaining: 35,
      const lightImpact = service['assessWorkloadImpact'](lightLoadMember as any, 8);
      const heavyImpact = service['assessWorkloadImpact'](heavyLoadMember as any, 8);
      expect(lightImpact).toBe('low');
      expect(heavyImpact).toBe('high');
});
