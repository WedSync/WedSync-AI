'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/utils/toast';

interface DietaryRequirement {
  id: string;
  guest_id: string;
  requirement_type: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  notes?: string;
  medical_documentation_url?: string;
  created_at: string;
  updated_at: string;
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions?: string;
  dietary_severity?: string;
  dietary_details?: any;
  allergy_list?: string[];
}

interface DietaryTrackerProps {
  coupleId: string;
  guestId?: string;
  onUpdate?: () => void;
}

const REQUIREMENT_TYPES = [
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
  { value: 'dairy_free', label: 'Dairy Free', emoji: '🥛' },
  { value: 'nut_free', label: 'Nut Free', emoji: '🥜' },
  { value: 'shellfish_free', label: 'Shellfish Free', emoji: '🦐' },
  { value: 'kosher', label: 'Kosher', emoji: '✡️' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'diabetic', label: 'Diabetic', emoji: '💉' },
  { value: 'low_sodium', label: 'Low Sodium', emoji: '🧂' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

const SEVERITY_LEVELS = [
  {
    value: 'mild',
    label: 'Mild',
    color: 'bg-blue-100 text-blue-800',
    icon: InformationCircleIcon,
    description: 'Preference or minor discomfort',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    color: 'bg-yellow-100 text-yellow-800',
    icon: ExclamationTriangleIcon,
    description: 'Causes digestive issues or discomfort',
  },
  {
    value: 'severe',
    label: 'Severe',
    color: 'bg-orange-100 text-orange-800',
    icon: ShieldExclamationIcon,
    description: 'Causes significant health issues',
  },
  {
    value: 'life_threatening',
    label: 'Life Threatening',
    color: 'bg-red-100 text-red-800',
    icon: ShieldExclamationIcon,
    description: 'Can cause anaphylaxis or death',
  },
];

export function DietaryTracker({
  coupleId,
  guestId,
  onUpdate,
}: DietaryTrackerProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [requirements, setRequirements] = useState<DietaryRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    requirement_type: '',
    severity: 'moderate' as const,
    notes: '',
    medical_documentation_url: '',
  });
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('dietary-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dietary_requirements',
          filter: guestId ? `guest_id=eq.${guestId}` : undefined,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, guestId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (guestId) {
        // Load specific guest
        const { data: guestData } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId)
          .single();

        if (guestData) {
          setSelectedGuest(guestData);
          await loadRequirements(guestId);
        }
      } else {
        // Load all guests with dietary restrictions
        const { data: guestsData } = await supabase
          .from('guests')
          .select('*')
          .eq('couple_id', coupleId)
          .or('dietary_restrictions.not.is.null,allergy_list.not.is.null')
          .order('last_name');

        setGuests(guestsData || []);
      }
    } catch (error) {
      console.error('Error loading dietary data:', error);
      toast.error('Failed to load dietary information');
    } finally {
      setLoading(false);
    }
  };

  const loadRequirements = async (guestId: string) => {
    const { data } = await supabase
      .from('dietary_requirements')
      .select('*')
      .eq('guest_id', guestId)
      .order('severity', { ascending: false });

    setRequirements(data || []);
  };

  const handleAddRequirement = async () => {
    if (!selectedGuest || !newRequirement.requirement_type) {
      toast.error('Please select a requirement type');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('dietary_requirements').insert({
        guest_id: selectedGuest.id,
        ...newRequirement,
      });

      if (error) throw error;

      toast.success('Dietary requirement added successfully');
      setShowAddForm(false);
      setNewRequirement({
        requirement_type: '',
        severity: 'moderate',
        notes: '',
        medical_documentation_url: '',
      });
      await loadRequirements(selectedGuest.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding requirement:', error);
      toast.error('Failed to add dietary requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    if (!confirm('Are you sure you want to remove this dietary requirement?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dietary_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Dietary requirement removed');
      if (selectedGuest) {
        await loadRequirements(selectedGuest.id);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to remove dietary requirement');
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGuest) return;

    setUploadingEvidence(true);
    try {
      const fileName = `dietary/${coupleId}/${selectedGuest.id}/${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(fileName);

      setNewRequirement((prev) => ({
        ...prev,
        medical_documentation_url: publicUrl,
      }));

      toast.success('Medical documentation uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload documentation');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    const level = SEVERITY_LEVELS.find((l) => l.value === severity);
    const Icon = level?.icon || InformationCircleIcon;
    return <Icon className="h-5 w-5" />;
  };

  const getSeverityColor = (severity: string) => {
    const level = SEVERITY_LEVELS.find((l) => l.value === severity);
    return level?.color || 'bg-gray-100 text-gray-800';
  };

  const getCateringReport = () => {
    const summary = {
      total: guests.length,
      vegetarian: 0,
      vegan: 0,
      gluten_free: 0,
      nut_free: 0,
      life_threatening: 0,
    };

    requirements.forEach((req) => {
      if (req.requirement_type === 'vegetarian') summary.vegetarian++;
      if (req.requirement_type === 'vegan') summary.vegan++;
      if (req.requirement_type === 'gluten_free') summary.gluten_free++;
      if (req.requirement_type === 'nut_free') summary.nut_free++;
      if (req.severity === 'life_threatening') summary.life_threatening++;
    });

    return summary;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg"></div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Dietary Needs</div>
          <div className="text-2xl font-bold">{guests.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Life Threatening</div>
          <div className="text-2xl font-bold text-red-600">
            {
              requirements.filter((r) => r.severity === 'life_threatening')
                .length
            }
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Severe Allergies</div>
          <div className="text-2xl font-bold text-orange-600">
            {requirements.filter((r) => r.severity === 'severe').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Documentation</div>
          <div className="text-2xl font-bold">
            {requirements.filter((r) => r.medical_documentation_url).length}
          </div>
        </Card>
      </div>

      {/* Guest Selection or Detail View */}
      {!guestId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Guests with Dietary Requirements
          </h3>
          <div className="space-y-2">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedGuest(guest);
                  loadRequirements(guest.id);
                }}
              >
                <div>
                  <div className="font-medium">
                    {guest.first_name} {guest.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {guest.dietary_restrictions || 'No restrictions noted'}
                  </div>
                </div>
                {guest.dietary_severity && (
                  <Badge className={getSeverityColor(guest.dietary_severity)}>
                    {guest.dietary_severity}
                  </Badge>
                )}
              </div>
            ))}
            {guests.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No guests with dietary requirements found
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Selected Guest Requirements */}
      {selectedGuest && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">
                {selectedGuest.first_name} {selectedGuest.last_name}'s Dietary
                Requirements
              </h3>
              <p className="text-sm text-gray-500">
                Manage dietary restrictions and allergies
              </p>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
            >
              <ShieldExclamationIcon className="h-4 w-4" />
              Add Requirement
            </Button>
          </div>

          {/* Add New Requirement Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Requirement Type
                  </label>
                  <select
                    value={newRequirement.requirement_type}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        requirement_type: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Select type...</option>
                    {REQUIREMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Severity Level
                  </label>
                  <select
                    value={newRequirement.severity}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        severity: e.target.value as any,
                      }))
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    {SEVERITY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Notes / Details
                  </label>
                  <Textarea
                    value={newRequirement.notes}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="e.g., Can cause anaphylaxis, requires EpiPen..."
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Medical Documentation (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingEvidence}
                      className="flex-1"
                    />
                    {newRequirement.medical_documentation_url && (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRequirement({
                      requirement_type: '',
                      severity: 'moderate',
                      notes: '',
                      medical_documentation_url: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRequirement}
                  disabled={saving || !newRequirement.requirement_type}
                >
                  {saving ? 'Adding...' : 'Add Requirement'}
                </Button>
              </div>
            </div>
          )}

          {/* Requirements List */}
          <div className="space-y-3">
            {requirements.map((req) => (
              <div
                key={req.id}
                className={`p-4 border rounded-lg ${
                  req.severity === 'life_threatening'
                    ? 'border-red-300 bg-red-50'
                    : req.severity === 'severe'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(req.severity)}
                      <span className="font-medium">
                        {
                          REQUIREMENT_TYPES.find(
                            (t) => t.value === req.requirement_type,
                          )?.label
                        }
                      </span>
                      <Badge className={getSeverityColor(req.severity)}>
                        {req.severity.replace('_', ' ')}
                      </Badge>
                    </div>
                    {req.notes && (
                      <p className="text-sm text-gray-600 mb-2">{req.notes}</p>
                    )}
                    {req.medical_documentation_url && (
                      <a
                        href={req.medical_documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <DocumentArrowUpIcon className="h-4 w-4" />
                        View Medical Documentation
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRequirement(req.id)}
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {requirements.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No dietary requirements added yet
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Catering Report Alert */}
      {requirements.some((r) => r.severity === 'life_threatening') && (
        <Alert className="bg-red-50 border-red-200">
          <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
          <div>
            <div className="font-semibold text-red-900">
              Critical Dietary Alert
            </div>
            <div className="text-sm text-red-700">
              You have guests with life-threatening allergies. Ensure your
              caterer is informed and has appropriate protocols in place.
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
