'use client';

import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Animation variants for cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

const shimmerVariants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 3,
      ease: 'linear',
    },
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  index: number;
}

function StatCard({ title, value, change, icon: Icon, index }: StatCardProps) {
  const isPositive = change && change > 0;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {change !== undefined && (
                <div
                  className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  index: number;
}

function ActivityItem({ title, description, time, index }: ActivityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start space-x-3 py-3 border-b last:border-0"
    >
      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </motion.div>
  );
}

export default function DashboardPage() {
  // Mock data - replace with real data fetching
  const stats = [
    { title: 'Total Clients', value: '156', change: 12, icon: Users },
    { title: 'Upcoming Weddings', value: '24', change: -5, icon: Calendar },
    {
      title: 'Revenue (Monthly)',
      value: '$48.5k',
      change: 18,
      icon: TrendingUp,
    },
    { title: 'Active Forms', value: '89', change: 8, icon: FileText },
  ];

  const activities = [
    {
      title: 'New client registered',
      description: 'Sarah Johnson completed registration',
      time: '2 min ago',
    },
    {
      title: 'Form submission',
      description: 'Vendor questionnaire received from ABC Flowers',
      time: '15 min ago',
    },
    {
      title: 'Payment received',
      description: '$2,500 from Thompson wedding',
      time: '1 hour ago',
    },
    {
      title: 'Journey completed',
      description: 'Onboarding flow for Miller wedding',
      time: '3 hours ago',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your wedding planning business.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="col-span-4"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
            <motion.div
              className="h-[300px] flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              style={{
                backgroundSize: '200% 100%',
                background:
                  'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
              }}
            >
              <p className="text-muted-foreground">
                Chart will be implemented here
              </p>
            </motion.div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="col-span-3"
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              {activities.map((activity, index) => (
                <ActivityItem key={index} {...activity} index={index} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/activity" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Activity
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/clients/new">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 w-full"
              >
                <Users className="h-5 w-5" />
                <span>Add Client</span>
              </Button>
            </Link>
            <Link href="/dashboard/forms/builder">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 w-full"
              >
                <FileText className="h-5 w-5" />
                <span>Create Form</span>
              </Button>
            </Link>
            <Link href="/journeys/new">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 w-full"
              >
                <Activity className="h-5 w-5" />
                <span>New Journey</span>
              </Button>
            </Link>
            <Link href="/analytics">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 w-full"
              >
                <BarChart3 className="h-5 w-5" />
                <span>View Analytics</span>
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
