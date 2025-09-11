'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  HeartIcon,
  ClipboardDocumentCheckIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XMarkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';

interface AllergyInfo {
  guest_id: string;
  guest_name: string;
  table_number?: number;
  allergies: Record<string, boolean>;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  epipen_required: boolean;
  emergency_contact?: string;
  medical_notes?: string;
  last_confirmed?: Date;
}

interface KitchenProtocol {
  id: string;
  protocol: string;
  priority: 'critical' | 'high' | 'standard';
  completed: boolean;
}

interface AllergenWarningsProps {
  coupleId: string;
  eventDate?: string;
  venueContact?: {
    name: string;
    phone: string;
  };
  onAcknowledge?: (guestId: string) => void;
}

const CRITICAL_ALLERGIES = [
  'peanuts',
  'tree_nuts',
  'shellfish',
  'fish',
  'milk',
  'eggs',
  'wheat',
  'soy',
  'sesame',
];

const KITCHEN_SAFETY_PROTOCOLS = [
  {
    id: '1',
    protocol: 'Separate preparation area for allergen-free meals',
    priority: 'critical' as const,
  },
  {
    id: '2',
    protocol: 'Dedicated utensils and cookware for allergen-free preparation',
    priority: 'critical' as const,
  },
  {
    id: '3',
    protocol: 'Staff briefing on all life-threatening allergies',
    priority: 'critical' as const,
  },
  {
    id: '4',
    protocol: 'EpiPen locations identified and accessible',
    priority: 'critical' as const,
  },
  {
    id: '5',
    protocol: 'Emergency contacts posted in kitchen',
    priority: 'high' as const,
  },
  {
    id: '6',
    protocol: 'Cross-contamination prevention procedures in place',
    priority: 'high' as const,
  },
  {
    id: '7',
    protocol: 'Ingredient labels verified for all dishes',
    priority: 'high' as const,
  },
  {
    id: '8',
    protocol: 'Service staff alerted to critical allergies',
    priority: 'critical' as const,
  },
];

export function AllergenWarnings({
  coupleId,
  eventDate,
  venueContact,
  onAcknowledge,
}: AllergenWarningsProps) {
  const [criticalAllergies, setCriticalAllergies] = useState<AllergyInfo[]>([]);
  const [protocols, setProtocols] = useState<KitchenProtocol[]>(
    KITCHEN_SAFETY_PROTOCOLS.map((p) => ({ ...p, completed: false })),
  );
  const [loading, setLoading] = useState(true);
  const [acknowledgedGuests, setAcknowledgedGuests] = useState<Set<string>>(
    new Set(),
  );
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadCriticalAllergies();
    loadAcknowledgements();
  }, [coupleId]);

  const loadCriticalAllergies = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('guests')
        .select(
          `
          id,
          first_name,
          last_name,
          table_number,
          dietary_requirements (
            allergies,
            severity,
            epipen_required,
            emergency_contact,
            medical_notes
          )
        `,
        )
        .eq('couple_id', coupleId)
        .in('dietary_requirements.severity', ['severe', 'life_threatening'])
        .order('dietary_requirements.severity', { ascending: false });

      if (data) {
        const formatted = data
          .filter((g) => g.dietary_requirements?.length > 0)
          .map((guest) => ({
            guest_id: guest.id,
            guest_name: `${guest.first_name} ${guest.last_name}`,
            table_number: guest.table_number,
            ...guest.dietary_requirements[0],
          }));
        setCriticalAllergies(formatted);
      }
    } catch (error) {
      console.error('Error loading critical allergies:', error);
      toast.error('Failed to load allergy warnings');
    } finally {
      setLoading(false);
    }
  };

  const loadAcknowledgements = async () => {
    const saved = localStorage.getItem(`allergy-ack-${coupleId}`);
    if (saved) {
      setAcknowledgedGuests(new Set(JSON.parse(saved)));
    }
  };

  const handleAcknowledge = (guestId: string) => {
    const newAcknowledged = new Set(acknowledgedGuests);
    newAcknowledged.add(guestId);
    setAcknowledgedGuests(newAcknowledged);
    localStorage.setItem(
      `allergy-ack-${coupleId}`,
      JSON.stringify(Array.from(newAcknowledged)),
    );
    onAcknowledge?.(guestId);
    toast.success('Allergy acknowledged');
  };

  const handleProtocolCheck = (protocolId: string) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId ? { ...p, completed: !p.completed } : p,
      ),
    );
  };

  const generateEmergencyCard = () => {
    const content = `
EMERGENCY ALLERGY INFORMATION
Event Date: ${eventDate || 'TBD'}
==============================

LIFE-THREATENING ALLERGIES (${criticalAllergies.filter((a) => a.severity === 'life_threatening').length})
------------------------------
${criticalAllergies
  .filter((a) => a.severity === 'life_threatening')
  .map((a) => {
    const allergyList = Object.entries(a.allergies || {})
      .filter(([_, has]) => has)
      .map(([name]) => name.replace('_', ' ').toUpperCase())
      .join(', ');
    return `
Guest: ${a.guest_name} (Table ${a.table_number || 'TBD'})
Allergies: ${allergyList}
EpiPen Required: ${a.epipen_required ? 'YES - CRITICAL' : 'No'}
Emergency Contact: ${a.emergency_contact || 'Not provided'}
Notes: ${a.medical_notes || 'None'}
`;
  })
  .join('\n')}

SEVERE ALLERGIES (${criticalAllergies.filter((a) => a.severity === 'severe').length})
------------------------------
${criticalAllergies
  .filter((a) => a.severity === 'severe')
  .map((a) => {
    const allergyList = Object.entries(a.allergies || {})
      .filter(([_, has]) => has)
      .map(([name]) => name.replace('_', ' ').toUpperCase())
      .join(', ');
    return `
Guest: ${a.guest_name} (Table ${a.table_number || 'TBD'})
Allergies: ${allergyList}
Emergency Contact: ${a.emergency_contact || 'Not provided'}
`;
  })
  .join('\n')}

EMERGENCY NUMBERS
------------------------------
Venue Contact: ${venueContact?.name || 'Not provided'} - ${venueContact?.phone || 'Not provided'}
Emergency Services: 911
Poison Control: 1-800-222-1222

KITCHEN SAFETY CHECKLIST
------------------------------
${protocols.map((p) => `[${p.completed ? 'X' : ' '}] ${p.protocol}`).join('\n')}

Generated: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-allergy-card-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();

    toast.success('Emergency card downloaded');
  };

  const handlePrintEmergencyInfo = () => {
    window.print();
  };

  const lifeThreatening = criticalAllergies.filter(
    (a) => a.severity === 'life_threatening',
  );
  const severe = criticalAllergies.filter((a) => a.severity === 'severe');
  const epipenRequired = criticalAllergies.filter((a) => a.epipen_required);
  const protocolsCompleted = protocols.filter((p) => p.completed).length;

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-red-100 rounded"></div>
          <div className="h-20 bg-orange-100 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Critical Alert Banner */}
      {lifeThreatening.length > 0 && (
        <Alert className="bg-red-100 border-red-500 border-2 animate-pulse print:animate-none">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <ShieldExclamationIcon className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-red-900">
                  ⚠️ {lifeThreatening.length} LIFE-THREATENING{' '}
                  {lifeThreatening.length === 1 ? 'ALLERGY' : 'ALLERGIES'} ⚠️
                </div>
                <div className="text-red-800 mt-1">
                  Immediate attention required. Kitchen staff must be briefed.
                  {epipenRequired.length > 0 && (
                    <div className="mt-2 font-semibold">
                      🚨 {epipenRequired.length} guest(s) require EpiPen
                      availability
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
              variant="outline"
              className="border-red-500 text-red-700"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Emergency Info
            </Button>
          </div>
        </Alert>
      )}

      {/* Emergency Contacts Panel */}
      {showEmergencyContacts && (
        <Card className="p-4 bg-yellow-50 border-yellow-300">
          <h4 className="font-semibold text-lg mb-3">
            Emergency Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium text-sm text-gray-600 mb-1">
                Venue Contact
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-gray-500" />
                <span>{venueContact?.name || 'Not provided'}</span>
                <span className="font-mono">
                  {venueContact?.phone || 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-600 mb-1">
                Emergency Services
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-red-500" />
                <span className="font-mono text-red-600 font-bold">911</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-600 mb-1">
                Poison Control
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-orange-500" />
                <span className="font-mono">1-800-222-1222</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-600 mb-1">
                Nearest Hospital
              </div>
              <div className="text-sm text-gray-700">
                Contact venue for location details
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Life-Threatening Allergies Detail */}
      {lifeThreatening.length > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-900 mb-4">
            Life-Threatening Allergies - Immediate Action Required
          </h3>
          <div className="space-y-3">
            {lifeThreatening.map((allergy) => {
              const allergyList = Object.entries(allergy.allergies || {})
                .filter(([_, has]) => has)
                .map(([name]) => name.replace('_', ' '));

              return (
                <div
                  key={allergy.guest_id}
                  className={cn(
                    'p-4 bg-white rounded-lg border-2',
                    acknowledgedGuests.has(allergy.guest_id)
                      ? 'border-green-400'
                      : 'border-red-400',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
                        <span className="font-bold text-lg">
                          {allergy.guest_name}
                        </span>
                        {allergy.table_number && (
                          <Badge variant="outline">
                            Table {allergy.table_number}
                          </Badge>
                        )}
                        {allergy.epipen_required && (
                          <Badge className="bg-red-600 text-white">
                            EPIPEN REQUIRED
                          </Badge>
                        )}
                      </div>

                      <div className="ml-8 space-y-2">
                        <div>
                          <span className="font-medium text-sm text-gray-600">
                            Allergic to:{' '}
                          </span>
                          <span className="font-semibold text-red-700">
                            {allergyList.join(', ').toUpperCase()}
                          </span>
                        </div>

                        {allergy.emergency_contact && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              Emergency: {allergy.emergency_contact}
                            </span>
                          </div>
                        )}

                        {allergy.medical_notes && (
                          <div className="text-sm text-gray-700 bg-red-50 p-2 rounded">
                            <strong>Medical Note:</strong>{' '}
                            {allergy.medical_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {!acknowledgedGuests.has(allergy.guest_id) ? (
                      <Button
                        onClick={() => handleAcknowledge(allergy.guest_id)}
                        variant="outline"
                        className="border-red-400 text-red-600 hover:bg-red-50"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Acknowledged
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Severe Allergies */}
      {severe.length > 0 && (
        <Card className="p-6 border-orange-200 bg-orange-50">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">
            Severe Allergies - Caution Required
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {severe.map((allergy) => {
              const allergyList = Object.entries(allergy.allergies || {})
                .filter(([_, has]) => has)
                .map(([name]) => name.replace('_', ' '));

              return (
                <div
                  key={allergy.guest_id}
                  className="p-3 bg-white rounded-lg border border-orange-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{allergy.guest_name}</span>
                    {allergy.table_number && (
                      <Badge variant="outline" className="text-xs">
                        Table {allergy.table_number}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-orange-800">
                    Allergic to: {allergyList.join(', ')}
                  </div>
                  {allergy.emergency_contact && (
                    <div className="text-xs text-gray-600 mt-1">
                      Emergency: {allergy.emergency_contact}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Kitchen Safety Protocol Checklist */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Kitchen Safety Protocol Checklist
          </h3>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                protocolsCompleted === protocols.length ? 'bg-green-100' : ''
              }
            >
              {protocolsCompleted}/{protocols.length} Complete
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                protocol.priority === 'critical' &&
                  !protocol.completed &&
                  'bg-red-50 border-red-200',
                protocol.priority === 'high' &&
                  !protocol.completed &&
                  'bg-yellow-50 border-yellow-200',
                protocol.completed && 'bg-green-50 border-green-200',
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleProtocolCheck(protocol.id)}
                  className={cn(
                    'w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                    protocol.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-gray-400',
                  )}
                >
                  {protocol.completed && (
                    <CheckCircleIcon className="h-4 w-4 text-white" />
                  )}
                </button>
                <span
                  className={
                    protocol.completed ? 'line-through text-gray-500' : ''
                  }
                >
                  {protocol.protocol}
                </span>
                {protocol.priority === 'critical' && !protocol.completed && (
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    Critical
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <Card className="p-4 bg-gray-50 print:hidden">
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            onClick={generateEmergencyCard}
            className="flex items-center gap-2"
            variant="default"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download Emergency Card
          </Button>
          <Button
            onClick={handlePrintEmergencyInfo}
            variant="outline"
            className="flex items-center gap-2"
          >
            <PrinterIcon className="h-4 w-4" />
            Print for Kitchen
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              navigator.clipboard.writeText(
                criticalAllergies
                  .map(
                    (a) =>
                      `${a.guest_name}: ${Object.entries(a.allergies || {})
                        .filter(([_, has]) => has)
                        .map(([name]) => name)
                        .join(', ')}`,
                  )
                  .join('\n'),
              );
              toast.success('Allergy list copied to clipboard');
            }}
          >
            <ClipboardDocumentCheckIcon className="h-4 w-4" />
            Copy List
          </Button>
        </div>
      </Card>

      {/* Print-only Emergency Summary */}
      <div className="hidden print:block mt-8 p-4 border-2 border-black">
        <h2 className="text-xl font-bold mb-2">EMERGENCY ALLERGY SUMMARY</h2>
        <p className="font-bold text-red-600">
          {lifeThreatening.length} LIFE-THREATENING | {severe.length} SEVERE |
          {epipenRequired.length} REQUIRE EPIPEN
        </p>
        <p className="mt-2">Emergency: 911 | Poison Control: 1-800-222-1222</p>
        <p>Generated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
