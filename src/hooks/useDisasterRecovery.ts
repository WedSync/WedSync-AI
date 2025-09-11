'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WeddingDisasterRecoverySystem } from '@/lib/platform/disaster-recovery';
import type {
  DisasterRecoveryStatus,
  BackupStatus,
  RecoveryTest,
  RecoveryObjectives,
  DisasterScenario,
} from '@/types/platform-scaling';

export interface DisasterRecoveryState {
  isLoading: boolean;
  status: DisasterRecoveryStatus | null;
  backups: BackupStatus[];
  lastTest: RecoveryTest | null;
  activeScenarios: DisasterScenario[];
  healthScore: number;
  error: string | null;
}

export interface DisasterRecoveryActions {
  refreshStatus: () => Promise<void>;
  triggerBackup: (
    type: 'full' | 'incremental' | 'wedding-critical',
  ) => Promise<void>;
  runRecoveryTest: (scenario: string) => Promise<void>;
  activateRecoveryMode: (scenario: DisasterScenario) => Promise<void>;
  deactivateRecoveryMode: () => Promise<void>;
  resetError: () => void;
}

export function useDisasterRecovery(): DisasterRecoveryState &
  DisasterRecoveryActions {
  const [state, setState] = useState<DisasterRecoveryState>({
    isLoading: true,
    status: null,
    backups: [],
    lastTest: null,
    activeScenarios: [],
    healthScore: 0,
    error: null,
  });

  const recoverySystemRef = useRef<WeddingDisasterRecoverySystem | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Initialize disaster recovery system
  useEffect(() => {
    const initializeRecoverySystem = async () => {
      try {
        if (!recoverySystemRef.current) {
          recoverySystemRef.current = new WeddingDisasterRecoverySystem({
            projectId: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || '',
            backupRetentionDays: 30,
            maxBackupSizeGB: 1000,
            enableGeoRedundancy: true,
            weddingDataPriority: 'critical',
            emergencyContacts: ['admin@wedsync.com', 'tech@wedsync.com'],
          });

          await recoverySystemRef.current.initialize();
        }
      } catch (error) {
        console.error('Failed to initialize disaster recovery system:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize disaster recovery system',
        }));
      }
    };

    initializeRecoverySystem();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  // Monitor disaster recovery health
  useEffect(() => {
    if (!recoverySystemRef.current) return;

    const monitorHealth = async () => {
      try {
        const [status, backups, lastTest] = await Promise.all([
          recoverySystemRef.current!.getRecoveryStatus(),
          recoverySystemRef.current!.getBackupStatus(),
          recoverySystemRef.current!.getLastRecoveryTest(),
        ]);

        // Calculate health score based on multiple factors
        const healthScore = calculateHealthScore(status, backups, lastTest);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          status,
          backups,
          lastTest,
          healthScore,
          error: null,
        }));
      } catch (error) {
        console.error('Failed to monitor disaster recovery health:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to monitor disaster recovery status',
        }));
      }
    };

    // Initial load
    monitorHealth();

    // Monitor every 5 minutes
    monitoringIntervalRef.current = setInterval(monitorHealth, 300000);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [recoverySystemRef.current]);

  // Listen for disaster events and alerts
  useEffect(() => {
    const disasterChannel = supabase
      .channel('disaster-recovery-events')
      .on('broadcast', { event: 'backup-completed' }, (payload) => {
        setState((prev) => ({
          ...prev,
          backups: [
            {
              id: payload.backup_id,
              type: payload.backup_type,
              status: 'completed',
              size_gb: payload.size_gb,
              created_at: payload.created_at,
              verification_status: 'verified',
            },
            ...prev.backups.slice(0, 9),
          ],
        }));
      })
      .on('broadcast', { event: 'disaster-detected' }, (payload) => {
        const scenario: DisasterScenario = {
          id: payload.scenario_id,
          type: payload.disaster_type,
          severity: payload.severity,
          affected_systems: payload.affected_systems,
          estimated_rto: payload.estimated_rto,
          estimated_rpo: payload.estimated_rpo,
          triggered_at: new Date().toISOString(),
          wedding_impact: payload.wedding_impact || 'unknown',
        };

        setState((prev) => ({
          ...prev,
          activeScenarios: [...prev.activeScenarios, scenario],
        }));
      })
      .on('broadcast', { event: 'recovery-completed' }, (payload) => {
        setState((prev) => ({
          ...prev,
          activeScenarios: prev.activeScenarios.filter(
            (s) => s.id !== payload.scenario_id,
          ),
          status: prev.status
            ? {
                ...prev.status,
                isRecovering: false,
                lastRecoveryTime: new Date().toISOString(),
              }
            : null,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(disasterChannel);
    };
  }, [supabase]);

  // Calculate health score based on disaster recovery readiness
  const calculateHealthScore = useCallback(
    (
      status: DisasterRecoveryStatus | null,
      backups: BackupStatus[],
      lastTest: RecoveryTest | null,
    ): number => {
      if (!status) return 0;

      let score = 100;

      // Deduct points for missing recent backups
      const recentBackups = backups.filter(
        (b) =>
          new Date(b.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000),
      );
      if (recentBackups.length === 0) score -= 30;

      // Deduct points for failed backups
      const failedBackups = backups.filter((b) => b.status === 'failed').length;
      score -= failedBackups * 10;

      // Deduct points for old recovery tests
      if (
        !lastTest ||
        new Date(lastTest.executed_at) <
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ) {
        score -= 20;
      }

      // Deduct points if recovery is currently active
      if (status.isRecovering) score -= 15;

      // Bonus points for geo-redundancy
      if (status.geoRedundancyEnabled) score += 5;

      // Bonus points for verified backups
      const verifiedBackups = backups.filter(
        (b) => b.verification_status === 'verified',
      ).length;
      score += Math.min(verifiedBackups * 2, 10);

      return Math.max(0, Math.min(100, Math.round(score)));
    },
    [],
  );

  const refreshStatus = useCallback(async () => {
    if (!recoverySystemRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [status, backups, lastTest] = await Promise.all([
        recoverySystemRef.current.getRecoveryStatus(),
        recoverySystemRef.current.getBackupStatus(),
        recoverySystemRef.current.getLastRecoveryTest(),
      ]);

      const healthScore = calculateHealthScore(status, backups, lastTest);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        status,
        backups,
        lastTest,
        healthScore,
      }));
    } catch (error) {
      console.error('Failed to refresh disaster recovery status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh disaster recovery status',
      }));
    }
  }, [calculateHealthScore]);

  const triggerBackup = useCallback(
    async (type: 'full' | 'incremental' | 'wedding-critical') => {
      if (!recoverySystemRef.current) return;

      try {
        setState((prev) => ({ ...prev, error: null }));

        const backupId = await recoverySystemRef.current.createBackup({
          type,
          priority: type === 'wedding-critical' ? 'critical' : 'normal',
          includeUserData: true,
          compressionLevel: type === 'full' ? 'high' : 'medium',
        });

        // Add optimistic backup entry
        const newBackup: BackupStatus = {
          id: backupId,
          type,
          status: 'in-progress',
          size_gb: 0,
          created_at: new Date().toISOString(),
          verification_status: 'pending',
        };

        setState((prev) => ({
          ...prev,
          backups: [newBackup, ...prev.backups],
        }));

        // Trigger notification to admin
        await supabase.from('system_notifications').insert({
          type: 'backup_started',
          message: `${type} backup initiated`,
          severity: 'info',
          metadata: { backup_id: backupId, backup_type: type },
        });
      } catch (error) {
        console.error('Failed to trigger backup:', error);
        setState((prev) => ({
          ...prev,
          error: `Failed to trigger ${type} backup`,
        }));
      }
    },
    [supabase],
  );

  const runRecoveryTest = useCallback(
    async (scenario: string) => {
      if (!recoverySystemRef.current) return;

      try {
        setState((prev) => ({ ...prev, error: null }));

        const test = await recoverySystemRef.current.runRecoveryTest({
          scenario,
          testType: 'simulation',
          includeDataValidation: true,
          weddingDataProtection: true,
        });

        setState((prev) => ({ ...prev, lastTest: test }));

        // Log the test execution
        await supabase.from('recovery_test_logs').insert({
          test_id: test.id,
          scenario,
          status: test.status,
          execution_time: test.execution_time,
          results: test.results,
        });
      } catch (error) {
        console.error('Failed to run recovery test:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to execute recovery test',
        }));
      }
    },
    [supabase],
  );

  const activateRecoveryMode = useCallback(
    async (scenario: DisasterScenario) => {
      if (!recoverySystemRef.current) return;

      try {
        setState((prev) => ({ ...prev, error: null }));

        await recoverySystemRef.current.activateRecoveryMode({
          scenarioType: scenario.type,
          affectedSystems: scenario.affected_systems,
          priorityLevel: scenario.severity,
          weddingDayProtection: scenario.wedding_impact === 'critical',
        });

        setState((prev) => ({
          ...prev,
          activeScenarios: [...prev.activeScenarios, scenario],
          status: prev.status
            ? {
                ...prev.status,
                isRecovering: true,
                currentScenario: scenario.type,
              }
            : null,
        }));

        // Send emergency notifications
        await supabase.from('emergency_notifications').insert({
          type: 'disaster_recovery_activated',
          scenario: scenario.type,
          severity: scenario.severity,
          affected_systems: scenario.affected_systems,
          wedding_impact: scenario.wedding_impact,
        });
      } catch (error) {
        console.error('Failed to activate recovery mode:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to activate disaster recovery mode',
        }));
      }
    },
    [supabase],
  );

  const deactivateRecoveryMode = useCallback(async () => {
    if (!recoverySystemRef.current) return;

    try {
      setState((prev) => ({ ...prev, error: null }));

      await recoverySystemRef.current.deactivateRecoveryMode();

      setState((prev) => ({
        ...prev,
        activeScenarios: [],
        status: prev.status
          ? {
              ...prev.status,
              isRecovering: false,
              currentScenario: undefined,
              lastRecoveryTime: new Date().toISOString(),
            }
          : null,
      }));
    } catch (error) {
      console.error('Failed to deactivate recovery mode:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to deactivate recovery mode',
      }));
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshStatus,
    triggerBackup,
    runRecoveryTest,
    activateRecoveryMode,
    deactivateRecoveryMode,
    resetError,
  };
}
