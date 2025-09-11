'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Phone,
  Shield,
  Power,
  Clock,
  Users,
  Heart,
  Activity,
  Zap,
  WifiOff,
  Database,
  Server,
  RefreshCw,
  CheckCircle,
  XCircle,
  Timer,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface EmergencyAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  type: 'critical' | 'warning' | 'info';
  estimatedTime: string;
  confirmRequired: boolean;
  contactRequired?: boolean;
  consequences?: string[];
  action: () => Promise<void>;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  availability: 'available' | 'busy' | 'unavailable';
  responseTime: string;
}

interface SystemStatus {
  service: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: Date;
  responseTime?: number;
}

interface EmergencyControlPanelProps {
  weddingId: string;
  isActive?: boolean;
  onEmergencyActivated?: (actionId: string) => void;
  onContactCalled?: (contactId: string) => void;
  className?: string;
}

export function EmergencyControlPanel({
  weddingId,
  isActive = false,
  onEmergencyActivated,
  onContactCalled,
  className = '',
}: EmergencyControlPanelProps) {
  const [selectedAction, setSelectedAction] = useState<EmergencyAction | null>(
    null,
  );
  const [confirmationPhase, setConfirmationPhase] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([]);
  const [lastEmergencyCheck, setLastEmergencyCheck] = useState<Date>(
    new Date(),
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Emergency actions
  const emergencyActions: EmergencyAction[] = [
    {
      id: 'emergency_contact',
      title: 'Emergency Contact',
      description: 'Call emergency support line immediately',
      icon: Phone,
      type: 'critical',
      estimatedTime: '< 1 minute',
      confirmRequired: false,
      contactRequired: true,
      action: async () => {
        if (typeof window !== 'undefined') {
          window.location.href = 'tel:+1-800-EMERGENCY';
          playEmergencySound();
        }
      },
    },
    {
      id: 'backup_systems',
      title: 'Activate Backup Systems',
      description: 'Switch to backup infrastructure immediately',
      icon: Shield,
      type: 'critical',
      estimatedTime: '2-3 minutes',
      confirmRequired: true,
      consequences: [
        'Primary systems will be taken offline',
        'Some features may be temporarily unavailable',
        'All data will be preserved',
      ],
      action: async () => {
        // Simulate backup system activation
        await simulateSystemAction('Activating backup systems...', 3000);
      },
    },
    {
      id: 'failover_cloud',
      title: 'Emergency Cloud Failover',
      description: 'Switch to emergency cloud provider',
      icon: Zap,
      type: 'warning',
      estimatedTime: '5-7 minutes',
      confirmRequired: true,
      consequences: [
        'Traffic will be redirected to backup cloud',
        'Increased latency expected initially',
        'Cost implications for emergency usage',
      ],
      action: async () => {
        await simulateSystemAction('Initiating cloud failover...', 5000);
      },
    },
    {
      id: 'database_readonly',
      title: 'Enable Database Read-Only',
      description: 'Protect data integrity during issues',
      icon: Database,
      type: 'warning',
      estimatedTime: '< 30 seconds',
      confirmRequired: true,
      consequences: [
        'No new data can be written',
        'RSVP updates will be queued',
        'Vendor uploads will be delayed',
      ],
      action: async () => {
        await simulateSystemAction('Enabling read-only mode...', 1000);
      },
    },
    {
      id: 'restart_services',
      title: 'Restart Core Services',
      description: 'Quick restart of all core infrastructure',
      icon: RefreshCw,
      type: 'warning',
      estimatedTime: '3-5 minutes',
      confirmRequired: true,
      consequences: [
        'Brief service interruption',
        'Users may need to refresh pages',
        'Active sessions will be preserved',
      ],
      action: async () => {
        await simulateSystemAction('Restarting core services...', 4000);
      },
    },
    {
      id: 'escalate_support',
      title: 'Escalate to Level 2 Support',
      description: 'Get immediate technical expert assistance',
      icon: Users,
      type: 'info',
      estimatedTime: '< 2 minutes',
      confirmRequired: false,
      contactRequired: true,
      action: async () => {
        await simulateSystemAction('Escalating to Level 2 support...', 2000);
      },
    },
  ];

  // Emergency contacts
  const emergencyContacts: EmergencyContact[] = [
    {
      id: 'primary_support',
      name: 'Sarah Mitchell',
      role: 'Technical Lead',
      phone: '+1-800-TECH-911',
      availability: 'available',
      responseTime: '< 2 minutes',
    },
    {
      id: 'infrastructure_lead',
      name: 'Mike Rodriguez',
      role: 'Infrastructure Lead',
      phone: '+1-800-INFRA-911',
      availability: 'available',
      responseTime: '< 5 minutes',
    },
    {
      id: 'wedding_coordinator',
      name: 'Emma Johnson',
      role: 'Wedding Coordinator',
      phone: '+1-800-WEDDING-911',
      availability: 'busy',
      responseTime: '< 10 minutes',
    },
  ];

  // System status checks
  useEffect(() => {
    const checkSystemStatus = async () => {
      // Simulate system status checks
      const statuses: SystemStatus[] = [
        {
          service: 'API Gateway',
          status: Math.random() > 0.1 ? 'online' : 'degraded',
          lastCheck: new Date(),
          responseTime: Math.floor(Math.random() * 200) + 50,
        },
        {
          service: 'Database',
          status: Math.random() > 0.05 ? 'online' : 'offline',
          lastCheck: new Date(),
          responseTime: Math.floor(Math.random() * 100) + 20,
        },
        {
          service: 'Cache Layer',
          status: Math.random() > 0.15 ? 'online' : 'degraded',
          lastCheck: new Date(),
          responseTime: Math.floor(Math.random() * 50) + 5,
        },
        {
          service: 'CDN',
          status: 'online',
          lastCheck: new Date(),
          responseTime: Math.floor(Math.random() * 30) + 10,
        },
      ];

      setSystemStatuses(statuses);
      setLastEmergencyCheck(new Date());
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Countdown timer for confirmation
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && confirmationPhase > 0) {
      setConfirmationPhase(0);
      setSelectedAction(null);
    }

    return () => clearTimeout(timer);
  }, [countdown, confirmationPhase]);

  // Sound notification
  const playEmergencySound = useCallback(() => {
    if (!soundEnabled) return;

    // Create emergency sound pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Audio notification would go here
    console.log('🚨 Emergency sound notification');
  }, [soundEnabled]);

  // Handle action selection
  const handleActionSelect = useCallback((action: EmergencyAction) => {
    setSelectedAction(action);

    if (action.confirmRequired) {
      setConfirmationPhase(1);
      setCountdown(10); // 10-second confirmation window
    } else {
      executeAction(action);
    }
  }, []);

  // Execute emergency action
  const executeAction = useCallback(
    async (action: EmergencyAction) => {
      setIsExecuting(true);
      playEmergencySound();

      try {
        await action.action();
        onEmergencyActivated?.(action.id);

        // Log emergency action
        console.log(`🚨 Emergency action executed: ${action.title}`);
      } catch (error) {
        console.error('Emergency action failed:', error);
      } finally {
        setIsExecuting(false);
        setSelectedAction(null);
        setConfirmationPhase(0);
      }
    },
    [onEmergencyActivated, playEmergencySound],
  );

  // Confirm action execution
  const confirmAction = useCallback(() => {
    if (selectedAction) {
      setConfirmationPhase(2);
      executeAction(selectedAction);
    }
  }, [selectedAction, executeAction]);

  // Handle contact call
  const handleContactCall = useCallback(
    (contact: EmergencyContact) => {
      if (typeof window !== 'undefined') {
        window.location.href = `tel:${contact.phone}`;
        onContactCalled?.(contact.id);
        playEmergencySound();
      }
    },
    [onContactCalled, playEmergencySound],
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // Simulate system action
  async function simulateSystemAction(
    message: string,
    duration: number,
  ): Promise<void> {
    console.log(message);
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Emergency Header */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Emergency Control Panel</span>
            </CardTitle>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              <Badge className={isActive ? 'bg-red-600' : 'bg-gray-600'}>
                {isActive ? 'ACTIVE' : 'STANDBY'}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-red-700">
            Wedding: {weddingId.slice(0, 8)} • Last check:{' '}
            {lastEmergencyCheck.toLocaleTimeString()}
          </p>
        </CardHeader>
      </Card>

      {/* System Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {systemStatuses.map((system) => (
              <motion.div
                key={system.service}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      system.status === 'online'
                        ? 'bg-green-500'
                        : system.status === 'degraded'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{system.service}</p>
                    {system.responseTime && (
                      <p className="text-xs text-gray-500">
                        {system.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>

                <Badge className={getStatusColor(system.status)}>
                  {system.status}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Emergency Contacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emergencyContacts.map((contact) => (
              <motion.div
                key={contact.id}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      contact.availability === 'available'
                        ? 'bg-green-500'
                        : contact.availability === 'busy'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.role}</p>
                  </div>
                </div>

                <div className="text-right">
                  <Button
                    size="sm"
                    onClick={() => handleContactCall(contact)}
                    className="bg-blue-600 hover:bg-blue-700 h-8"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    {contact.responseTime}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Emergency Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emergencyActions.map((action) => (
              <motion.div
                key={action.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleActionSelect(action)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${getActionColor(action.type)} hover:shadow-md`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-full ${
                      action.type === 'critical'
                        ? 'bg-red-600 text-white'
                        : action.type === 'warning'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-blue-600 text-white'
                    }`}
                  >
                    <action.icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm">{action.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {action.estimatedTime}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">
                      {action.description}
                    </p>

                    {action.confirmRequired && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Timer className="h-3 w-3" />
                        <span>Requires confirmation</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedAction && confirmationPhase > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-sm"
            >
              {confirmationPhase === 1 && (
                <>
                  <div className="text-center mb-4">
                    <div
                      className={`p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-3 ${
                        selectedAction.type === 'critical'
                          ? 'bg-red-600 text-white'
                          : selectedAction.type === 'warning'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-blue-600 text-white'
                      }`}
                    >
                      <selectedAction.icon className="h-8 w-8" />
                    </div>

                    <h2 className="text-lg font-semibold mb-2">
                      Confirm Emergency Action
                    </h2>
                    <p className="text-gray-600">{selectedAction.title}</p>
                  </div>

                  {selectedAction.consequences && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">
                        Consequences:
                      </h4>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {selectedAction.consequences.map(
                          (consequence, index) => (
                            <li key={index}>• {consequence}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-red-600 mb-1">
                      {countdown}
                    </div>
                    <p className="text-xs text-gray-500">seconds to confirm</p>
                    <Progress value={(countdown / 10) * 100} className="mt-2" />
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedAction(null);
                        setConfirmationPhase(0);
                        setCountdown(0);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmAction}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              )}

              {confirmationPhase === 2 && (
                <div className="text-center">
                  <div className="p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-3 bg-blue-600 text-white">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>

                  <h2 className="text-lg font-semibold mb-2">
                    Executing Emergency Action
                  </h2>
                  <p className="text-gray-600 mb-4">{selectedAction.title}</p>

                  <div className="text-sm text-gray-500">
                    Estimated time: {selectedAction.estimatedTime}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EmergencyControlPanel;
