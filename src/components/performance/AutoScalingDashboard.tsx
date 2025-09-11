'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Server, TrendingUp, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const scalingData = [
  { time: '00:00', instances: 4, cpu: 25, memory: 40 },
  { time: '04:00', instances: 3, cpu: 18, memory: 35 },
  { time: '08:00', instances: 6, cpu: 45, memory: 55 },
  { time: '12:00', instances: 12, cpu: 78, memory: 72 },
  { time: '16:00', instances: 18, cpu: 89, memory: 85 },
  { time: '20:00', instances: 8, cpu: 56, memory: 62 },
];

export function AutoScalingDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Instances
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-green-600">Auto-scaled for peak load</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              CPU Utilization
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <Progress value={89} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scaling Events
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Capacity</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">500</div>
            <p className="text-xs text-green-600">10x current load</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auto-scaling Activity</CardTitle>
          <CardDescription>
            Instance scaling and resource utilization over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scalingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="instances"
                stroke="#8884d8"
                strokeWidth={2}
                name="Instances"
              />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#82ca9d"
                strokeWidth={2}
                name="CPU %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wedding Season Readiness</CardTitle>
          <CardDescription>
            Auto-scaling configuration for 10x traffic spikes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Capacity</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">18 instances</span>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Maximum Capacity</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">500 instances</span>
                <Badge variant="outline">Available</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Scaling Trigger</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">75% CPU</span>
                <Badge variant="secondary">Configured</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Wedding Day Mode</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enabled</span>
                <Badge variant="default">Ready</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
