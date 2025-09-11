import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { RBACManager } from '@/lib/scalability/security/rbac-manager';
import type {
  AccessRequest,
  AccessResult,
  SecurityAuditLog,
  RoleDefinition,
  PermissionDefinition,
  User,
  ScalabilityContext,
} from '@/lib/scalability/types/core';

describe('RBAC Security Manager', () => {
  let rbacManager: RBACManager;
  let mockAuditLogger: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock audit logger
    mockAuditLogger = {
      logAccess: jest.fn(),
      logSecurityEvent: jest.fn(),
      logPermissionChange: jest.fn(),
    };

    rbacManager = new RBACManager();
    (rbacManager as any).auditLogger = mockAuditLogger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkAccess', () => {
    it('should grant access to scalability admin for all operations', async () => {
      // Arrange
      const adminUser: User = {
        id: 'admin-123',
        email: 'admin@wedsync.com',
        roles: ['scalability_admin'],
        permissions: [
          'scalability:read',
          'scalability:write',
          'scalability:execute',
          'scalability:emergency',
          'scalability:configure',
        ],
        organizationId: 'org-wedsync',
      };

      const accessRequest: AccessRequest = {
        user: adminUser,
        resource: 'scalability_engine',
        action: 'execute_scaling',
        context: {
          urgency: 'high',
          affectedServices: ['api', 'database'],
          reason: 'wedding_day_preparation',
        },
      };

      // Act
      const result: AccessResult = await rbacManager.checkAccess(accessRequest);

      // Assert
      expect(result.granted).toBe(true);
      expect(result.reason).toContain('scalability_admin');
      expect(result.permissions).toContain('scalability:execute');
      expect(mockAuditLogger.logAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-123',
          action: 'execute_scaling',
          granted: true,
        }),
      );
    });

    it('should grant limited access to scalability operator', async () => {
      // Arrange
      const operatorUser: User = {
        id: 'operator-456',
        email: 'operator@wedsync.com',
        roles: ['scalability_operator'],
        permissions: [
          'scalability:read',
          'scalability:scale_standard',
          'scalability:monitor',
        ],
        organizationId: 'org-wedsync',
      };

      const standardScalingRequest: AccessRequest = {
        user: operatorUser,
        resource: 'scalability_engine',
        action: 'scale_standard',
        context: {
          urgency: 'medium',
          affectedServices: ['api'],
          reason: 'load_increase',
        },
      };

      // Act
      const result = await rbacManager.checkAccess(standardScalingRequest);

      // Assert
      expect(result.granted).toBe(true);
      expect(result.permissions).toContain('scalability:scale_standard');
      expect(result.limitedAccess).toBe(true);
    });

    it('should deny emergency scaling to operator without emergency permissions', async () => {
      // Arrange
      const operatorUser: User = {
        id: 'operator-456',
        email: 'operator@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
        organizationId: 'org-wedsync',
      };

      const emergencyRequest: AccessRequest = {
        user: operatorUser,
        resource: 'scalability_engine',
        action: 'emergency_scale',
        context: {
          urgency: 'critical',
          affectedServices: ['api', 'database', 'storage'],
          reason: 'wedding_day_emergency',
          emergencyMode: true,
        },
      };

      // Act
      const result = await rbacManager.checkAccess(emergencyRequest);

      // Assert
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('insufficient_permissions');
      expect(result.requiredPermissions).toContain('scalability:emergency');
      expect(mockAuditLogger.logAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'operator-456',
          action: 'emergency_scale',
          granted: false,
          deniedReason: expect.stringContaining('emergency'),
        }),
      );
    });

    it('should grant wedding coordinator special access on wedding days', async () => {
      // Arrange
      const weddingCoordinator: User = {
        id: 'coordinator-789',
        email: 'coordinator@wedsync.com',
        roles: ['wedding_coordinator', 'scalability_viewer'],
        permissions: [
          'scalability:read',
          'scalability:wedding_priority',
          'scalability:monitor',
        ],
        organizationId: 'org-wedsync',
      };

      const weddingDayRequest: AccessRequest = {
        user: weddingCoordinator,
        resource: 'performance_monitor',
        action: 'monitor_wedding',
        context: {
          weddingDayActive: true,
          affectedWeddings: ['wedding-123', 'wedding-456'],
          urgency: 'high',
          timeContext: 'wedding_day',
        },
      };

      // Act
      const result = await rbacManager.checkAccess(weddingDayRequest);

      // Assert
      expect(result.granted).toBe(true);
      expect(result.specialContext).toBe('wedding_day');
      expect(result.permissions).toContain('scalability:wedding_priority');
      expect(result.contextualAccess).toBe(true);
    });

    it('should deny access to unauthorized users', async () => {
      // Arrange
      const unauthorizedUser: User = {
        id: 'user-999',
        email: 'user@wedsync.com',
        roles: ['basic_user'],
        permissions: ['user:read', 'user:write'],
        organizationId: 'org-wedsync',
      };

      const scalingRequest: AccessRequest = {
        user: unauthorizedUser,
        resource: 'scalability_engine',
        action: 'execute_scaling',
        context: { urgency: 'low' },
      };

      // Act
      const result = await rbacManager.checkAccess(scalingRequest);

      // Assert
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('unauthorized');
      expect(result.requiredRoles).toContain('scalability_operator');
    });

    it('should handle time-based access restrictions', async () => {
      // Arrange
      const operatorUser: User = {
        id: 'operator-night-123',
        email: 'night-operator@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
        organizationId: 'org-wedsync',
        accessRestrictions: {
          timeRestrictions: {
            allowedHours: [9, 17], // 9 AM to 5 PM only
            timezone: 'UTC',
          },
        },
      };

      // Mock current time to be outside allowed hours (e.g., 2 AM)
      const mockDate = new Date();
      mockDate.setUTCHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const nightTimeRequest: AccessRequest = {
        user: operatorUser,
        resource: 'scalability_engine',
        action: 'scale_standard',
        context: { urgency: 'medium' },
      };

      // Act
      const result = await rbacManager.checkAccess(nightTimeRequest);

      // Assert
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('time_restricted');
      expect(result.timeRestrictionViolation).toBe(true);
    });

    it('should bypass time restrictions during wedding emergencies', async () => {
      // Arrange
      const emergencyResponder: User = {
        id: 'emergency-responder-123',
        email: 'emergency@wedsync.com',
        roles: ['wedding_emergency_responder', 'scalability_admin'],
        permissions: [
          'scalability:emergency',
          'scalability:wedding_priority',
          'scalability:bypass_restrictions',
        ],
        organizationId: 'org-wedsync',
        accessRestrictions: {
          timeRestrictions: {
            allowedHours: [8, 20],
            timezone: 'UTC',
          },
          emergencyBypass: true,
        },
      };

      // Mock time outside normal hours
      const mockDate = new Date();
      mockDate.setUTCHours(3, 0, 0, 0); // 3 AM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const emergencyRequest: AccessRequest = {
        user: emergencyResponder,
        resource: 'scalability_engine',
        action: 'emergency_scale',
        context: {
          urgency: 'critical',
          emergencyMode: true,
          weddingDayActive: true,
          reason: 'wedding_site_down',
        },
      };

      // Act
      const result = await rbacManager.checkAccess(emergencyRequest);

      // Assert
      expect(result.granted).toBe(true);
      expect(result.emergencyBypass).toBe(true);
      expect(result.reason).toContain('emergency_override');
    });
  });

  describe('validateRole', () => {
    it('should validate role hierarchy correctly', async () => {
      // Arrange
      const adminRole: RoleDefinition = {
        name: 'scalability_admin',
        permissions: [
          'scalability:read',
          'scalability:write',
          'scalability:execute',
          'scalability:emergency',
          'scalability:configure',
        ],
        hierarchy: 1, // Highest level
        description: 'Full scalability system access',
      };

      const operatorRole: RoleDefinition = {
        name: 'scalability_operator',
        permissions: [
          'scalability:read',
          'scalability:scale_standard',
          'scalability:monitor',
        ],
        hierarchy: 2,
        inheritsFrom: ['scalability_viewer'],
        description: 'Standard scaling operations',
      };

      const viewerRole: RoleDefinition = {
        name: 'scalability_viewer',
        permissions: ['scalability:read', 'scalability:monitor'],
        hierarchy: 3,
        description: 'Read-only access to scalability metrics',
      };

      // Act
      const adminValid = await rbacManager.validateRole(adminRole);
      const operatorValid = await rbacManager.validateRole(operatorRole);
      const viewerValid = await rbacManager.validateRole(viewerRole);

      // Assert
      expect(adminValid.valid).toBe(true);
      expect(operatorValid.valid).toBe(true);
      expect(viewerValid.valid).toBe(true);
      expect(adminValid.hierarchyLevel).toBe(1);
      expect(operatorValid.inheritedPermissions).toContain('scalability:read');
    });

    it('should detect invalid role configurations', async () => {
      // Arrange
      const invalidRole: RoleDefinition = {
        name: 'invalid_role',
        permissions: ['invalid:permission', 'scalability:nonexistent'],
        hierarchy: 0, // Invalid hierarchy level
        inheritsFrom: ['nonexistent_role'],
        description: 'Invalid role for testing',
      };

      // Act
      const result = await rbacManager.validateRole(invalidRole);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid_hierarchy');
      expect(result.errors).toContain('invalid_permissions');
      expect(result.errors).toContain('invalid_inheritance');
    });
  });

  describe('auditAccessAttempt', () => {
    it('should create comprehensive audit log for access attempts', async () => {
      // Arrange
      const user: User = {
        id: 'audit-user-123',
        email: 'test@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
        organizationId: 'org-wedsync',
      };

      const accessRequest: AccessRequest = {
        user,
        resource: 'scalability_engine',
        action: 'scale_up',
        context: {
          urgency: 'medium',
          affectedServices: ['api', 'database'],
          reason: 'increased_load',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (compatible; ScalabilityClient/1.0)',
          sessionId: 'session-abc-123',
        },
      };

      const accessResult: AccessResult = {
        granted: true,
        reason: 'sufficient_permissions',
        permissions: ['scalability:scale_standard'],
        executionTime: 150,
      };

      // Act
      await rbacManager.auditAccessAttempt(accessRequest, accessResult);

      // Assert
      expect(mockAuditLogger.logAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'audit-user-123',
          userEmail: 'test@wedsync.com',
          resource: 'scalability_engine',
          action: 'scale_up',
          granted: true,
          ipAddress: '192.168.1.100',
          userAgent: expect.stringContaining('ScalabilityClient'),
          sessionId: 'session-abc-123',
          executionTime: 150,
          context: expect.objectContaining({
            urgency: 'medium',
            affectedServices: ['api', 'database'],
          }),
        }),
      );
    });

    it('should flag suspicious access patterns', async () => {
      // Arrange - Multiple rapid access attempts from same user
      const suspiciousUser: User = {
        id: 'suspicious-user-456',
        email: 'suspicious@wedsync.com',
        roles: ['scalability_viewer'],
        permissions: ['scalability:read'],
        organizationId: 'org-wedsync',
      };

      const baseRequest: AccessRequest = {
        user: suspiciousUser,
        resource: 'scalability_engine',
        action: 'read_metrics',
        context: { urgency: 'low' },
      };

      // Act - Simulate rapid successive requests
      const requests = Array(10)
        .fill(null)
        .map((_, index) => ({
          ...baseRequest,
          context: { ...baseRequest.context, requestId: `req-${index}` },
        }));

      for (const request of requests) {
        await rbacManager.checkAccess(request);
      }

      // Assert
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'suspicious_activity',
          userId: 'suspicious-user-456',
          description: expect.stringContaining('rapid_requests'),
          severity: 'medium',
        }),
      );
    });

    it('should track failed authentication attempts', async () => {
      // Arrange
      const unauthorizedUser: User = {
        id: 'unauthorized-789',
        email: 'unauthorized@wedsync.com',
        roles: ['basic_user'],
        permissions: ['user:read'],
        organizationId: 'org-other',
      };

      const deniedRequest: AccessRequest = {
        user: unauthorizedUser,
        resource: 'scalability_engine',
        action: 'emergency_scale',
        context: {
          urgency: 'critical',
          attemptCount: 3, // Multiple attempts
          ipAddress: '10.0.0.50',
        },
      };

      // Act
      await rbacManager.checkAccess(deniedRequest);

      // Assert
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'access_denied',
          userId: 'unauthorized-789',
          resource: 'scalability_engine',
          action: 'emergency_scale',
          severity: 'high', // High severity for emergency access attempts
          ipAddress: '10.0.0.50',
          multipleAttempts: true,
        }),
      );
    });
  });

  describe('getEffectivePermissions', () => {
    it('should calculate effective permissions from multiple roles', async () => {
      // Arrange
      const multiRoleUser: User = {
        id: 'multi-role-123',
        email: 'multi@wedsync.com',
        roles: [
          'scalability_operator',
          'wedding_coordinator',
          'scalability_viewer',
        ],
        permissions: [], // Permissions should be calculated from roles
        organizationId: 'org-wedsync',
      };

      // Act
      const effectivePermissions =
        await rbacManager.getEffectivePermissions(multiRoleUser);

      // Assert
      expect(effectivePermissions).toContain('scalability:read');
      expect(effectivePermissions).toContain('scalability:scale_standard');
      expect(effectivePermissions).toContain('scalability:wedding_priority');
      expect(effectivePermissions).toContain('scalability:monitor');
      expect(effectivePermissions.length).toBeGreaterThan(3);
    });

    it('should handle role inheritance properly', async () => {
      // Arrange
      const inheritanceUser: User = {
        id: 'inherit-456',
        email: 'inherit@wedsync.com',
        roles: ['scalability_operator'], // This role inherits from scalability_viewer
        permissions: [],
        organizationId: 'org-wedsync',
      };

      // Act
      const effectivePermissions =
        await rbacManager.getEffectivePermissions(inheritanceUser);

      // Assert
      expect(effectivePermissions).toContain('scalability:read'); // From inherited role
      expect(effectivePermissions).toContain('scalability:monitor'); // From inherited role
      expect(effectivePermissions).toContain('scalability:scale_standard'); // From operator role
    });

    it('should apply organization-specific permission restrictions', async () => {
      // Arrange
      const restrictedOrgUser: User = {
        id: 'restricted-789',
        email: 'restricted@partner.com',
        roles: ['scalability_admin'],
        permissions: [],
        organizationId: 'org-partner', // Different organization with restrictions
        organizationRestrictions: {
          allowedResources: ['performance_monitor'],
          deniedActions: ['emergency_scale', 'configure_system'],
        },
      };

      // Act
      const effectivePermissions =
        await rbacManager.getEffectivePermissions(restrictedOrgUser);

      // Assert
      expect(effectivePermissions).not.toContain('scalability:emergency');
      expect(effectivePermissions).not.toContain('scalability:configure');
      expect(effectivePermissions).toContain('scalability:read');
      expect(effectivePermissions).toContain('scalability:monitor');
    });
  });

  describe('Security Health Monitoring', () => {
    it('should detect and alert on privilege escalation attempts', async () => {
      // Arrange
      const normalUser: User = {
        id: 'normal-user-123',
        email: 'normal@wedsync.com',
        roles: ['scalability_viewer'],
        permissions: ['scalability:read'],
        organizationId: 'org-wedsync',
      };

      const escalationRequest: AccessRequest = {
        user: normalUser,
        resource: 'role_management',
        action: 'modify_permissions',
        context: {
          targetUser: 'normal-user-123',
          requestedPermissions: [
            'scalability:emergency',
            'scalability:configure',
          ],
          escalationAttempt: true,
        },
      };

      // Act
      await rbacManager.checkAccess(escalationRequest);

      // Assert
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'privilege_escalation_attempt',
          userId: 'normal-user-123',
          severity: 'critical',
          description: expect.stringContaining(
            'unauthorized_permission_modification',
          ),
        }),
      );
    });

    it('should monitor for unusual access patterns', async () => {
      // Arrange
      const offHoursUser: User = {
        id: 'offhours-456',
        email: 'offhours@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
        organizationId: 'org-wedsync',
      };

      // Mock very late night access
      const mockLateNightDate = new Date();
      mockLateNightDate.setUTCHours(3, 30, 0, 0); // 3:30 AM
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockLateNightDate as any);

      const unusualTimeRequest: AccessRequest = {
        user: offHoursUser,
        resource: 'scalability_engine',
        action: 'scale_up',
        context: {
          urgency: 'low', // Low urgency at unusual hours is suspicious
          ipAddress: '203.0.113.100', // External IP
          userAgent: 'curl/7.68.0', // Automated tool instead of browser
        },
      };

      // Act
      await rbacManager.checkAccess(unusualTimeRequest);

      // Assert
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'unusual_access_pattern',
          userId: 'offhours-456',
          severity: 'medium',
          indicators: expect.arrayContaining([
            'off_hours_access',
            'external_ip',
            'automated_client',
          ]),
        }),
      );
    });

    it('should generate security health reports', async () => {
      // Act
      const healthReport = await rbacManager.generateSecurityHealthReport();

      // Assert
      expect(healthReport.overallScore).toBeGreaterThan(0);
      expect(healthReport.overallScore).toBeLessThanOrEqual(100);
      expect(healthReport.accessAttempts).toBeDefined();
      expect(healthReport.securityEvents).toBeDefined();
      expect(healthReport.riskIndicators).toBeDefined();
      expect(healthReport.recommendations).toBeDefined();
      expect(healthReport.timeRange).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-volume access checks efficiently', async () => {
      // Arrange
      const testUser: User = {
        id: 'perf-test-user',
        email: 'perf@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
        organizationId: 'org-wedsync',
      };

      const baseRequest: AccessRequest = {
        user: testUser,
        resource: 'performance_monitor',
        action: 'read_metrics',
        context: { urgency: 'low' },
      };

      const startTime = Date.now();

      // Act - Process 100 access checks
      const accessChecks = Array(100)
        .fill(null)
        .map((_, index) =>
          rbacManager.checkAccess({
            ...baseRequest,
            context: { ...baseRequest.context, requestId: `perf-${index}` },
          }),
        );

      const results = await Promise.all(accessChecks);

      // Assert
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.every((r) => r.granted)).toBe(true);
      expect(results).toHaveLength(100);
    });

    it('should handle concurrent access requests safely', async () => {
      // Arrange
      const concurrentUsers = Array(10)
        .fill(null)
        .map((_, index) => ({
          id: `concurrent-user-${index}`,
          email: `user${index}@wedsync.com`,
          roles: ['scalability_viewer'],
          permissions: ['scalability:read'],
          organizationId: 'org-wedsync',
        }));

      // Act - Concurrent requests from different users
      const concurrentRequests = concurrentUsers.map((user) =>
        rbacManager.checkAccess({
          user,
          resource: 'performance_monitor',
          action: 'read_metrics',
          context: { urgency: 'low' },
        }),
      );

      const results = await Promise.all(concurrentRequests);

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.granted)).toBe(true);
      expect(mockAuditLogger.logAccess).toHaveBeenCalledTimes(10);
    });
  });
});
