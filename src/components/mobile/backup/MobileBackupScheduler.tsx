'use client';

import { useState, useEffect, useActionState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CalendarIcon,
  CogIcon,
  BoltIcon,
  WifiIcon,
  BatteryIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  CloudArrowUpIcon,
  DevicePhoneMobileIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'manual' | 'daily' | 'weekly' | 'custom';
  time: string;
  days: string[];
  enabled: boolean;
  dataTypes: string[];
  conditions: {
    wifiOnly: boolean;
    batteryMinimum: number;
    backgroundOnly: boolean;
  };
  lastRun: Date | null;
  nextRun: Date | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface BackupPolicy {
  retentionDays: number;
  maxBackups: number;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  encryptionEnabled: boolean;
  incrementalBackup: boolean;
  weddingDayOverride: boolean;
}

interface SystemStatus {
  batteryLevel: number;
  isCharging: boolean;
  isOnWifi: boolean;
  isOnline: boolean;
  backgroundPermission: boolean;
  storageAvailable: number;
  lastSystemCheck: Date;
}

async function scheduleAction(
  prevState: any,
  formData: FormData,
): Promise<{
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  data?: any;
}> {
  const action = formData.get('action') as string;
  const scheduleId = formData.get('scheduleId') as string;

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    switch (action) {
      case 'save':
        return {
          status: 'success',
          message: 'Schedule saved successfully',
        };
      case 'enable':
        return {
          status: 'success',
          message: 'Schedule enabled',
        };
      case 'disable':
        return {
          status: 'success',
          message: 'Schedule disabled',
        };
      case 'run_now':
        return {
          status: 'success',
          message: 'Backup started manually',
        };
      case 'delete':
        return {
          status: 'success',
          message: 'Schedule deleted',
        };
      default:
        return {
          status: 'error',
          message: 'Unknown action',
        };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Operation failed',
    };
  }
}

export default function MobileBackupScheduler() {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [policy, setPolicy] = useState<BackupPolicy | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedSchedule, setSelectedSchedule] =
    useState<BackupSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'policy' | 'status'>(
    'schedules',
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionState, submitAction] = useActionState(scheduleAction, {
    status: 'idle' as const,
    message: '',
  });

  useEffect(() => {
    loadSchedulerData();
    checkSystemStatus();

    // Update system status every minute
    const statusInterval = setInterval(checkSystemStatus, 60000);

    return () => clearInterval(statusInterval);
  }, []);

  const loadSchedulerData = async () => {
    try {
      // Mock schedules
      const mockSchedules: BackupSchedule[] = [
        {
          id: '1',
          name: 'Daily Wedding Data Backup',
          frequency: 'daily',
          time: '02:00',
          days: [],
          enabled: true,
          dataTypes: ['weddings', 'clients', 'forms'],
          conditions: {
            wifiOnly: true,
            batteryMinimum: 30,
            backgroundOnly: true,
          },
          lastRun: new Date(Date.now() - 86400000),
          nextRun: new Date(Date.now() + 7200000),
          priority: 'critical',
        },
        {
          id: '2',
          name: 'Weekly Full Backup',
          frequency: 'weekly',
          time: '01:00',
          days: ['Sunday'],
          enabled: true,
          dataTypes: ['weddings', 'clients', 'forms', 'documents', 'photos'],
          conditions: {
            wifiOnly: true,
            batteryMinimum: 50,
            backgroundOnly: true,
          },
          lastRun: new Date(Date.now() - 604800000),
          nextRun: new Date(Date.now() + 172800000),
          priority: 'high',
        },
        {
          id: '3',
          name: 'Pre-Wedding Backup',
          frequency: 'custom',
          time: '20:00',
          days: ['Friday'],
          enabled: false,
          dataTypes: ['weddings', 'timelines'],
          conditions: {
            wifiOnly: false,
            batteryMinimum: 20,
            backgroundOnly: false,
          },
          lastRun: null,
          nextRun: null,
          priority: 'medium',
        },
      ];

      const mockPolicy: BackupPolicy = {
        retentionDays: 30,
        maxBackups: 5,
        compressionLevel: 'medium',
        encryptionEnabled: true,
        incrementalBackup: true,
        weddingDayOverride: true,
      };

      setSchedules(mockSchedules);
      setPolicy(mockPolicy);
    } catch (error) {
      console.error('Failed to load scheduler data:', error);
    }
  };

  const checkSystemStatus = async () => {
    try {
      // Mock system status - in real app, check actual device status
      const mockStatus: SystemStatus = {
        batteryLevel: Math.floor(Math.random() * 100),
        isCharging: Math.random() > 0.5,
        isOnWifi: navigator.onLine && Math.random() > 0.3,
        isOnline: navigator.onLine,
        backgroundPermission: true,
        storageAvailable: 15.7 * 1024 * 1024 * 1024, // 15.7 GB
        lastSystemCheck: new Date(),
      };

      setSystemStatus(mockStatus);
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    const formData = new FormData();
    formData.append('action', enabled ? 'enable' : 'disable');
    formData.append('scheduleId', scheduleId);

    await submitAction(formData);

    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id === scheduleId ? { ...schedule, enabled } : schedule,
      ),
    );
  };

  const runScheduleNow = async (scheduleId: string) => {
    const formData = new FormData();
    formData.append('action', 'run_now');
    formData.append('scheduleId', scheduleId);

    await submitAction(formData);
  };

  const deleteSchedule = async (scheduleId: string) => {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('scheduleId', scheduleId);

    await submitAction(formData);

    setSchedules((prev) =>
      prev.filter((schedule) => schedule.id !== scheduleId),
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTimeUntil = (date: Date | null) => {
    if (!date) return 'Not scheduled';

    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const canRunBackup = (schedule: BackupSchedule) => {
    if (!systemStatus) return false;

    if (schedule.conditions.wifiOnly && !systemStatus.isOnWifi) return false;
    if (systemStatus.batteryLevel < schedule.conditions.batteryMinimum)
      return false;
    if (!systemStatus.isOnline) return false;

    return true;
  };

  const getSystemStatusIcon = () => {
    if (!systemStatus) return null;

    const issues = [];
    if (!systemStatus.isOnline) issues.push('offline');
    if (!systemStatus.isOnWifi) issues.push('no_wifi');
    if (systemStatus.batteryLevel < 20) issues.push('low_battery');

    if (issues.length === 0) {
      return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
    } else {
      return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Backup Scheduler
            </h1>
            <div className="flex items-center space-x-2">
              {getSystemStatusIcon()}
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <CalendarIcon className="h-4 w-4 inline mr-2" />
                New Schedule
              </button>
            </div>
          </div>

          {/* Status Message */}
          {actionState.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg mb-4 ${
                actionState.status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : actionState.status === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {actionState.message}
            </motion.div>
          )}

          {/* System Status Summary */}
          {systemStatus && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <BatteryIcon
                    className={`h-5 w-5 ${
                      systemStatus.batteryLevel > 50
                        ? 'text-green-600'
                        : systemStatus.batteryLevel > 20
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Battery: {systemStatus.batteryLevel}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {systemStatus.isCharging ? 'Charging' : 'Not charging'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <WifiIcon
                    className={`h-5 w-5 ${
                      systemStatus.isOnWifi ? 'text-green-600' : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {systemStatus.isOnWifi ? 'WiFi Connected' : 'Mobile Data'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {systemStatus.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Storage: {formatFileSize(systemStatus.storageAvailable)}{' '}
                  available
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          {[
            { key: 'schedules', label: 'Schedules', icon: CalendarIcon },
            { key: 'policy', label: 'Policy', icon: CogIcon },
            { key: 'status', label: 'Status', icon: AdjustmentsHorizontalIcon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-3 px-2 text-center border-b-2 touch-manipulation ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600'
              }`}
              style={{ minHeight: '56px' }}
            >
              <Icon className="h-5 w-5 mx-auto mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Schedules Tab */}
          {activeTab === 'schedules' && (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-white rounded-lg border shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {schedule.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(schedule.priority)}`}
                            >
                              {schedule.priority}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              {schedule.frequency === 'daily' &&
                                `Daily at ${formatTime(schedule.time)}`}
                              {schedule.frequency === 'weekly' &&
                                `${schedule.days.join(', ')} at ${formatTime(schedule.time)}`}
                              {schedule.frequency === 'custom' &&
                                `Custom: ${schedule.days.join(', ')} at ${formatTime(schedule.time)}`}
                              {schedule.frequency === 'manual' && 'Manual only'}
                            </p>

                            <p>Data: {schedule.dataTypes.join(', ')}</p>

                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs">
                                Last:{' '}
                                {schedule.lastRun
                                  ? schedule.lastRun.toLocaleDateString()
                                  : 'Never'}
                              </span>
                              <span className="text-xs">
                                Next: {formatTimeUntil(schedule.nextRun)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              toggleSchedule(schedule.id, !schedule.enabled)
                            }
                            className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                              schedule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                                schedule.enabled
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {schedule.conditions.wifiOnly && (
                            <span
                              className={`px-2 py-1 rounded-full ${
                                systemStatus?.isOnWifi
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              WiFi Only
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 rounded-full ${
                              (systemStatus?.batteryLevel || 0) >=
                              schedule.conditions.batteryMinimum
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            Battery ≥{schedule.conditions.batteryMinimum}%
                          </span>
                          {schedule.conditions.backgroundOnly && (
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Background Only
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => runScheduleNow(schedule.id)}
                          disabled={
                            !canRunBackup(schedule) || !schedule.enabled
                          }
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '44px' }}
                        >
                          <PlayIcon className="h-4 w-4 mr-2" />
                          Run Now
                        </button>

                        <button
                          onClick={() => setSelectedSchedule(schedule)}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '44px' }}
                        >
                          <CogIcon className="h-4 w-4 mr-2" />
                          Edit
                        </button>

                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium touch-manipulation"
                          style={{ minHeight: '44px' }}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Policy Tab */}
          {activeTab === 'policy' && policy && (
            <motion.div
              key="policy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Backup Policy
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retention Period
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="7"
                          max="90"
                          value={policy.retentionDays}
                          onChange={(e) =>
                            setPolicy({
                              ...policy,
                              retentionDays: parseInt(e.target.value),
                            })
                          }
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-gray-900 w-12">
                          {policy.retentionDays}d
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Backups
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={policy.maxBackups}
                          onChange={(e) =>
                            setPolicy({
                              ...policy,
                              maxBackups: parseInt(e.target.value),
                            })
                          }
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-gray-900 w-8">
                          {policy.maxBackups}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Compression Level
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {['none', 'low', 'medium', 'high'].map((level) => (
                          <button
                            key={level}
                            onClick={() =>
                              setPolicy({
                                ...policy,
                                compressionLevel: level as any,
                              })
                            }
                            className={`p-3 rounded-lg border text-center touch-manipulation ${
                              policy.compressionLevel === level
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-gray-200 text-gray-700'
                            }`}
                            style={{ minHeight: '60px' }}
                          >
                            <div className="font-medium capitalize">
                              {level}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {level === 'none' && 'Fastest'}
                              {level === 'low' && 'Fast'}
                              {level === 'medium' && 'Balanced'}
                              {level === 'high' && 'Smallest'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Encryption
                          </span>
                          <p className="text-xs text-gray-500">
                            Encrypt backup data for security
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPolicy({
                              ...policy,
                              encryptionEnabled: !policy.encryptionEnabled,
                            })
                          }
                          className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                            policy.encryptionEnabled
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                              policy.encryptionEnabled
                                ? 'translate-x-6'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Incremental Backup
                          </span>
                          <p className="text-xs text-gray-500">
                            Only backup changed data
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPolicy({
                              ...policy,
                              incrementalBackup: !policy.incrementalBackup,
                            })
                          }
                          className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                            policy.incrementalBackup
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                              policy.incrementalBackup
                                ? 'translate-x-6'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Wedding Day Override
                          </span>
                          <p className="text-xs text-gray-500">
                            Force backup on wedding days
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPolicy({
                              ...policy,
                              weddingDayOverride: !policy.weddingDayOverride,
                            })
                          }
                          className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                            policy.weddingDayOverride
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                              policy.weddingDayOverride
                                ? 'translate-x-6'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    <button
                      onClick={() => {
                        const formData = new FormData();
                        formData.append('action', 'save');
                        formData.append('data', JSON.stringify(policy));
                        submitAction(formData);
                      }}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold touch-manipulation"
                      style={{ minHeight: '48px' }}
                    >
                      Save Policy Settings
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && systemStatus && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    System Status
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BatteryIcon
                          className={`h-6 w-6 ${
                            systemStatus.batteryLevel > 50
                              ? 'text-green-600'
                              : systemStatus.batteryLevel > 20
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            Battery Level
                          </p>
                          <p className="text-sm text-gray-600">
                            {systemStatus.batteryLevel}%{' '}
                            {systemStatus.isCharging ? '(Charging)' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            systemStatus.batteryLevel > 50
                              ? 'bg-green-600'
                              : systemStatus.batteryLevel > 20
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                          }`}
                          style={{ width: `${systemStatus.batteryLevel}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <WifiIcon
                          className={`h-6 w-6 ${systemStatus.isOnWifi ? 'text-green-600' : 'text-gray-400'}`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            Network Status
                          </p>
                          <p className="text-sm text-gray-600">
                            {systemStatus.isOnWifi
                              ? 'Connected to WiFi'
                              : 'Using Mobile Data'}
                          </p>
                        </div>
                      </div>
                      {systemStatus.isOnWifi ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Storage Available
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(systemStatus.storageAvailable)} free
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ClockIcon className="h-6 w-6 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Last Status Check
                          </p>
                          <p className="text-sm text-gray-600">
                            {systemStatus.lastSystemCheck.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={checkSystemStatus}
                    className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold touch-manipulation"
                    style={{ minHeight: '48px' }}
                  >
                    Refresh Status
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Backup Readiness
                  </h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {schedules
                      .filter((s) => s.enabled)
                      .map((schedule) => (
                        <li
                          key={schedule.id}
                          className="flex items-center space-x-2"
                        >
                          {canRunBackup(schedule) ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          )}
                          <span>
                            {schedule.name}:{' '}
                            {canRunBackup(schedule) ? 'Ready' : 'Not ready'}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
