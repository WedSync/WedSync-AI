'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Shield,
  FileText,
  Calendar,
  Users,
  Database,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Info,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  DATA_PROCESSING_PURPOSES,
  DATA_RETENTION_POLICIES,
} from '@/lib/compliance/gdpr-compliance';

interface PrivacyPolicySection {
  id: string;
  title: string;
  content: string;
  subsections?: PrivacyPolicySection[];
  isRequired: boolean;
  effectiveDate: Date;
  lastUpdated?: Date;
  changes?: string[];
}

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  className?: string;
  showTableOfContents?: boolean;
  highlightChanges?: boolean;
}

const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: `WedSync is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use our wedding planning platform. We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws.`,
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-12-01'),
    changes: [
      'Updated data retention periods',
      'Added new third-party integrations',
    ],
  },
  {
    id: 'data_collection',
    title: 'What Data We Collect',
    content:
      'We collect different types of data to provide and improve our wedding planning services:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'personal_data',
        title: 'Personal Information',
        content:
          'Name, email address, phone number, wedding date, venue details, guest information, and communication preferences.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'technical_data',
        title: 'Technical Data',
        content:
          'IP address, browser type, device information, usage patterns, and cookies for analytics and functionality.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'vendor_data',
        title: 'Vendor and Supplier Data',
        content:
          'Information about wedding suppliers, contracts, payments, and communication history.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'legal_basis',
    title: 'Legal Basis for Processing',
    content:
      'We process your personal data based on the following legal grounds:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'contract',
        title: 'Contractual Necessity',
        content:
          'Processing necessary to perform our wedding planning services contract with you.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'consent',
        title: 'Your Consent',
        content:
          'For marketing communications, analytics, and optional features. You can withdraw consent at any time.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'legitimate_interest',
        title: 'Legitimate Interests',
        content:
          'For fraud prevention, security, and improving our services, balanced against your privacy rights.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'data_use',
    title: 'How We Use Your Data',
    content: 'We use your personal data for the following purposes:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'wedding_services',
        title: 'Wedding Planning Services',
        content:
          'Manage your wedding timeline, coordinate with suppliers, track budgets, and facilitate communication.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'communications',
        title: 'Communications',
        content:
          'Send booking confirmations, updates, reminders, and customer support responses.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'improvements',
        title: 'Service Improvements',
        content:
          'Analyze usage patterns to improve our platform and develop new features.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'data_sharing',
    title: 'Data Sharing and Third Parties',
    content:
      'We may share your data with trusted third parties in specific circumstances:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-12-01'),
    changes: [
      'Added new payment processor',
      'Updated supplier verification process',
    ],
    subsections: [
      {
        id: 'suppliers',
        title: 'Wedding Suppliers',
        content:
          'We share relevant information with your chosen suppliers to facilitate wedding services.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'service_providers',
        title: 'Service Providers',
        content:
          'Trusted partners who help us provide services (payment processing, email delivery, cloud hosting).',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'legal_requirements',
        title: 'Legal Requirements',
        content:
          'When required by law, court order, or to protect our rights and safety.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'data_security',
    title: 'Data Security',
    content:
      'We implement comprehensive security measures to protect your personal data:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'technical_measures',
        title: 'Technical Safeguards',
        content:
          'Encryption in transit and at rest, secure authentication, regular security audits, and access controls.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'organizational_measures',
        title: 'Organizational Safeguards',
        content:
          'Staff training, data minimization, regular backups, and incident response procedures.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'your_rights',
    title: 'Your Rights',
    content:
      'Under GDPR, you have the following rights regarding your personal data:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'access_right',
        title: 'Right of Access',
        content: 'Request a copy of the personal data we hold about you.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'rectification_right',
        title: 'Right to Rectification',
        content:
          'Request correction of inaccurate or incomplete personal data.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'erasure_right',
        title: 'Right to Erasure',
        content:
          'Request deletion of your personal data in certain circumstances.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'portability_right',
        title: 'Right to Data Portability',
        content:
          'Receive your data in a machine-readable format for transfer to another service.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'objection_right',
        title: 'Right to Object',
        content:
          'Object to processing based on legitimate interests or for direct marketing.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'restriction_right',
        title: 'Right to Restrict Processing',
        content: 'Request limitation of processing in certain circumstances.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'contact_info',
    title: 'Contact Information',
    content:
      'For questions about this Privacy Policy or to exercise your rights:',
    isRequired: true,
    effectiveDate: new Date('2024-01-01'),
    subsections: [
      {
        id: 'dpo',
        title: 'Data Protection Officer',
        content: 'Email: privacy@wedsync.com | Response time: 30 days',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
      {
        id: 'supervisory_authority',
        title: 'Supervisory Authority',
        content:
          'You have the right to lodge a complaint with your local data protection authority.',
        isRequired: true,
        effectiveDate: new Date('2024-01-01'),
      },
    ],
  },
];

export function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAccept,
  className,
  showTableOfContents = true,
  highlightChanges = false,
}: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = React.useState('policy');
  const [activeSection, setActiveSection] = React.useState('overview');

  const scrollToSection = React.useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  const renderSection = (section: PrivacyPolicySection, level: number = 0) => (
    <div key={section.id} id={`section-${section.id}`} className="mb-8">
      <div
        className={cn('mb-4', level === 0 && 'border-l-4 border-primary pl-4')}
      >
        <div className="flex items-start justify-between mb-2">
          <h3
            className={cn(
              'font-semibold',
              level === 0 ? 'text-xl' : 'text-lg',
              level === 2 && 'text-base',
            )}
          >
            {section.title}
          </h3>
          <div className="flex items-center gap-2">
            {section.lastUpdated && highlightChanges && (
              <Badge variant="secondary" className="text-xs">
                Updated {format(section.lastUpdated, 'MMM yyyy')}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              v1.0
            </Badge>
          </div>
        </div>

        {section.lastUpdated && section.changes && highlightChanges && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">
                Recent Changes
              </span>
            </div>
            <ul className="text-sm text-yellow-800 list-disc list-inside">
              {section.changes.map((change, index) => (
                <li key={index}>{change}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-muted-foreground leading-relaxed mb-4">
          {section.content}
        </p>

        <div className="text-xs text-muted-foreground mb-4">
          Effective Date: {format(section.effectiveDate, 'MMMM dd, yyyy')}
          {section.lastUpdated && (
            <> | Last Updated: {format(section.lastUpdated, 'MMMM dd, yyyy')}</>
          )}
        </div>
      </div>

      {section.subsections && (
        <div className={cn('ml-4 space-y-6', level === 0 && 'ml-8')}>
          {section.subsections.map((subsection) =>
            renderSection(subsection, level + 1),
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-6xl max-h-[90vh] p-0', className)}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Last updated: {format(new Date(), 'MMMM dd, yyyy')} | Effective:
            January 1, 2024
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <div className="px-6 pt-4 pb-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="policy" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Policy
                </TabsTrigger>
                <TabsTrigger
                  value="data-types"
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Data Processing
                </TabsTrigger>
                <TabsTrigger value="rights" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Your Rights
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              {/* Policy Tab */}
              <TabsContent value="policy" className="h-full p-0 m-0">
                <div className="flex h-full">
                  {showTableOfContents && (
                    <div className="w-72 border-r bg-gray-50 p-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Table of Contents
                      </h4>
                      <ScrollArea className="h-[calc(100vh-240px)]">
                        <nav className="space-y-2">
                          {PRIVACY_POLICY_SECTIONS.map((section) => (
                            <div key={section.id}>
                              <button
                                onClick={() => scrollToSection(section.id)}
                                className={cn(
                                  'w-full text-left text-sm p-2 rounded hover:bg-gray-100 transition-colors',
                                  activeSection === section.id &&
                                    'bg-primary/10 text-primary font-medium',
                                )}
                              >
                                {section.title}
                              </button>
                              {section.subsections && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {section.subsections.map((subsection) => (
                                    <button
                                      key={subsection.id}
                                      onClick={() =>
                                        scrollToSection(subsection.id)
                                      }
                                      className={cn(
                                        'w-full text-left text-xs p-1 rounded hover:bg-gray-100 transition-colors text-muted-foreground',
                                        activeSection === subsection.id &&
                                          'bg-primary/5 text-primary',
                                      )}
                                    >
                                      {subsection.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </nav>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="flex-1 p-6">
                    <ScrollArea className="h-[calc(100vh-240px)]">
                      <div className="prose prose-sm max-w-none">
                        {PRIVACY_POLICY_SECTIONS.map((section) =>
                          renderSection(section),
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              {/* Data Processing Tab */}
              <TabsContent value="data-types" className="h-full p-6 m-0">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Data Processing Purposes
                      </h3>
                      <div className="grid gap-4">
                        {DATA_PROCESSING_PURPOSES.map((purpose) => (
                          <div
                            key={purpose.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium">{purpose.name}</h4>
                              <div className="flex gap-2">
                                {purpose.required && (
                                  <Badge variant="default" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {purpose.legalBasis.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {purpose.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {purpose.categories.map((category) => (
                                <Badge
                                  key={category}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {category.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Data Retention Policies
                      </h3>
                      <div className="grid gap-4">
                        {DATA_RETENTION_POLICIES.map((policy) => (
                          <div
                            key={policy.category}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium capitalize">
                                {policy.category.replace('_', ' ')}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {Math.round(policy.retentionPeriod / 365)}{' '}
                                  years
                                </span>
                                {policy.autoDelete && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Auto-delete
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {policy.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Rights Tab */}
              <TabsContent value="rights" className="h-full p-6 m-0">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Your Data Protection Rights
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Under the General Data Protection Regulation (GDPR), you
                        have several rights regarding your personal data. These
                        rights are fundamental to protecting your privacy.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      {[
                        {
                          title: 'Right of Access',
                          description:
                            "Get a copy of your personal data and information about how it's processed",
                          icon: FileText,
                          timeframe: '30 days',
                        },
                        {
                          title: 'Right to Rectification',
                          description:
                            'Correct inaccurate or incomplete personal data',
                          icon: CheckCircle,
                          timeframe: '30 days',
                        },
                        {
                          title: 'Right to Erasure',
                          description:
                            'Request deletion of your personal data (right to be forgotten)',
                          icon: AlertTriangle,
                          timeframe: '30 days',
                        },
                        {
                          title: 'Right to Data Portability',
                          description:
                            'Receive your data in a machine-readable format',
                          icon: ExternalLink,
                          timeframe: '30 days',
                        },
                        {
                          title: 'Right to Object',
                          description:
                            'Object to processing based on legitimate interests',
                          icon: Shield,
                          timeframe: '30 days',
                        },
                        {
                          title: 'Right to Restrict Processing',
                          description:
                            'Limit how we process your personal data',
                          icon: Lock,
                          timeframe: '30 days',
                        },
                      ].map((right, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <right.icon className="w-5 h-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium">{right.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {right.timeframe}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {right.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">
                            How to Exercise Your Rights
                          </h4>
                          <div className="space-y-2 text-sm text-blue-800">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>Email us at: privacy@wedsync.com</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Response time: Within 30 days</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span>Identity verification may be required</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" />
                              <span>
                                Use our data request form for faster processing
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              Questions? Contact us at privacy@wedsync.com
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {onAccept && (
                <Button onClick={onAccept}>Accept & Continue</Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
