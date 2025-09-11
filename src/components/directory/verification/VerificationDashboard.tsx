import React, { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { VerificationStatus } from './VerificationBadges';

export interface VerificationRequest {
  id: string;
  verificationType:
    | 'business_license'
    | 'insurance'
    | 'professional_certification'
    | 'review_authenticity'
    | 'portfolio_verification';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  expiryDate?: string;
  documents: VerificationDocument[];
}

interface VerificationDocument {
  id: string;
  fileName: string;
  uploadedAt: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

interface VerificationDashboardProps {
  supplierId: string;
  verificationStatus: VerificationStatus;
  onDocumentUpload: (document: VerificationDocument) => void;
  onStatusRefresh: () => void;
}

const getVerificationTypeConfig = (type: string) => {
  const configs = {
    business_license: {
      title: 'Business License Verification',
      description: 'Verify your business registration and licensing',
      icon: Shield,
      requirements: [
        'Valid business license or registration certificate',
        'Tax identification number',
        'Registered business address',
        'Current year registration (not expired)',
      ],
      benefits: [
        'Higher search ranking priority',
        'Access to premium booking features',
        'Eligibility for WedSync Partner Program',
        'Increased couple confidence and bookings',
      ],
      estimatedTime: '2-3 business days',
    },
    insurance: {
      title: 'Insurance Verification',
      description: 'Verify your professional liability insurance',
      icon: Shield,
      requirements: [
        'Current liability insurance certificate',
        'Minimum $1M general liability',
        'Minimum $500K professional liability',
        'Insurance must cover wedding/event services',
      ],
      benefits: [
        'Featured in "Trusted Professionals" section',
        'Higher couple booking confidence',
        'Priority customer support',
        'Access to higher-value wedding bookings',
      ],
      estimatedTime: '1-2 business days',
    },
    professional_certification: {
      title: 'Professional Certification',
      description: 'Verify your industry certifications and qualifications',
      icon: Shield,
      requirements: [
        'Current professional certifications',
        'Educational credentials (where applicable)',
        'Continuing education proof',
        'Professional association memberships',
      ],
      benefits: [
        'Specialist category placement',
        'Premium profile features',
        'Higher service rates justified',
        'Industry credibility boost',
      ],
      estimatedTime: '3-5 business days',
    },
    review_authenticity: {
      title: 'Review Authenticity',
      description: 'Verify genuine customer reviews and ratings',
      icon: CheckCircle,
      requirements: [
        'Minimum 10 verified bookings through WedSync',
        'Review verification process completion',
        'Customer contact verification',
        'No suspicious review patterns',
      ],
      benefits: [
        'Protected against fake review penalties',
        'Higher trust score with couples',
        'Improved search algorithm ranking',
        'Review authenticity guarantee displayed',
      ],
      estimatedTime: '1-2 weeks',
    },
    portfolio_verification: {
      title: 'Portfolio Verification',
      description: 'Verify authentic work samples and ownership',
      icon: Shield,
      requirements: [
        'Original work samples with metadata',
        'Client permission documentation',
        'Copyright ownership proof',
        'Professional quality standards met',
      ],
      benefits: [
        'Higher-quality lead generation',
        'Featured portfolio placement',
        'Protection against image theft',
        'Professional credibility enhancement',
      ],
      estimatedTime: '3-5 business days',
    },
  };

  return configs[type as keyof typeof configs];
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'under_review':
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'rejected':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'expired':
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

export function VerificationDashboard({
  supplierId,
  verificationStatus,
  onDocumentUpload,
  onStatusRefresh,
}: VerificationDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('business_license');
  const [verificationRequests, setVerificationRequests] = useState<
    VerificationRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockRequests: VerificationRequest[] = [
      {
        id: '1',
        verificationType: 'business_license',
        status: 'approved',
        submittedAt: '2024-12-15T10:30:00Z',
        reviewedAt: '2024-12-17T14:22:00Z',
        documents: [
          {
            id: '1',
            fileName: 'business-license.pdf',
            uploadedAt: '2024-12-15T10:30:00Z',
            processingStatus: 'completed',
          },
        ],
      },
    ];
    setVerificationRequests(mockRequests);
  }, []);

  const getVerificationProgress = () => {
    const total = 5; // Total verification types
    const completed = Object.values(verificationStatus.categories).filter(
      Boolean,
    ).length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const progress = getVerificationProgress();
  const currentConfig = getVerificationTypeConfig(activeTab);

  const availableVerifications = [
    'business_license',
    'insurance',
    'professional_certification',
    'review_authenticity',
    'portfolio_verification',
  ].filter(
    (type) =>
      !verificationStatus.categories[
        type as keyof typeof verificationStatus.categories
      ],
  );

  const currentRequest = verificationRequests.find(
    (r) => r.verificationType === activeTab,
  );
  const isVerified =
    verificationStatus.categories[
      activeTab as keyof typeof verificationStatus.categories
    ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Verification Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Build trust with couples by verifying your professional
              credentials
            </p>
          </div>
          <button
            onClick={onStatusRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh Status
          </button>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {progress.completed}/{progress.total}
                </div>
                <div className="text-sm text-primary-700">
                  Verifications Complete
                </div>
              </div>
              <div className="w-16 h-16 relative">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-primary-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${progress.percentage}, 100`}
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-600">
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {verificationStatus.trustScore}
                </div>
                <div className="text-sm text-green-700">Trust Score</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600 capitalize">
                  {verificationStatus.level}
                </div>
                <div className="text-sm text-blue-700">Verification Level</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              'business_license',
              'insurance',
              'professional_certification',
              'review_authenticity',
              'portfolio_verification',
            ].map((type) => {
              const config = getVerificationTypeConfig(type);
              const isCompleted =
                verificationStatus.categories[
                  type as keyof typeof verificationStatus.categories
                ];
              const hasPending = verificationRequests.some(
                (r) =>
                  r.verificationType === type &&
                  ['pending', 'under_review'].includes(r.status),
              );

              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                    ${
                      activeTab === type
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {hasPending && !isCompleted && (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                  {config?.title}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {currentConfig && (
            <div className="space-y-6">
              {/* Verification Info */}
              <div>
                <div className="flex items-start gap-4">
                  <currentConfig.icon className="w-8 h-8 text-primary-600 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentConfig.title}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      {currentConfig.description}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      Estimated processing time: {currentConfig.estimatedTime}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {currentRequest && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border">
                      {getStatusIcon(currentRequest.status)}
                      <span className="text-sm font-medium capitalize">
                        {currentRequest.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Status */}
              {isVerified ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-900">
                        Verification Complete
                      </div>
                      <div className="text-sm text-green-700">
                        Your {currentConfig.title.toLowerCase()} has been
                        verified and is active.
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentRequest?.status === 'rejected' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900">
                        Verification Rejected
                      </div>
                      <div className="text-sm text-red-700">
                        {currentRequest.rejectionReason ||
                          'Please review requirements and resubmit.'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Requirements */}
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4">
                      📋 Requirements
                    </h3>
                    <ul className="space-y-2">
                      {currentConfig.requirements.map((req, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-blue-800"
                        >
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Benefits */}
                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-4">
                      ✨ Benefits
                    </h3>
                    <ul className="space-y-2">
                      {currentConfig.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-green-800"
                        >
                          <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Section */}
              {!isVerified && (
                <div className="border-t pt-6">
                  {currentRequest ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        Submitted Documents
                      </h3>
                      <div className="space-y-3">
                        {currentRequest.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <Upload className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {doc.fileName}
                              </div>
                              <div className="text-xs text-gray-500">
                                Uploaded{' '}
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.processingStatus)}
                              <span className="text-sm capitalize">
                                {doc.processingStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Ready to Start Verification
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Upload your documents to begin the verification process
                      </p>
                      <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">
                        Start {currentConfig.title}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerificationDashboard;
