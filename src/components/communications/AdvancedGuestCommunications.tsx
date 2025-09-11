'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MessageScheduler } from './MessageScheduler';
import { MessageABTestDashboard } from './MessageABTestDashboard';
import { AdvancedPersonalization } from './AdvancedPersonalization';
import { MessageAnalytics } from './MessageAnalytics';
import { AutomatedFollowUps } from './AutomatedFollowUps';
import { TeamIntegrationHub } from './TeamIntegrationHub';
import {
  Calendar,
  FlaskConical,
  Variable,
  Activity,
  GitBranch,
  Link2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedGuestCommunicationsProps {
  clientId: string;
  className?: string;
}

/**
 * WS-155 Round 2: Advanced Guest Communications Hub
 * Integrates all advanced messaging features and team outputs
 */
export function AdvancedGuestCommunications({
  clientId,
  className,
}: AdvancedGuestCommunicationsProps) {
  const [activeTab, setActiveTab] = useState('scheduling');
  const [messageContent, setMessageContent] = useState('');
  const [scheduleOptions, setScheduleOptions] = useState({
    timezone: 'UTC',
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '09:00',
      reschedule_to: 'next_available' as const,
    },
  });

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">
                Advanced Guest Communications
              </CardTitle>
              <CardDescription>
                WS-155 Round 2: Enhanced messaging with automation and
                intelligence
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
              <p className="text-2xl font-bold">1,247</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Rate</p>
              <p className="text-2xl font-bold">68.5%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Click Rate</p>
              <p className="text-2xl font-bold">24.3%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Tests</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Automations</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Status</p>
              <p className="text-2xl font-bold text-green-500">All OK</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Feature Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b h-auto flex-wrap">
              <TabsTrigger
                value="scheduling"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Scheduling
              </TabsTrigger>
              <TabsTrigger
                value="abtesting"
                className="flex items-center gap-2"
              >
                <FlaskConical className="h-4 w-4" />
                A/B Testing
              </TabsTrigger>
              <TabsTrigger
                value="personalization"
                className="flex items-center gap-2"
              >
                <Variable className="h-4 w-4" />
                Personalization
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="automation"
                className="flex items-center gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Automation
              </TabsTrigger>
              <TabsTrigger
                value="integration"
                className="flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Team Hub
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* Message Scheduling */}
              <TabsContent value="scheduling" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Message Scheduling
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Schedule messages for optimal delivery timing with
                      advanced options
                    </p>
                  </div>
                  <MessageScheduler
                    value={scheduleOptions}
                    onChange={setScheduleOptions}
                    onSchedule={() => console.log('Message scheduled')}
                  />
                </div>
              </TabsContent>

              {/* A/B Testing */}
              <TabsContent value="abtesting" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      A/B Testing Dashboard
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Test different message versions to optimize engagement
                    </p>
                  </div>
                  <MessageABTestDashboard
                    clientId={clientId}
                    onTestComplete={(test) =>
                      console.log('Test completed', test)
                    }
                  />
                </div>
              </TabsContent>

              {/* Advanced Personalization */}
              <TabsContent value="personalization" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Advanced Personalization
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Create dynamic, personalized content for each guest
                    </p>
                  </div>
                  <AdvancedPersonalization
                    content={messageContent}
                    onContentChange={setMessageContent}
                    onPreview={(content) => console.log('Preview:', content)}
                  />
                </div>
              </TabsContent>

              {/* Message Analytics */}
              <TabsContent value="analytics" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Message Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Track engagement metrics and campaign performance
                    </p>
                  </div>
                  <MessageAnalytics
                    clientId={clientId}
                    onExport={(data) => console.log('Exporting data:', data)}
                  />
                </div>
              </TabsContent>

              {/* Automated Follow-ups */}
              <TabsContent value="automation" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Automated Follow-ups
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Create intelligent message sequences based on guest
                      behavior
                    </p>
                  </div>
                  <AutomatedFollowUps
                    clientId={clientId}
                    onSequenceActivate={(seq) =>
                      console.log('Sequence activated:', seq)
                    }
                    onSequencePause={(seq) =>
                      console.log('Sequence paused:', seq)
                    }
                  />
                </div>
              </TabsContent>

              {/* Team Integration Hub */}
              <TabsContent value="integration" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Team Integration Hub
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Unified view of all team integrations and real-time status
                    </p>
                  </div>
                  <TeamIntegrationHub
                    clientId={clientId}
                    onStatusUpdate={(team, status) =>
                      console.log(`Team ${team} update:`, status)
                    }
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
