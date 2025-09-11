'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heading } from '@/components/ui/heading';
import {
  Check,
  X,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Plus,
  ArrowRight,
  Target,
  FileText,
} from 'lucide-react';

interface DetectedField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'signature';
  label: string;
  value: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageNumber: number;
}

interface CoreFieldMapping {
  [key: string]: string;
}

interface FieldMappingInterfaceProps {
  pdfId: string;
  detectedFields: DetectedField[];
  coreFieldMapping: CoreFieldMapping;
  onMappingUpdate: (mapping: CoreFieldMapping) => void;
  onFieldsUpdate: (fields: DetectedField[]) => void;
  onCreateForm: () => void;
}

// Wedding core fields that we want to map to
const WEDDING_CORE_FIELDS = [
  { id: 'bride_name', label: 'Bride Name', type: 'text', required: true },
  { id: 'groom_name', label: 'Groom Name', type: 'text', required: true },
  { id: 'wedding_date', label: 'Wedding Date', type: 'date', required: true },
  { id: 'venue_name', label: 'Venue Name', type: 'text', required: false },
  {
    id: 'venue_address',
    label: 'Venue Address',
    type: 'text',
    required: false,
  },
  { id: 'email', label: 'Primary Email', type: 'email', required: true },
  { id: 'phone', label: 'Primary Phone', type: 'tel', required: true },
  { id: 'guest_count', label: 'Guest Count', type: 'number', required: false },
  { id: 'budget', label: 'Budget', type: 'number', required: false },
  {
    id: 'ceremony_time',
    label: 'Ceremony Time',
    type: 'time',
    required: false,
  },
  {
    id: 'reception_time',
    label: 'Reception Time',
    type: 'time',
    required: false,
  },
  {
    id: 'coordinator_name',
    label: 'Wedding Coordinator',
    type: 'text',
    required: false,
  },
  {
    id: 'coordinator_phone',
    label: 'Coordinator Phone',
    type: 'tel',
    required: false,
  },
  {
    id: 'emergency_contact',
    label: 'Emergency Contact',
    type: 'text',
    required: false,
  },
];

export function FieldMappingInterface({
  pdfId,
  detectedFields,
  coreFieldMapping,
  onMappingUpdate,
  onFieldsUpdate,
  onCreateForm,
}: FieldMappingInterfaceProps) {
  const [fields, setFields] = useState<DetectedField[]>(detectedFields);
  const [mapping, setMapping] = useState<CoreFieldMapping>(coreFieldMapping);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showUnmapped, setShowUnmapped] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState(0.5);

  // Filter fields based on confidence and unmapped status
  const filteredFields = fields.filter((field) => {
    const meetsConfidence = field.confidence >= confidenceFilter;
    const isMapped = Object.values(mapping).includes(field.id);

    if (showUnmapped) {
      return meetsConfidence;
    } else {
      return meetsConfidence && !isMapped;
    }
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <Check className="h-4 w-4" />;
    if (confidence >= 0.6) return <AlertTriangle className="h-4 w-4" />;
    return <X className="h-4 w-4" />;
  };

  const handleFieldEdit = (
    fieldId: string,
    updates: Partial<DetectedField>,
  ) => {
    const updatedFields = fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field,
    );
    setFields(updatedFields);
    onFieldsUpdate(updatedFields);
    setEditingField(null);
  };

  const handleFieldDelete = (fieldId: string) => {
    const updatedFields = fields.filter((field) => field.id !== fieldId);
    setFields(updatedFields);
    onFieldsUpdate(updatedFields);

    // Remove from mapping if mapped
    const updatedMapping = { ...mapping };
    Object.entries(mapping).forEach(([coreField, mappedFieldId]) => {
      if (mappedFieldId === fieldId) {
        delete updatedMapping[coreField];
      }
    });
    setMapping(updatedMapping);
    onMappingUpdate(updatedMapping);
  };

  const handleCoreFieldMapping = (
    coreFieldId: string,
    detectedFieldId: string | null,
  ) => {
    const updatedMapping = { ...mapping };

    if (detectedFieldId) {
      updatedMapping[coreFieldId] = detectedFieldId;
    } else {
      delete updatedMapping[coreFieldId];
    }

    setMapping(updatedMapping);
    onMappingUpdate(updatedMapping);
  };

  const getMappedField = (coreFieldId: string): DetectedField | null => {
    const mappedFieldId = mapping[coreFieldId];
    return mappedFieldId
      ? fields.find((f) => f.id === mappedFieldId) || null
      : null;
  };

  const getCompletionStats = () => {
    const requiredFields = WEDDING_CORE_FIELDS.filter((f) => f.required);
    const mappedRequired = requiredFields.filter((f) => mapping[f.id]);
    const totalMapped = Object.keys(mapping).length;

    return {
      required: mappedRequired.length,
      totalRequired: requiredFields.length,
      total: totalMapped,
      totalPossible: WEDDING_CORE_FIELDS.length,
    };
  };

  const stats = getCompletionStats();

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading level={3}>Field Mapping</Heading>
            <Text className="text-gray-600 mt-1">
              Review and map extracted fields to your form structure
            </Text>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredFields.length}
              </div>
              <div className="text-xs text-gray-600">Fields Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.required}/{stats.totalRequired}
              </div>
              <div className="text-xs text-gray-600">Required Mapped</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Confidence:</label>
            <Select
              value={confidenceFilter.toString()}
              onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
            >
              <option value="0">All (0%+)</option>
              <option value="0.5">Medium (50%+)</option>
              <option value="0.7">High (70%+)</option>
              <option value="0.8">Very High (80%+)</option>
            </Select>
          </div>

          <Checkbox checked={showUnmapped} onChange={setShowUnmapped}>
            Show all fields
          </Checkbox>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Fields Mapping */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <Heading level={4} className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Wedding Form Fields
            </Heading>
            <Text className="text-gray-600 text-sm mt-1">
              Map detected fields to standard wedding form fields
            </Text>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {WEDDING_CORE_FIELDS.map((coreField) => {
              const mappedField = getMappedField(coreField.id);
              const isRequired = coreField.required;

              return (
                <div
                  key={coreField.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {coreField.label}
                      </span>
                      {isRequired && (
                        <Badge color="red" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {mappedField && (
                      <div className="flex items-center gap-2 mt-1">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {mappedField.value}
                        </span>
                        <Badge
                          color={getConfidenceColor(mappedField.confidence)}
                          className="text-xs"
                        >
                          {Math.round(mappedField.confidence * 100)}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Select
                    value={mapping[coreField.id] || ''}
                    onChange={(e) =>
                      handleCoreFieldMapping(
                        coreField.id,
                        e.target.value || null,
                      )
                    }
                    className="w-48"
                  >
                    <option value="">-- Select Field --</option>
                    {fields
                      .filter(
                        (f) =>
                          !Object.values(mapping).includes(f.id) ||
                          mapping[coreField.id] === f.id,
                      )
                      .map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}: {field.value} (
                          {Math.round(field.confidence * 100)}%)
                        </option>
                      ))}
                  </Select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detected Fields */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <Heading level={4} className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Detected Fields
            </Heading>
            <Text className="text-gray-600 text-sm mt-1">
              Fields extracted from your PDF with confidence scores
            </Text>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {filteredFields.map((field) => {
              const isMapped = Object.values(mapping).includes(field.id);

              return (
                <div
                  key={field.id}
                  className={`p-3 border rounded-lg ${isMapped ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}
                >
                  {editingField === field.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          handleFieldEdit(field.id, { label: e.target.value })
                        }
                        placeholder="Field Label"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) =>
                          handleFieldEdit(field.id, { value: e.target.value })
                        }
                        placeholder="Field Value"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditingField(null)}>
                          <Check className="h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge
                            color={getConfidenceColor(field.confidence)}
                            className="flex items-center gap-1"
                          >
                            {getConfidenceIcon(field.confidence)}
                            {Math.round(field.confidence * 100)}%
                          </Badge>
                          <Badge color="gray" className="text-xs">
                            {field.type}
                          </Badge>
                          {isMapped && (
                            <Badge color="green" className="text-xs">
                              Mapped
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(field.id)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFieldDelete(field.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {field.label}
                        </div>
                        <div className="text-gray-600 break-all">
                          {field.value}
                        </div>
                        <div className="text-xs text-gray-500">
                          Page {field.pageNumber} • Position:{' '}
                          {field.boundingBox.x}, {field.boundingBox.y}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredFields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <Text>No fields match the current filters</Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          {stats.required < stats.totalRequired ? (
            <span className="text-amber-600">
              ⚠️ {stats.totalRequired - stats.required} required fields still
              need mapping
            </span>
          ) : (
            <span className="text-green-600">
              ✓ All required fields are mapped
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline">Save Mapping</Button>
          <Button
            onClick={onCreateForm}
            disabled={stats.required < stats.totalRequired}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Form
          </Button>
        </div>
      </div>
    </div>
  );
}
