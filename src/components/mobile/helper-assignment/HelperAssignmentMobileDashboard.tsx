'use client';

// WS-157 Mobile Dashboard for Helper Assignment Overview
// Comprehensive mobile dashboard with couple experience optimization

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  BarChart3,
  Bell,
  Plus,
  Filter,
  Search,
  Settings,
  Heart,
  Star,
  TrendingUp,
  MapPin,
  MessageCircle,
  Zap,
} from 'lucide-react';
import TouchOptimizedHelperDashboard from './TouchOptimizedHelperDashboard';
import MobileHelperDirectory from './MobileHelperDirectory';
import TouchDragAndDrop from './TouchDragAndDrop';
import WedMeIntegration from './WedMeIntegration';

interface DashboardStats {
  totalHelpers: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksToday: number;
  helpersActive: number;
  averageRating: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'helper_joined' | 'task_overdue';
  title: string;
  description: string;
  timestamp: Date;
  helper?: {
    name: string;
    avatar?: string;
  };
  task?: {
    title: string;
    priority: string;
  };
}

interface UpcomingDeadline {
  id: string;
  taskTitle: string;
  helperName: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export default function HelperAssignmentMobileDashboard() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tasks' | 'helpers' | 'assign' | 'settings'
  >('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalHelpers: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    tasksToday: 0,
    helpersActive: 0,
    averageRating: 0,
    completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    UpcomingDeadline[]
  >([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in real app would fetch from Supabase
      const mockStats: DashboardStats = {
        totalHelpers: 8,
        totalTasks: 24,
        completedTasks: 18,
        overdueTasks: 2,
        tasksToday: 6,
        helpersActive: 5,
        averageRating: 4.7,
        completionRate: 75,
      };

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'task_completed',
          title: 'Task Completed',
          description: 'Sarah completed "Setup ceremony chairs"',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          helper: { name: 'Sarah Johnson', avatar: '/avatars/sarah.jpg' },
          task: { title: 'Setup ceremony chairs', priority: 'high' },
        },
        {
          id: '2',
          type: 'task_assigned',
          title: 'New Task Assigned',
          description: 'Assigned "Arrange flowers" to Emma',
          timestamp: new Date(Date.now() - 90 * 60 * 1000),
          helper: { name: 'Emma Rodriguez' },
          task: { title: 'Arrange flowers', priority: 'medium' },
        },
        {
          id: '3',
          type: 'helper_joined',
          title: 'Helper Joined',
          description: 'Mike Chen joined as audio specialist',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          helper: { name: 'Mike Chen' },
        },
      ];

      const mockDeadlines: UpcomingDeadline[] = [
        {
          id: '1',
          taskTitle: 'Sound check with DJ',
          helperName: 'Mike Chen',
          deadline: new Date(Date.now() + 60 * 60 * 1000),
          priority: 'critical',
          category: 'Audio/Visual',
        },
        {
          id: '2',
          taskTitle: 'Final headcount confirmation',
          helperName: 'Sarah Johnson',
          deadline: new Date(Date.now() + 3 * 60 * 60 * 1000),
          priority: 'high',
          category: 'Coordination',
        },
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
      setUpcomingDeadlines(mockDeadlines);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatDeadline = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 0) return 'Overdue';
    if (diffInMinutes < 60) return `${diffInMinutes}m remaining`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h remaining`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d remaining`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-error-700 bg-error-100';
      case 'high':
        return 'text-warning-700 bg-warning-100';
      case 'medium':
        return 'text-blue-700 bg-blue-100';
      case 'low':
        return 'text-success-700 bg-success-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 className="w-5 h-5 text-success-600" />;
      case 'task_assigned':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'helper_joined':
        return <Users className="w-5 h-5 text-primary-600" />;
      case 'task_overdue':
        return <AlertTriangle className="w-5 h-5 text-error-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Wedding Dashboard</h2>
            <p className="text-primary-100">Manage your dream team</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-primary-100 text-sm">Days to go</p>
            <p className="text-2xl font-bold">42</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-primary-100 text-sm">Tasks done</p>
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Helpers</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.helpersActive}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.completedTasks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Today</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.tasksToday}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Star className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.averageRating}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <span className="text-sm text-gray-600">
            {stats.completedTasks}/{stats.totalTasks} tasks
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${stats.completionRate}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-success-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            On track
          </span>
          <span className="text-gray-600">
            {stats.completionRate}% complete
          </span>
        </div>
      </div>

      {/* Urgent Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
              Urgent Deadlines
            </h3>
            <button className="text-primary-600 text-sm font-semibold">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {upcomingDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {deadline.taskTitle}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {deadline.helperName} • {deadline.category}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}
                  >
                    {deadline.priority}
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDeadline(deadline.deadline)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Recent Activity</h3>
          <button className="text-primary-600 text-sm font-semibold">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab('tasks')}
            className="flex flex-col items-center gap-2 p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
          >
            <Plus className="w-6 h-6 text-primary-600" />
            <span className="text-sm font-semibold text-primary-700">
              Add Task
            </span>
          </button>

          <button
            onClick={() => setActiveTab('helpers')}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Users className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              Add Helper
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assign')}
            className="flex flex-col items-center gap-2 p-4 bg-success-50 hover:bg-success-100 rounded-xl transition-colors"
          >
            <Zap className="w-6 h-6 text-success-600" />
            <span className="text-sm font-semibold text-success-700">
              Assign Tasks
            </span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 bg-warning-50 hover:bg-warning-100 rounded-xl transition-colors">
            <MessageCircle className="w-6 h-6 text-warning-600" />
            <span className="text-sm font-semibold text-warning-700">
              Send Update
            </span>
          </button>
        </div>
      </div>

      {/* WedMe Integration */}
      <WedMeIntegration />
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'tasks':
        return <TouchOptimizedHelperDashboard />;
      case 'helpers':
        return <MobileHelperDirectory />;
      case 'assign':
        return <TouchDragAndDrop />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Settings panel coming soon</p>
          </div>
        );
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Helper Hub</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6">{renderTabContent()}</div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="grid grid-cols-5 py-2">
          {[
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'tasks', icon: CheckCircle2, label: 'Tasks' },
            { id: 'helpers', icon: Users, label: 'Helpers' },
            { id: 'assign', icon: Zap, label: 'Assign' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex flex-col items-center py-3 px-2 transition-colors min-h-[56px] ${
                activeTab === id
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
