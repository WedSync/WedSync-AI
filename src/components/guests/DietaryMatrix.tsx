'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DietaryRequirement {
  id: string;
  guest_id: string;
  guest_name: string;
  table_number?: number;
  allergies: Record<string, boolean>;
  preferences: Record<string, boolean>;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  epipen_required: boolean;
  emergency_contact?: string;
  medical_notes?: string;
  caterer_instructions?: string;
}

interface DietaryMatrixProps {
  coupleId: string;
  eventDate?: string;
  onExport?: () => void;
}

const SEVERITY_COLORS = {
  mild: 'bg-blue-50 text-blue-800 border-blue-200',
  moderate: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  severe: 'bg-orange-50 text-orange-800 border-orange-200',
  life_threatening: 'bg-red-100 text-red-900 border-red-500',
};

const ALLERGY_COLUMNS = [
  'peanuts',
  'tree_nuts',
  'milk',
  'eggs',
  'wheat',
  'soy',
  'fish',
  'shellfish',
  'sesame',
];

const PREFERENCE_COLUMNS = [
  'vegetarian',
  'vegan',
  'kosher',
  'halal',
  'gluten_free',
  'dairy_free',
];

export function DietaryMatrix({
  coupleId,
  eventDate,
  onExport,
}: DietaryMatrixProps) {
  const [requirements, setRequirements] = useState<DietaryRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [allergyFilter, setAllergyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');

  const supabase = createClient();

  useEffect(() => {
    loadDietaryRequirements();
  }, [coupleId]);

  const loadDietaryRequirements = async () => {
    setLoading(true);
    try {
      const { data: guests } = await supabase
        .from('guests')
        .select(
          `
          id,
          first_name,
          last_name,
          table_number,
          dietary_requirements (
            allergies,
            preferences,
            severity,
            epipen_required,
            emergency_contact,
            medical_notes,
            caterer_instructions
          )
        `,
        )
        .eq('couple_id', coupleId)
        .not('dietary_requirements', 'is', null)
        .order('severity', { ascending: false });

      if (guests) {
        const formatted = guests
          .filter((g) => g.dietary_requirements?.length > 0)
          .map((guest) => ({
            id: guest.id,
            guest_id: guest.id,
            guest_name: `${guest.first_name} ${guest.last_name}`,
            table_number: guest.table_number,
            ...guest.dietary_requirements[0],
          }));
        setRequirements(formatted);
      }
    } catch (error) {
      console.error('Error loading dietary matrix:', error);
      toast.error('Failed to load dietary requirements');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const matchesSearch = req.guest_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSeverity =
        severityFilter === 'all' || req.severity === severityFilter;

      let matchesAllergy = allergyFilter === 'all';
      if (allergyFilter !== 'all') {
        const allergies = req.allergies || {};
        matchesAllergy = allergies[allergyFilter] === true;
      }

      return matchesSearch && matchesSeverity && matchesAllergy;
    });
  }, [requirements, searchTerm, severityFilter, allergyFilter]);

  const statistics = useMemo(() => {
    return {
      total: requirements.length,
      lifeThreatening: requirements.filter(
        (r) => r.severity === 'life_threatening',
      ).length,
      severe: requirements.filter((r) => r.severity === 'severe').length,
      epipenRequired: requirements.filter((r) => r.epipen_required).length,
      vegetarian: requirements.filter((r) => r.preferences?.vegetarian).length,
      vegan: requirements.filter((r) => r.preferences?.vegan).length,
      glutenFree: requirements.filter((r) => r.preferences?.gluten_free).length,
      nutAllergies: requirements.filter(
        (r) => r.allergies?.peanuts || r.allergies?.tree_nuts,
      ).length,
    };
  }, [requirements]);

  const handleExportCSV = () => {
    const headers = [
      'Guest Name',
      'Table',
      'Severity',
      'EpiPen',
      ...ALLERGY_COLUMNS.map((a) => a.replace('_', ' ')),
      ...PREFERENCE_COLUMNS.map((p) => p.replace('_', ' ')),
      'Emergency Contact',
      'Notes',
    ];

    const rows = filteredRequirements.map((req) => [
      req.guest_name,
      req.table_number || '',
      req.severity.replace('_', ' '),
      req.epipen_required ? 'Yes' : 'No',
      ...ALLERGY_COLUMNS.map((col) => (req.allergies?.[col] ? '✓' : '')),
      ...PREFERENCE_COLUMNS.map((col) => (req.preferences?.[col] ? '✓' : '')),
      req.emergency_contact || '',
      req.medical_notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dietary-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast.success('Dietary matrix exported');
    onExport?.();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');

    // Add header
    doc.setFontSize(20);
    doc.text('Dietary Requirements Matrix', 14, 20);

    if (eventDate) {
      doc.setFontSize(12);
      doc.text(`Event Date: ${eventDate}`, 14, 28);
    }

    // Add critical alerts
    if (statistics.lifeThreatening > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `⚠️ ${statistics.lifeThreatening} LIFE-THREATENING ALLERGIES`,
        14,
        40,
      );
      doc.setTextColor(0, 0, 0);
    }

    // Prepare table data
    const tableColumns = [
      'Guest',
      'Table',
      'Severity',
      ...ALLERGY_COLUMNS.map((a) => a.substring(0, 3).toUpperCase()),
      'Veg',
      'Vgn',
      'GF',
      'Notes',
    ];

    const tableRows = filteredRequirements.map((req) => [
      req.guest_name,
      req.table_number || '-',
      req.severity === 'life_threatening' ? '⚠️ CRITICAL' : req.severity,
      ...ALLERGY_COLUMNS.map((col) => (req.allergies?.[col] ? '✓' : '')),
      req.preferences?.vegetarian ? '✓' : '',
      req.preferences?.vegan ? '✓' : '',
      req.preferences?.gluten_free ? '✓' : '',
      req.medical_notes ? req.medical_notes.substring(0, 20) + '...' : '',
    ]);

    // @ts-ignore - jsPDF autoTable plugin
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: statistics.lifeThreatening > 0 ? 50 : 40,
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 15 },
        2: { cellWidth: 20 },
      },
      didDrawRow: (data: any) => {
        const row = filteredRequirements[data.row.index];
        if (row?.severity === 'life_threatening') {
          doc.setFillColor(254, 226, 226);
          doc.rect(
            data.cursor.x,
            data.cursor.y - data.row.height,
            data.table.width,
            data.row.height,
            'F',
          );
        }
      },
    });

    doc.save(`dietary-matrix-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generated for caterer');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 print:hidden">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </Card>
        <Card
          className={cn(
            'p-3 text-center',
            statistics.lifeThreatening > 0 && 'bg-red-50 border-red-300',
          )}
        >
          <div className="text-2xl font-bold text-red-600">
            {statistics.lifeThreatening}
          </div>
          <div className="text-xs text-red-800">Life Threat.</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {statistics.severe}
          </div>
          <div className="text-xs text-gray-600">Severe</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.epipenRequired}</div>
          <div className="text-xs text-gray-600">EpiPen</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.vegetarian}</div>
          <div className="text-xs text-gray-600">Vegetarian</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.vegan}</div>
          <div className="text-xs text-gray-600">Vegan</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.glutenFree}</div>
          <div className="text-xs text-gray-600">Gluten Free</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{statistics.nutAllergies}</div>
          <div className="text-xs text-gray-600">Nut Allergies</div>
        </Card>
      </div>

      {/* Main Matrix Card */}
      <Card className="p-6">
        {/* Header with Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
          <h3 className="text-xl font-semibold">Dietary Requirements Matrix</h3>

          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
              />
            </div>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="life_threatening">Life Threat.</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="mild">Mild</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <Button
              variant="outline"
              onClick={() =>
                setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')
              }
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
            </Button>

            {/* Export Actions */}
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              CSV
            </Button>

            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              PDF
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Life-threatening Alert */}
        {statistics.lifeThreatening > 0 && (
          <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-4 print:border print:border-black">
            <div className="flex items-center gap-2">
              <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
              <span className="font-bold text-red-900">
                {statistics.lifeThreatening} guest(s) with LIFE-THREATENING
                allergies - See highlighted rows
              </span>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                {viewMode === 'detailed' &&
                  ALLERGY_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      title={col.replace('_', ' ')}
                    >
                      {col.substring(0, 3)}
                    </th>
                  ))}
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veg
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vgn
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GF
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EpiPen
                </th>
                {viewMode === 'detailed' && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequirements.map((req) => (
                <tr
                  key={req.id}
                  className={cn(
                    'transition-colors',
                    req.severity === 'life_threatening' &&
                      'bg-red-50 font-semibold print:bg-gray-200',
                    req.severity === 'severe' && 'bg-orange-50',
                  )}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {req.severity === 'life_threatening' && (
                        <ShieldExclamationIcon className="h-4 w-4 text-red-600" />
                      )}
                      {req.guest_name}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    {req.table_number || '-'}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    <Badge
                      className={cn('text-xs', SEVERITY_COLORS[req.severity])}
                    >
                      {req.severity === 'life_threatening'
                        ? 'CRITICAL'
                        : req.severity}
                    </Badge>
                  </td>
                  {viewMode === 'detailed' &&
                    ALLERGY_COLUMNS.map((col) => (
                      <td
                        key={col}
                        className="px-1 py-3 whitespace-nowrap text-sm text-center"
                      >
                        {req.allergies?.[col] && (
                          <span className="text-red-600 font-bold">✓</span>
                        )}
                      </td>
                    ))}
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    {req.preferences?.vegetarian && (
                      <span className="text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    {req.preferences?.vegan && (
                      <span className="text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    {req.preferences?.gluten_free && (
                      <span className="text-blue-600">✓</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                    {req.epipen_required && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mx-auto" />
                    )}
                  </td>
                  {viewMode === 'detailed' && (
                    <td className="px-3 py-3 text-sm">
                      <div className="max-w-xs truncate">
                        {req.medical_notes || req.caterer_instructions || '-'}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequirements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No dietary requirements match your filters
            </div>
          )}
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-6 pt-4 border-t text-xs text-gray-600">
          <p>Generated on {new Date().toLocaleDateString()}</p>
          <p className="font-bold mt-2">
            CRITICAL: {statistics.lifeThreatening} life-threatening allergies |
            {statistics.epipenRequired} require EpiPen
          </p>
        </div>
      </Card>
    </div>
  );
}
