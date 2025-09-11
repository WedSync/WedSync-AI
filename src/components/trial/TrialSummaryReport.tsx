'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Share2,
  TrendingUp,
  Calendar,
  Users,
  MessageSquare,
  CheckCircle,
  Award,
  BarChart3,
  Clock,
  Zap,
  Target,
  DollarSign,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TrialSummaryData {
  userId: string;
  trialStartDate: string;
  trialEndDate: string;
  daysUsed: number;
  daysRemaining: number;
  metrics: {
    hoursSaved: number;
    tasksAutomated: number;
    weddingsManaged: number;
    suppliersConnected: number;
    messagesProcessed: number;
    journeysCreated: number;
    guestsManaged: number;
    templatesUsed: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    icon: string;
  }[];
  featureUsage: {
    feature: string;
    usageCount: number;
    timeSaved: number;
    percentageUsed: number;
  }[];
  roi: {
    totalValueGenerated: number;
    projectedAnnualSavings: number;
    efficiencyGain: number;
    breakEvenDays: number;
  };
  recommendations: {
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}

export const TrialSummaryReport: React.FC = () => {
  const [summaryData, setSummaryData] = useState<TrialSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrialSummary();
  }, []);

  const fetchTrialSummary = async () => {
    try {
      const response = await fetch('/api/trial/summary');
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('Error fetching trial summary:', error);
      // Use mock data for demonstration
      setSummaryData({
        userId: 'user123',
        trialStartDate: new Date(
          Date.now() - 28 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        trialEndDate: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        daysUsed: 28,
        daysRemaining: 2,
        metrics: {
          hoursSaved: 42,
          tasksAutomated: 156,
          weddingsManaged: 3,
          suppliersConnected: 28,
          messagesProcessed: 892,
          journeysCreated: 12,
          guestsManaged: 450,
          templatesUsed: 8,
        },
        achievements: [
          {
            id: '1',
            name: 'Quick Starter',
            description: 'Created first wedding within 24 hours',
            unlockedAt: new Date(
              Date.now() - 27 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            icon: '🚀',
          },
          {
            id: '2',
            name: 'Automation Master',
            description: 'Automated 100+ tasks',
            unlockedAt: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            icon: '⚡',
          },
          {
            id: '3',
            name: 'Team Builder',
            description: 'Connected 25+ suppliers',
            unlockedAt: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            icon: '👥',
          },
        ],
        featureUsage: [
          {
            feature: 'Journey Builder',
            usageCount: 45,
            timeSaved: 12,
            percentageUsed: 95,
          },
          {
            feature: 'Guest Management',
            usageCount: 89,
            timeSaved: 8,
            percentageUsed: 85,
          },
          {
            feature: 'Supplier Coordination',
            usageCount: 156,
            timeSaved: 15,
            percentageUsed: 92,
          },
          {
            feature: 'Template Library',
            usageCount: 23,
            timeSaved: 5,
            percentageUsed: 65,
          },
          {
            feature: 'Analytics Dashboard',
            usageCount: 67,
            timeSaved: 2,
            percentageUsed: 78,
          },
        ],
        roi: {
          totalValueGenerated: 2100,
          projectedAnnualSavings: 25200,
          efficiencyGain: 35,
          breakEvenDays: 3,
        },
        recommendations: [
          {
            title: 'Explore Advanced Automation',
            description:
              'You could save an additional 10 hours/month with journey automation',
            impact: 'high',
          },
          {
            title: 'Connect More Suppliers',
            description:
              'Adding your photographer and florist could streamline coordination',
            impact: 'medium',
          },
          {
            title: 'Use Email Templates',
            description: 'Pre-built templates could save 2 hours per wedding',
            impact: 'medium',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`WedSync-Trial-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const shareReport = async () => {
    const shareData = {
      title: 'My WedSync Trial Results',
      text: `I saved ${summaryData?.metrics.hoursSaved} hours and automated ${summaryData?.metrics.tasksAutomated} tasks during my WedSync trial!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(
          shareData.text + ' ' + shareData.url,
        );
        alert('Report link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!summaryData) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Your Trial Summary Report
        </h1>
        <div className="flex gap-3">
          <Button
            onClick={shareReport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-white p-8">
        {/* Header */}
        <div className="border-b pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WedSync Trial Performance Report
              </h2>
              <p className="text-gray-600 mt-2">
                Period: {format(new Date(summaryData.trialStartDate), 'MMM d')}{' '}
                - {format(new Date(summaryData.trialEndDate), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {summaryData.daysUsed} Days
              </div>
              <div className="text-sm text-gray-600">Trial Usage</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Key Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              className="bg-white p-4 rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Clock className="h-6 w-6 text-blue-600 mb-2" />
              <div className="text-2xl font-bold">
                {summaryData.metrics.hoursSaved}h
              </div>
              <div className="text-sm text-gray-600">Time Saved</div>
            </motion.div>

            <motion.div
              className="bg-white p-4 rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Zap className="h-6 w-6 text-yellow-600 mb-2" />
              <div className="text-2xl font-bold">
                {summaryData.metrics.tasksAutomated}
              </div>
              <div className="text-sm text-gray-600">Tasks Automated</div>
            </motion.div>

            <motion.div
              className="bg-white p-4 rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Calendar className="h-6 w-6 text-green-600 mb-2" />
              <div className="text-2xl font-bold">
                {summaryData.metrics.weddingsManaged}
              </div>
              <div className="text-sm text-gray-600">Weddings</div>
            </motion.div>

            <motion.div
              className="bg-white p-4 rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Users className="h-6 w-6 text-purple-600 mb-2" />
              <div className="text-2xl font-bold">
                {summaryData.metrics.suppliersConnected}
              </div>
              <div className="text-sm text-gray-600">Suppliers</div>
            </motion.div>
          </div>
        </Card>

        {/* ROI Analysis */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Return on Investment
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value Generated</span>
                  <span className="font-bold text-green-600">
                    ${summaryData.roi.totalValueGenerated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Projected Annual Savings
                  </span>
                  <span className="font-bold">
                    ${summaryData.roi.projectedAnnualSavings.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Efficiency Gain</span>
                  <span className="font-bold text-blue-600">
                    +{summaryData.roi.efficiencyGain}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {summaryData.roi.breakEvenDays}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Days to Break Even
                </div>
                <Badge className="mt-2" variant="outline">
                  Exceptional ROI
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Feature Usage */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Feature Utilization
          </h3>
          <div className="space-y-4">
            {summaryData.featureUsage.map((feature, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{feature.feature}</span>
                  <span className="text-gray-600">
                    {feature.usageCount} uses • {feature.timeSaved}h saved
                  </span>
                </div>
                <Progress value={feature.percentageUsed} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        {/* Achievements */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-600" />
            Achievements Unlocked
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {summaryData.achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-sm text-gray-600">
                      {achievement.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(achievement.unlockedAt), 'MMM d')}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
            Growth Opportunities
          </h3>
          <div className="space-y-3">
            {summaryData.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getImpactColor(rec.impact)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{rec.title}</div>
                    <div className="text-sm mt-1">{rec.description}</div>
                  </div>
                  <Badge variant="outline" className="ml-3">
                    {rec.impact} impact
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-gray-600">
          <p>Thank you for trying WedSync! Ready to continue your journey?</p>
          <Button className="mt-4" size="lg">
            Upgrade to Professional Plan
          </Button>
        </div>
      </div>
    </div>
  );
};
