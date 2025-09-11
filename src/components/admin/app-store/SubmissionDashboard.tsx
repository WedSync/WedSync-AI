'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StoreSubmission {
  id: string;
  store: 'microsoft' | 'google_play' | 'apple';
  status:
    | 'draft'
    | 'submitted'
    | 'reviewing'
    | 'approved'
    | 'rejected'
    | 'published';
  version: string;
  submittedDate?: Date;
  reviewStartDate?: Date;
  publishedDate?: Date;
  rejectionReason?: string;
  downloads?: number;
  rating?: number;
  reviews?: number;
}

interface StoreRequirement {
  id: string;
  store: string;
  category: 'technical' | 'content' | 'legal' | 'assets';
  name: string;
  description: string;
  status: 'pending' | 'complete' | 'needs_attention';
  priority: 'high' | 'medium' | 'low';
}

interface SubmissionAction {
  type: 'submit' | 'update' | 'withdraw' | 'respond' | 'resubmit';
  submissionId: string;
  data?: any;
}

interface SubmissionDashboardProps {
  submissions: StoreSubmission[];
  requirements: StoreRequirement[];
  onSubmissionAction: (action: SubmissionAction) => void;
}

const MOCK_SUBMISSIONS: StoreSubmission[] = [
  {
    id: 'ms-001',
    store: 'microsoft',
    status: 'published',
    version: '1.2.0',
    submittedDate: new Date('2024-01-15'),
    reviewStartDate: new Date('2024-01-16'),
    publishedDate: new Date('2024-01-22'),
    downloads: 1247,
    rating: 4.5,
    reviews: 23,
  },
  {
    id: 'gp-001',
    store: 'google_play',
    status: 'reviewing',
    version: '1.2.0',
    submittedDate: new Date('2024-01-25'),
    reviewStartDate: new Date('2024-01-26'),
  },
  {
    id: 'as-001',
    store: 'apple',
    status: 'draft',
    version: '1.3.0',
  },
];

const MOCK_REQUIREMENTS: StoreRequirement[] = [
  {
    id: 'ms-tech-001',
    store: 'microsoft',
    category: 'technical',
    name: 'PWA Service Worker',
    description:
      'Service worker must be registered and functional for offline capabilities',
    status: 'complete',
    priority: 'high',
  },
  {
    id: 'ms-content-001',
    store: 'microsoft',
    category: 'content',
    name: 'Family-Friendly Content',
    description: 'All content must be appropriate for all audiences',
    status: 'complete',
    priority: 'high',
  },
  {
    id: 'gp-tech-001',
    store: 'google_play',
    category: 'technical',
    name: 'Digital Asset Links',
    description: 'Configure .well-known/assetlinks.json for TWA validation',
    status: 'needs_attention',
    priority: 'high',
  },
  {
    id: 'gp-assets-001',
    store: 'google_play',
    category: 'assets',
    name: 'Feature Graphic',
    description: 'Upload 1024x500 feature graphic for Play Store listing',
    status: 'pending',
    priority: 'medium',
  },
  {
    id: 'as-legal-001',
    store: 'apple',
    category: 'legal',
    name: 'Privacy Policy',
    description:
      'Privacy policy must be accessible from app and App Store listing',
    status: 'complete',
    priority: 'high',
  },
];

export function SubmissionDashboard({
  submissions = MOCK_SUBMISSIONS,
  requirements = MOCK_REQUIREMENTS,
  onSubmissionAction,
}: SubmissionDashboardProps) {
  const [activeSubmissions, setActiveSubmissions] =
    useState<StoreSubmission[]>(submissions);
  const [storeRequirements, setStoreRequirements] =
    useState<StoreRequirement[]>(requirements);
  const [selectedStore, setSelectedStore] = useState<string>('all');

  const getStatusColor = (status: StoreSubmission['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'approved':
        return 'bg-green-400';
      case 'reviewing':
        return 'bg-blue-500';
      case 'submitted':
        return 'bg-blue-400';
      case 'rejected':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-400';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: StoreSubmission['status']) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'approved':
        return 'Approved';
      case 'reviewing':
        return 'Under Review';
      case 'submitted':
        return 'Submitted';
      case 'rejected':
        return 'Rejected';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  const getRequirementStatusColor = (status: StoreRequirement['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'needs_attention':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: StoreRequirement['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStoreName = (store: string) => {
    switch (store) {
      case 'microsoft':
        return 'Microsoft Store';
      case 'google_play':
        return 'Google Play';
      case 'apple':
        return 'Apple App Store';
      default:
        return store;
    }
  };

  const getStoreIcon = (store: string) => {
    switch (store) {
      case 'microsoft':
        return (
          <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
            MS
          </div>
        );
      case 'google_play':
        return (
          <div className="w-6 h-6 bg-green-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
            GP
          </div>
        );
      case 'apple':
        return (
          <div className="w-6 h-6 bg-gray-800 rounded-sm flex items-center justify-center text-white text-xs font-bold">
            AS
          </div>
        );
      default:
        return <div className="w-6 h-6 bg-gray-400 rounded-sm"></div>;
    }
  };

  const calculateCompletionRate = (store: string) => {
    const storeReqs = storeRequirements.filter((r) => r.store === store);
    const completedReqs = storeReqs.filter((r) => r.status === 'complete');
    return storeReqs.length > 0
      ? (completedReqs.length / storeReqs.length) * 100
      : 0;
  };

  const handleSubmissionAction = useCallback(
    (type: SubmissionAction['type'], submissionId: string, data?: any) => {
      const action: SubmissionAction = { type, submissionId, data };
      onSubmissionAction(action);

      // Update local state based on action
      setActiveSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id === submissionId) {
            switch (type) {
              case 'submit':
                return {
                  ...sub,
                  status: 'submitted',
                  submittedDate: new Date(),
                };
              case 'withdraw':
                return { ...sub, status: 'draft' };
              case 'resubmit':
                return {
                  ...sub,
                  status: 'submitted',
                  submittedDate: new Date(),
                };
              default:
                return sub;
            }
          }
          return sub;
        }),
      );
    },
    [onSubmissionAction],
  );

  const filteredSubmissions =
    selectedStore === 'all'
      ? activeSubmissions
      : activeSubmissions.filter((sub) => sub.store === selectedStore);

  const filteredRequirements =
    selectedStore === 'all'
      ? storeRequirements
      : storeRequirements.filter((req) => req.store === selectedStore);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Submission Dashboard</h2>
        <div className="flex items-center space-x-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="all">All Stores</option>
            <option value="microsoft">Microsoft Store</option>
            <option value="google_play">Google Play</option>
            <option value="apple">Apple App Store</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Store Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['microsoft', 'google_play', 'apple'].map((store) => {
              const submission = activeSubmissions.find(
                (s) => s.store === store,
              );
              const completionRate = calculateCompletionRate(store);

              return (
                <Card key={store}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getStoreIcon(store)}
                        <span className="font-medium text-sm">
                          {getStoreName(store)}
                        </span>
                      </div>
                      {submission && (
                        <Badge
                          size="sm"
                          className={getStatusColor(submission.status)}
                        >
                          {getStatusText(submission.status)}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Readiness</span>
                        <span>{Math.round(completionRate)}%</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>

                    {submission && submission.status === 'published' && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        {submission.downloads && (
                          <div className="flex justify-between text-xs">
                            <span>Downloads</span>
                            <span className="font-medium">
                              {submission.downloads.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {submission.rating && (
                          <div className="flex justify-between text-xs">
                            <span>Rating</span>
                            <span className="font-medium">
                              {submission.rating} ⭐
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="justify-start">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                  Generate Assets
                </Button>
                <Button variant="outline" className="justify-start">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Run Compliance Check
                </Button>
                <Button variant="outline" className="justify-start">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Optimize Listing
                </Button>
                <Button variant="outline" className="justify-start">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview Store Listing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getStoreIcon(submission.store)}
                      <div>
                        <h3 className="font-medium">
                          {getStoreName(submission.store)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Version {submission.version}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusText(submission.status)}
                      </Badge>

                      <div className="flex space-x-2">
                        {submission.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSubmissionAction('submit', submission.id)
                            }
                          >
                            Submit
                          </Button>
                        )}
                        {submission.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSubmissionAction('resubmit', submission.id)
                            }
                          >
                            Resubmit
                          </Button>
                        )}
                        {['submitted', 'reviewing'].includes(
                          submission.status,
                        ) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleSubmissionAction('withdraw', submission.id)
                            }
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {submission.submittedDate && (
                      <div>
                        <span className="text-gray-500">Submitted:</span>
                        <p className="font-medium">
                          {submission.submittedDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {submission.reviewStartDate && (
                      <div>
                        <span className="text-gray-500">Review Started:</span>
                        <p className="font-medium">
                          {submission.reviewStartDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {submission.publishedDate && (
                      <div>
                        <span className="text-gray-500">Published:</span>
                        <p className="font-medium">
                          {submission.publishedDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {submission.downloads && (
                      <div>
                        <span className="text-gray-500">Downloads:</span>
                        <p className="font-medium">
                          {submission.downloads.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {submission.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 text-sm">
                        Rejection Reason
                      </h4>
                      <p className="text-red-700 text-sm mt-1">
                        {submission.rejectionReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <div className="space-y-4">
            {['high', 'medium', 'low'].map((priority) => {
              const priorityReqs = filteredRequirements.filter(
                (req) => req.priority === priority,
              );
              if (priorityReqs.length === 0) return null;

              return (
                <div key={priority}>
                  <h3 className="font-medium mb-3 capitalize">
                    {priority} Priority
                  </h3>
                  <div className="space-y-2">
                    {priorityReqs.map((requirement) => (
                      <Card
                        key={requirement.id}
                        className={`border-l-4 ${getPriorityColor(requirement.priority)}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {getStoreIcon(requirement.store)}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {requirement.name}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {requirement.description}
                                </p>
                                <div className="mt-2 flex items-center space-x-2">
                                  <Badge
                                    size="sm"
                                    variant="secondary"
                                    className="capitalize"
                                  >
                                    {requirement.category}
                                  </Badge>
                                  <Badge
                                    size="sm"
                                    className={getRequirementStatusColor(
                                      requirement.status,
                                    )}
                                  >
                                    {requirement.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {requirement.status === 'needs_attention' && (
                              <Button size="sm" variant="outline">
                                Fix Issue
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">3,492</div>
                  <p className="text-sm text-gray-500">Total Downloads</p>
                  <p className="text-xs text-green-600">+23% vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">4.6</div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <p className="text-xs text-green-600">+0.3 vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">187</div>
                  <p className="text-sm text-gray-500">Total Reviews</p>
                  <p className="text-xs text-green-600">+45% vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">18%</div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-xs text-red-600">-2% vs last month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Store Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSubmissions
                  .filter((s) => s.status === 'published')
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getStoreIcon(submission.store)}
                        <span className="font-medium">
                          {getStoreName(submission.store)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold">
                            {submission.downloads?.toLocaleString() || 0}
                          </div>
                          <div className="text-gray-500">Downloads</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {submission.rating || 0} ⭐
                          </div>
                          <div className="text-gray-500">Rating</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {submission.reviews || 0}
                          </div>
                          <div className="text-gray-500">Reviews</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
