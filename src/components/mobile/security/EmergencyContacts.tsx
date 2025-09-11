'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Shield,
  Heart,
  Users,
  Camera,
  Settings,
  ExternalLink,
  CheckCircle,
  Info,
  Smartphone,
  Globe,
} from 'lucide-react';

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  availability: '24/7' | 'business_hours' | 'wedding_day_only';
  specialization: string[];
  priority: 'critical' | 'high' | 'standard';
  weddingContext: string;
}

/**
 * WS-338 Team D: Emergency security contact information
 * Critical contacts for wedding day security issues and data problems
 */
export const EmergencyContacts: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const emergencyContacts: EmergencyContact[] = [
    {
      id: 'wedsync_security',
      name: 'WedSync Security Team',
      role: 'Platform Security',
      phone: '+44 20 7946 0958',
      email: 'security@wedsync.com',
      availability: '24/7',
      specialization: [
        'Data Breach',
        'Account Compromise',
        'Privacy Issues',
        'Technical Support',
      ],
      priority: 'critical',
      weddingContext:
        'Immediate response for any security concerns that could affect your wedding day',
    },
    {
      id: 'data_protection',
      name: 'Data Protection Officer',
      role: 'Privacy & Compliance',
      phone: '+44 20 7946 0959',
      email: 'dpo@wedsync.com',
      availability: 'business_hours',
      specialization: [
        'GDPR Compliance',
        'Privacy Rights',
        'Data Deletion',
        'Guest Privacy',
      ],
      priority: 'high',
      weddingContext:
        'Handles all privacy-related concerns and guest data protection issues',
    },
    {
      id: 'wedding_day_support',
      name: 'Wedding Day Emergency',
      role: 'Live Event Support',
      phone: '+44 20 7946 0960',
      email: 'emergency@wedsync.com',
      availability: 'wedding_day_only',
      specialization: [
        'Live Issues',
        'Guest Access',
        'Photo Problems',
        'Vendor Coordination',
      ],
      priority: 'critical',
      weddingContext:
        'Dedicated support team active during your wedding for immediate technical assistance',
    },
    {
      id: 'it_helpdesk',
      name: 'Technical Support',
      role: 'IT Helpdesk',
      phone: '+44 20 7946 0961',
      email: 'support@wedsync.com',
      availability: 'business_hours',
      specialization: [
        'App Issues',
        'Login Problems',
        'Sync Errors',
        'General Support',
      ],
      priority: 'standard',
      weddingContext:
        'General technical support for non-urgent issues and platform questions',
    },
    {
      id: 'vendor_coordinator',
      name: 'Vendor Emergency Line',
      role: 'Vendor Relations',
      phone: '+44 20 7946 0962',
      email: 'vendors@wedsync.com',
      availability: 'business_hours',
      specialization: [
        'Vendor Access',
        'Integration Issues',
        'Data Sharing',
        'Contract Problems',
      ],
      priority: 'high',
      weddingContext:
        'Resolves issues between vendors and the platform that could disrupt your wedding',
    },
  ];

  const quickActions = [
    {
      id: 'report_breach',
      title: 'Report Security Issue',
      description: 'Immediate security incident reporting',
      icon: Shield,
      action: 'Call Security Team',
      urgent: true,
    },
    {
      id: 'guest_privacy',
      title: 'Guest Privacy Concern',
      description: 'Issues with guest data or privacy',
      icon: Users,
      action: 'Contact DPO',
      urgent: false,
    },
    {
      id: 'wedding_day_help',
      title: 'Wedding Day Emergency',
      description: 'Live support during your wedding',
      icon: Heart,
      action: 'Emergency Line',
      urgent: true,
    },
    {
      id: 'technical_issue',
      title: 'Technical Problem',
      description: 'App or platform not working',
      icon: Settings,
      action: 'Tech Support',
      urgent: false,
    },
  ];

  const availabilityConfig = {
    '24/7': {
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '🟢',
      label: '24/7 Available',
    },
    business_hours: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: '🔵',
      label: 'Business Hours',
    },
    wedding_day_only: {
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: '💒',
      label: 'Wedding Day Only',
    },
  };

  const priorityConfig = {
    critical: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: '🚨 Critical',
    },
    high: {
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: '⚡ High Priority',
    },
    standard: {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      label: '📋 Standard',
    },
  };

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const sendEmail = (email: string, subject: string) => {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div className="space-y-6">
      {/* Emergency Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Security Emergency?</h3>
            <p className="text-sm text-red-700 mt-1">
              For immediate security issues affecting your wedding, call our
              24/7 security hotline
            </p>
            <button
              onClick={() => makeCall('+44 20 7946 0958')}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              📞 Call Security: +44 20 7946 0958
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                className={`p-3 rounded-lg border-2 text-left hover:shadow-md transition-all ${
                  action.urgent
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <Icon
                    className={`w-5 h-5 ${action.urgent ? 'text-red-600' : 'text-blue-600'} mt-0.5`}
                  />
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${action.urgent ? 'text-red-900' : 'text-blue-900'}`}
                    >
                      {action.title}
                    </h4>
                    <p
                      className={`text-xs ${action.urgent ? 'text-red-700' : 'text-blue-700'} mt-1`}
                    >
                      {action.description}
                    </p>
                    <span
                      className={`text-xs font-medium ${action.urgent ? 'text-red-600' : 'text-blue-600'}`}
                    >
                      {action.action} →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Emergency Contacts
        </h3>

        {emergencyContacts.map((contact, index) => {
          const availConfig = availabilityConfig[contact.availability];
          const prioConfig = priorityConfig[contact.priority];
          const isExpanded = selectedContact === contact.id;

          return (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() =>
                  setSelectedContact(isExpanded ? null : contact.id)
                }
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg ${prioConfig.bg} ${prioConfig.border} border`}
                  >
                    <Phone className={`w-5 h-5 ${prioConfig.color}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {contact.name}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${availConfig.bg} ${availConfig.color} font-medium`}
                      >
                        {availConfig.icon} {availConfig.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{contact.role}</p>

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded ${prioConfig.bg} ${prioConfig.color} font-medium`}
                      >
                        {prioConfig.label}
                      </span>

                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {contact.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded Contact Details */}
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-4 space-y-4">
                    {/* Contact Methods */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => makeCall(contact.phone)}
                        className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">Call Now</span>
                      </button>

                      <button
                        onClick={() =>
                          sendEmail(
                            contact.email,
                            `Security Issue - Wedding Emergency`,
                          )
                        }
                        className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-medium">Email</span>
                      </button>
                    </div>

                    {/* Specializations */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Specializations:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {contact.specialization.map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Wedding Context */}
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <p className="text-xs text-pink-700">
                        💒 <strong>Wedding Support:</strong>{' '}
                        {contact.weddingContext}
                      </p>
                    </div>

                    {/* Contact Details */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3" />
                        <span>{contact.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          {contact.availability === '24/7'
                            ? 'Available 24/7'
                            : contact.availability === 'business_hours'
                              ? 'Monday-Friday 9AM-6PM GMT'
                              : 'Active during wedding events only'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Important Notes */}
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">
                Before Your Wedding Day
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Save these contact numbers in your phone and share with your
                wedding party. Test the emergency line 24 hours before your
                wedding to ensure connectivity.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Heart className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">
                Wedding Day Protocol
              </h4>
              <p className="text-sm text-purple-700 mt-1">
                Our wedding day support team monitors all active weddings.
                They'll proactively reach out if they detect any issues that
                could affect your special day.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 font-medium">
              All Support Services Operational
            </span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Service Status <ExternalLink className="w-3 h-3 inline ml-1" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last checked: {new Date().toLocaleTimeString()} • Response time: {'<'}{' '}
          2 minutes
        </p>
      </div>
    </div>
  );
};

export default EmergencyContacts;
