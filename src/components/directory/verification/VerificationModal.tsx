import React from 'react';
import {
  X,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Award,
} from 'lucide-react';

export interface VerificationDetails {
  verificationType: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  earnedAt?: string;
  expiresAt?: string;
  verificationCriteria: VerificationCriteria[];
  benefits: string[];
  supportingDocuments: SupportingDocument[];
}

interface VerificationCriteria {
  requirement: string;
  status: 'met' | 'pending' | 'failed';
  description: string;
}

interface SupportingDocument {
  type: string;
  name: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'rejected';
}

interface VerificationModalProps {
  isOpen: boolean;
  verificationDetails: VerificationDetails;
  onClose: () => void;
  showRequirements?: boolean;
}

const getVerificationTypeInfo = (type: string) => {
  const typeInfo = {
    business_license: {
      title: 'Licensed Business',
      icon: Shield,
      description:
        'This supplier has verified their business registration and licensing with us.',
      trustLevel: 'High',
      color: 'blue',
      whatItMeans:
        'The supplier operates as a legally registered business with proper licensing for their services.',
      whyItMatters:
        'Licensed businesses are accountable to regulatory authorities and must maintain professional standards.',
      verificationProcess: [
        'Business registration documents reviewed',
        'License validity confirmed with issuing authority',
        'Business name and address verified',
        'Tax registration status confirmed',
      ],
    },
    insurance: {
      title: 'Insured Professional',
      icon: Shield,
      description:
        'This supplier carries comprehensive liability insurance for your protection.',
      trustLevel: 'High',
      color: 'green',
      whatItMeans:
        'The supplier has current general and professional liability insurance coverage.',
      whyItMatters:
        'Insurance protects you from financial loss if accidents occur or services are not delivered as promised.',
      verificationProcess: [
        'Certificate of insurance reviewed',
        'Coverage amounts verified ($1M+ general liability)',
        'Policy validity confirmed with insurer',
        'Coverage scope matches service offerings',
      ],
    },
    professional_certification: {
      title: 'Certified Professional',
      icon: Award,
      description:
        'This supplier has earned industry-recognized certifications and qualifications.',
      trustLevel: 'High',
      color: 'purple',
      whatItMeans:
        'The supplier has completed professional training and maintains industry certifications.',
      whyItMatters:
        'Certified professionals have proven expertise and stay current with industry best practices.',
      verificationProcess: [
        'Professional certifications validated',
        'Continuing education requirements confirmed',
        'Industry association memberships verified',
        'Qualification authenticity confirmed',
      ],
    },
    review_authenticity: {
      title: 'Verified Reviews',
      icon: CheckCircle,
      description:
        "This supplier's customer reviews have been verified as authentic.",
      trustLevel: 'Medium',
      color: 'yellow',
      whatItMeans:
        'Customer reviews and ratings have been confirmed as genuine feedback from real clients.',
      whyItMatters:
        'Verified reviews give you confidence that testimonials reflect actual customer experiences.',
      verificationProcess: [
        'Customer contact information verified',
        'Booking history confirmed',
        'Review patterns analyzed for authenticity',
        'Suspicious reviews flagged and removed',
      ],
    },
    portfolio_verification: {
      title: 'Verified Portfolio',
      icon: CheckCircle,
      description:
        "This supplier's work samples have been verified as authentic and original.",
      trustLevel: 'Medium',
      color: 'pink',
      whatItMeans:
        "Portfolio images and work samples are confirmed as the supplier's original work.",
      whyItMatters:
        "Verified portfolios ensure you see actual work quality and aren't misled by stolen images.",
      verificationProcess: [
        'Image metadata and EXIF data analyzed',
        'Copyright ownership verified',
        'Client permissions confirmed',
        'Work authenticity validated',
      ],
    },
  };

  return typeInfo[type as keyof typeof typeInfo];
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle,
        label: 'Verified',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description:
          'This verification has been approved and is currently active.',
      };
    case 'pending':
      return {
        icon: Clock,
        label: 'Under Review',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        description:
          'This verification is currently being reviewed by our team.',
      };
    case 'rejected':
      return {
        icon: AlertCircle,
        label: 'Not Verified',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description:
          'This verification request was not approved. Additional documentation may be required.',
      };
    case 'expired':
      return {
        icon: AlertCircle,
        label: 'Expired',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        description: 'This verification has expired and needs to be renewed.',
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        description: 'Verification status is unknown.',
      };
  }
};

export function VerificationModal({
  isOpen,
  verificationDetails,
  onClose,
  showRequirements = true,
}: VerificationModalProps) {
  if (!isOpen) return null;

  const typeInfo = getVerificationTypeInfo(
    verificationDetails.verificationType,
  );
  const statusConfig = getStatusConfig(verificationDetails.status);
  const IconComponent = typeInfo?.icon || Shield;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-full bg-${typeInfo?.color || 'gray'}-100`}
              >
                <IconComponent
                  className={`w-8 h-8 text-${typeInfo?.color || 'gray'}-600`}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {typeInfo?.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <statusConfig.icon
                    className={`w-4 h-4 ${statusConfig.color}`}
                  />
                  <span className={`text-sm font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-5rem)]">
            <div className="p-6 space-y-8">
              {/* Status Banner */}
              <div className={`${statusConfig.bgColor} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <statusConfig.icon
                    className={`w-6 h-6 ${statusConfig.color} mt-0.5`}
                  />
                  <div>
                    <h3 className={`font-semibold ${statusConfig.color}`}>
                      {statusConfig.label}
                    </h3>
                    <p
                      className={`text-sm ${statusConfig.color.replace('600', '700')} mt-1`}
                    >
                      {statusConfig.description}
                    </p>
                    {verificationDetails.earnedAt && (
                      <p
                        className={`text-xs ${statusConfig.color.replace('600', '500')} mt-2`}
                      >
                        Verified on{' '}
                        {new Date(
                          verificationDetails.earnedAt,
                        ).toLocaleDateString()}
                      </p>
                    )}
                    {verificationDetails.expiresAt && (
                      <p
                        className={`text-xs ${statusConfig.color.replace('600', '500')}`}
                      >
                        Expires on{' '}
                        {new Date(
                          verificationDetails.expiresAt,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* What This Means */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  What This Means
                </h3>
                <p className="text-gray-700">{typeInfo?.whatItMeans}</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Why This Matters for Your Wedding
                  </h4>
                  <p className="text-blue-800 text-sm">
                    {typeInfo?.whyItMatters}
                  </p>
                </div>
              </div>

              {/* Verification Process */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Verification Process
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {typeInfo?.verificationProcess.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Criteria */}
              {showRequirements &&
                verificationDetails.verificationCriteria.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Verification Requirements
                    </h3>
                    <div className="space-y-3">
                      {verificationDetails.verificationCriteria.map(
                        (criteria, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 border rounded-lg"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {criteria.status === 'met' && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                              {criteria.status === 'pending' && (
                                <Clock className="w-5 h-5 text-yellow-600" />
                              )}
                              {criteria.status === 'failed' && (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {criteria.requirement}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {criteria.description}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Supporting Documents */}
              {verificationDetails.supportingDocuments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Supporting Documents
                  </h3>
                  <div className="space-y-3">
                    {verificationDetails.supportingDocuments.map(
                      (document, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {document.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {document.type} • Uploaded{' '}
                                {new Date(
                                  document.uploadedAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {document.status === 'verified' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {document.status === 'pending' && (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            )}
                            {document.status === 'rejected' && (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm text-gray-600 capitalize">
                              {document.status}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {verificationDetails.benefits.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Benefits of This Verification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {verificationDetails.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-green-50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">{benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust Level */}
              {typeInfo && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Trust Level</h4>
                      <p className="text-sm text-gray-600">
                        Based on verification completeness and rigor
                      </p>
                    </div>
                    <div
                      className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      ${
                        typeInfo.trustLevel === 'High'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    `}
                    >
                      {typeInfo.trustLevel}
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  Need Help Understanding This Verification?
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Our support team is here to explain any verification details
                  or answer questions about supplier credentials.
                </p>
                <div className="flex gap-3">
                  <button className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
                    <ExternalLink className="w-4 h-4" />
                    Contact Support
                  </button>
                  <button className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
                    <ExternalLink className="w-4 h-4" />
                    Learn More About Verifications
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Verification powered by WedSync Trust & Safety
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationModal;
