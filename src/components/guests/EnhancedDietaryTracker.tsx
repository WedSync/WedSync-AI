/**
 * WS-152: Enhanced Dietary Tracker Component
 * Team D - Batch 13
 *
 * Medical-grade dietary management UI with security and performance optimization
 */

'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dietaryRequirementsService, {
  generateDietaryMatrix,
  getGuestDietaryRequirements,
} from '@/lib/services/dietary-requirements-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  Heart,
  FileText,
  Download,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  Users,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type DietarySeverity =
  | 'preference'
  | 'intolerance'
  | 'allergy'
  | 'severe_allergy'
  | 'life_threatening'
  | 'medical_required';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  householdId?: string;
  rsvpStatus: string;
}

interface DietaryRequirement {
  id: string;
  guestId: string;
  dietaryTypeId: string;
  severity: DietarySeverity;
  description?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  kitchenSeparationRequired: boolean;
  dietaryType?: {
    id: string;
    name: string;
    category: string;
    crossContaminationRisk: boolean;
    requiresMedicalAttention: boolean;
    icon?: string;
    colorCode?: string;
  };
  guestName?: string;
}

interface DietaryMatrix {
  summary: Record<string, any>;
  allergens: string[];
  severity: Record<DietarySeverity, { count: number; guests: number }>;
  totalRequirements: number;
  criticalAllergies: string[];
  kitchenRequirements: {
    separatePrepNeeded: boolean;
    allergenFreeZone: boolean;
  };
  generatedAt: Date;
  cached?: boolean;
  cachedAt?: Date;
}

interface EnhancedDietaryTrackerProps {
  coupleId: string;
  eventId?: string;
  guestId?: string;
  viewMode?: 'individual' | 'overview' | 'catering';
  onUpdate?: () => void;
}

const SEVERITY_CONFIG: Record<
  DietarySeverity,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    bgColor: string;
    borderColor: string;
    description: string;
    priority: number;
  }
> = {
  life_threatening: {
    label: 'Life Threatening',
    color: 'text-red-900',
    icon: ShieldAlert,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    description:
      'Can cause anaphylaxis or death. Requires immediate medical attention.',
    priority: 0,
  },
  severe_allergy: {
    label: 'Severe Allergy',
    color: 'text-orange-900',
    icon: Shield,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
    description: 'Causes significant health issues. May require EpiPen.',
    priority: 1,
  },
  medical_required: {
    label: 'Medical Required',
    color: 'text-purple-900',
    icon: Heart,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
    description: 'Required for medical condition (e.g., diabetes, PKU).',
    priority: 2,
  },
  allergy: {
    label: 'Allergy',
    color: 'text-yellow-900',
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    description: 'Standard allergic reaction. Causes discomfort.',
    priority: 3,
  },
  intolerance: {
    label: 'Intolerance',
    color: 'text-blue-900',
    icon: AlertCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    description: 'Causes digestive issues or discomfort.',
    priority: 4,
  },
  preference: {
    label: 'Preference',
    color: 'text-gray-700',
    icon: Users,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    description: 'Personal or religious preference.',
    priority: 5,
  },
};

export function EnhancedDietaryTracker({
  coupleId,
  eventId,
  guestId,
  viewMode = 'overview',
  onUpdate,
}: EnhancedDietaryTrackerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [requirements, setRequirements] = useState<DietaryRequirement[]>([]);
  const [dietaryTypes, setDietaryTypes] = useState<any[]>([]);
  const [dietaryMatrix, setDietaryMatrix] = useState<DietaryMatrix | null>(
    null,
  );
  const [showMedicalData, setShowMedicalData] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Form state
  const [newRequirement, setNewRequirement] = useState({
    dietaryTypeId: '',
    severity: 'preference' as DietarySeverity,
    description: '',
    kitchenSeparationRequired: false,
    medicalDetails: '',
    emergencyContact: '',
    emergencyMedication: '',
    hospitalPreference: '',
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    lastLoadTime: 0,
    cacheHitRate: 0,
    averageQueryTime: 0,
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [coupleId, guestId, eventId]);

  // Monitor performance
  useEffect(() => {
    const interval = setInterval(async () => {
      await updatePerformanceMetrics();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    const startTime = performance.now();
    setLoading(true);

    try {
      // Load dietary types
      const types = await dietaryRequirementsService.getDietaryTypes();
      setDietaryTypes(types);

      // Load guests or specific guest
      if (guestId) {
        const guestReqs =
          await dietaryRequirementsService.getGuestDietaryRequirements(guestId);
        setRequirements(guestReqs);
      } else {
        // Load all requirements for overview
        const allReqs =
          await dietaryRequirementsService.searchDietaryRequirements(coupleId);
        setRequirements(allReqs);
      }

      // Load dietary matrix for overview/catering mode
      if (viewMode !== 'individual') {
        await loadDietaryMatrix();
      }

      const endTime = performance.now();
      setPerformanceMetrics((prev) => ({
        ...prev,
        lastLoadTime: endTime - startTime,
      }));
    } catch (error) {
      console.error('Error loading dietary data:', error);
      toast.error('Failed to load dietary information');
    } finally {
      setLoading(false);
    }
  };

  const loadDietaryMatrix = async (forceRefresh = false) => {
    setMatrixLoading(true);
    const startTime = performance.now();

    try {
      const matrix = await dietaryRequirementsService.generateDietaryMatrix(
        coupleId,
        eventId,
        forceRefresh,
      );
      setDietaryMatrix(matrix);

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Check performance target (2 seconds)
      if (loadTime > 2000) {
        console.warn(
          `Dietary matrix load time: ${loadTime}ms (exceeds 2s target)`,
        );
        toast.warning(
          'Dietary data loading slowly. Consider refreshing cache.',
        );
      }

      setPerformanceMetrics((prev) => ({
        ...prev,
        lastLoadTime: loadTime,
        cacheHitRate: matrix.cached ? prev.cacheHitRate + 1 : prev.cacheHitRate,
      }));
    } catch (error) {
      console.error('Error loading dietary matrix:', error);
      toast.error('Failed to generate dietary overview');
    } finally {
      setMatrixLoading(false);
    }
  };

  const handleAddRequirement = async () => {
    if (!selectedGuest || !newRequirement.dietaryTypeId) {
      toast.error('Please select a dietary type');
      return;
    }

    try {
      const medicalData = [
        'life_threatening',
        'severe_allergy',
        'medical_required',
      ].includes(newRequirement.severity)
        ? {
            details: newRequirement.medicalDetails,
            emergencyContact: newRequirement.emergencyContact,
            emergencyMedication: newRequirement.emergencyMedication,
            hospitalPreference: newRequirement.hospitalPreference,
          }
        : undefined;

      await dietaryRequirementsService.addDietaryRequirement(selectedGuest.id, {
        dietaryTypeId: newRequirement.dietaryTypeId,
        severity: newRequirement.severity,
        description: newRequirement.description,
        medicalData,
        kitchenSeparationRequired: newRequirement.kitchenSeparationRequired,
      });

      toast.success('Dietary requirement added securely');
      setShowAddDialog(false);
      await loadInitialData();
      onUpdate?.();

      // Reset form
      setNewRequirement({
        dietaryTypeId: '',
        severity: 'preference',
        description: '',
        kitchenSeparationRequired: false,
        medicalDetails: '',
        emergencyContact: '',
        emergencyMedication: '',
        hospitalPreference: '',
      });
    } catch (error) {
      console.error('Error adding dietary requirement:', error);
      toast.error('Failed to add dietary requirement');
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this dietary requirement? This action will be logged for compliance.',
      )
    ) {
      return;
    }

    try {
      await dietaryRequirementsService.deleteDietaryRequirement(requirementId);
      toast.success('Dietary requirement removed');
      await loadInitialData();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to remove dietary requirement');
    }
  };

  const handleVerifyRequirement = async (requirementId: string) => {
    const verifier = prompt(
      'Enter your name to verify this dietary requirement:',
    );
    if (!verifier) return;

    try {
      await dietaryRequirementsService.verifyDietaryRequirement(
        requirementId,
        verifier,
      );
      toast.success('Dietary requirement verified');
      await loadInitialData();
    } catch (error) {
      console.error('Error verifying requirement:', error);
      toast.error('Failed to verify requirement');
    }
  };

  const generateCateringReport = async () => {
    try {
      const includeEmergency = confirm(
        'Include emergency medical information in the report?',
      );
      const report = await dietaryRequirementsService.generateCateringReport(
        coupleId,
        new Date(eventId || Date.now()),
        includeEmergency,
      );

      // Download report as JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dietary-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();

      toast.success('Catering report generated and downloaded');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate catering report');
    }
  };

  const updatePerformanceMetrics = async () => {
    // This would connect to real monitoring in production
    console.log('Performance metrics:', performanceMetrics);
  };

  const loadAuditLog = async (guestId?: string) => {
    try {
      const logs = await dietaryRequirementsService.getAuditLog({
        guestId,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });
      setAuditLog(logs);
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  };

  // Memoized calculations
  const criticalCount = useMemo(() => {
    return requirements.filter((r) =>
      ['life_threatening', 'severe_allergy'].includes(r.severity),
    ).length;
  }, [requirements]);

  const requirementsByCategory = useMemo(() => {
    const grouped: Record<string, DietaryRequirement[]> = {};
    requirements.forEach((req) => {
      const category = req.dietaryType?.category || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(req);
    });
    return grouped;
  }, [requirements]);

  if (loading) {
    return <DietaryLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Performance Alert */}
      {performanceMetrics.lastLoadTime > 2000 && (
        <Alert className="border-yellow-400 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Performance Warning</AlertTitle>
          <AlertDescription>
            Dietary data is loading slowly (
            {Math.round(performanceMetrics.lastLoadTime)}ms). Consider
            optimizing your queries or refreshing the cache.
          </AlertDescription>
        </Alert>
      )}

      {/* Critical Allergy Alert */}
      {criticalCount > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900">
            Critical Medical Alert
          </AlertTitle>
          <AlertDescription className="text-red-700">
            You have {criticalCount} guest(s) with life-threatening allergies or
            severe medical conditions. Ensure all vendors are properly informed
            and emergency protocols are in place.
            {dietaryMatrix?.kitchenRequirements?.allergenFreeZone && (
              <span className="block mt-2 font-medium">
                ⚠️ Allergen-free preparation zone required
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={viewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="catering">Catering</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DietaryOverview
            matrix={dietaryMatrix}
            requirements={requirements}
            loading={matrixLoading}
            onRefresh={() => loadDietaryMatrix(true)}
            performanceMetrics={performanceMetrics}
          />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <IndividualDietaryManagement
            requirements={requirements}
            dietaryTypes={dietaryTypes}
            onAddRequirement={handleAddRequirement}
            onDeleteRequirement={handleDeleteRequirement}
            onVerifyRequirement={handleVerifyRequirement}
            newRequirement={newRequirement}
            setNewRequirement={setNewRequirement}
            showAddDialog={showAddDialog}
            setShowAddDialog={setShowAddDialog}
            selectedGuest={selectedGuest}
            setSelectedGuest={setSelectedGuest}
          />
        </TabsContent>

        <TabsContent value="catering" className="space-y-6">
          <CateringView
            matrix={dietaryMatrix}
            requirements={requirements}
            onGenerateReport={generateCateringReport}
            coupleId={coupleId}
          />
        </TabsContent>
      </Tabs>

      {/* Audit Log Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="fixed bottom-4 right-4">
            <Lock className="h-4 w-4 mr-2" />
            View Audit Log
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dietary Data Access Log</DialogTitle>
            <DialogDescription>
              HIPAA-compliant audit trail of all dietary data access and
              modifications
            </DialogDescription>
          </DialogHeader>
          <AuditLogView logs={auditLog} onLoad={() => loadAuditLog()} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-components
function DietaryLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}

function DietaryOverview({
  matrix,
  requirements,
  loading,
  onRefresh,
  performanceMetrics,
}: any) {
  if (loading) {
    return <DietaryLoadingSkeleton />;
  }

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requirements.length}</div>
            {matrix?.cached && (
              <p className="text-xs text-gray-500">
                Cached {format(new Date(matrix.cachedAt), 'HH:mm:ss')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">
              Life Threatening
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {matrix?.severity?.life_threatening?.count || 0}
            </div>
            <p className="text-xs text-gray-500">
              {matrix?.severity?.life_threatening?.guests || 0} guests
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700">
              Severe Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {matrix?.severity?.severe_allergy?.count || 0}
            </div>
            <p className="text-xs text-gray-500">
              {matrix?.severity?.severe_allergy?.guests || 0} guests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(performanceMetrics.lastLoadTime)}ms
            </div>
            <p className="text-xs text-gray-500">Last query time</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh Matrix
        </Button>
      </div>

      {/* Requirements by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(matrix?.summary?.by_category || {}).map(
              ([category, items]: any) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium capitalize">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((item: any) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="outline">{item.guest_count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function IndividualDietaryManagement({
  requirements,
  dietaryTypes,
  onAddRequirement,
  onDeleteRequirement,
  onVerifyRequirement,
  newRequirement,
  setNewRequirement,
  showAddDialog,
  setShowAddDialog,
  selectedGuest,
  setSelectedGuest,
}: any) {
  return (
    <>
      {/* Requirements List */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Dietary Requirements</CardTitle>
          <CardDescription>
            Manage dietary requirements with medical-grade security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requirements
            .sort(
              (a: any, b: any) =>
                SEVERITY_CONFIG[a.severity as DietarySeverity].priority -
                SEVERITY_CONFIG[b.severity as DietarySeverity].priority,
            )
            .map((req: DietaryRequirement) => {
              const config = SEVERITY_CONFIG[req.severity];
              const Icon = config.icon;

              return (
                <div
                  key={req.id}
                  className={cn(
                    'p-4 rounded-lg border-2',
                    config.bgColor,
                    config.borderColor,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('h-5 w-5', config.color)} />
                        <span className="font-medium">
                          {req.dietaryType?.name}
                        </span>
                        <Badge className={cn(config.bgColor, config.color)}>
                          {config.label}
                        </Badge>
                        {req.verifiedAt && (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>

                      {req.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {req.description}
                        </p>
                      )}

                      {req.kitchenSeparationRequired && (
                        <div className="flex items-center gap-1 text-sm text-orange-600 mb-2">
                          <ChefHat className="h-4 w-4" />
                          Kitchen separation required
                        </div>
                      )}

                      {req.dietaryType?.crossContaminationRisk && (
                        <div className="flex items-center gap-1 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Cross-contamination risk
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        {!req.verifiedAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onVerifyRequirement(req.id)}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => onDeleteRequirement(req.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {requirements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No dietary requirements added yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Requirement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Add Dietary Requirement
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Dietary Requirement</DialogTitle>
            <DialogDescription>
              Add a new dietary requirement with appropriate security level
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Dietary Type</Label>
              <Select
                value={newRequirement.dietaryTypeId}
                onValueChange={(value) =>
                  setNewRequirement((prev) => ({
                    ...prev,
                    dietaryTypeId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dietary type" />
                </SelectTrigger>
                <SelectContent>
                  {dietaryTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.icon && <span className="mr-2">{type.icon}</span>}
                      {type.name}
                      {type.requiresMedicalAttention && (
                        <Badge className="ml-2" variant="destructive">
                          Medical
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity Level</Label>
              <Select
                value={newRequirement.severity}
                onValueChange={(value) =>
                  setNewRequirement((prev) => ({
                    ...prev,
                    severity: value as DietarySeverity,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {React.createElement(config.icon, {
                          className: 'h-4 w-4',
                        })}
                        <span>{config.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-6">
                        {config.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newRequirement.description}
                onChange={(e) =>
                  setNewRequirement((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Additional details about the requirement..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="kitchen-separation"
                checked={newRequirement.kitchenSeparationRequired}
                onChange={(e) =>
                  setNewRequirement((prev) => ({
                    ...prev,
                    kitchenSeparationRequired: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="kitchen-separation">
                Requires separate kitchen preparation
              </Label>
            </div>

            {/* Medical Information (for severe cases) */}
            {[
              'life_threatening',
              'severe_allergy',
              'medical_required',
            ].includes(newRequirement.severity) && (
              <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-medium">
                    Medical Information (Encrypted)
                  </span>
                </div>

                <div>
                  <Label>Medical Details</Label>
                  <Textarea
                    value={newRequirement.medicalDetails}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        medicalDetails: e.target.value,
                      }))
                    }
                    placeholder="Specific medical information (e.g., EpiPen required, anaphylaxis risk)..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Emergency Contact</Label>
                  <Input
                    value={newRequirement.emergencyContact}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        emergencyContact: e.target.value,
                      }))
                    }
                    placeholder="Emergency contact information"
                  />
                </div>

                <div>
                  <Label>Emergency Medication</Label>
                  <Input
                    value={newRequirement.emergencyMedication}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        emergencyMedication: e.target.value,
                      }))
                    }
                    placeholder="e.g., EpiPen, insulin"
                  />
                </div>

                <div>
                  <Label>Hospital Preference</Label>
                  <Input
                    value={newRequirement.hospitalPreference}
                    onChange={(e) =>
                      setNewRequirement((prev) => ({
                        ...prev,
                        hospitalPreference: e.target.value,
                      }))
                    }
                    placeholder="Preferred hospital for emergencies"
                  />
                </div>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    This information will be encrypted and stored securely.
                    Access is logged for compliance.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={onAddRequirement}>
                <Shield className="h-4 w-4 mr-2" />
                Add Requirement Securely
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CateringView({
  matrix,
  requirements,
  onGenerateReport,
  coupleId,
}: any) {
  return (
    <>
      {/* Catering Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Catering Requirements Summary</CardTitle>
          <CardDescription>
            Overview for catering vendors with safety protocols
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Critical Allergies */}
          {matrix?.criticalAllergies && matrix.criticalAllergies.length > 0 && (
            <Alert className="border-red-500 bg-red-50">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900">
                Critical Allergies Present
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 text-red-700">
                  {matrix.criticalAllergies.map((allergy: string) => (
                    <li key={allergy}>{allergy}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Kitchen Requirements */}
          <div className="space-y-2">
            <h4 className="font-medium">Kitchen Requirements</h4>
            <div className="space-y-1">
              {matrix?.kitchenRequirements?.allergenFreeZone && (
                <div className="flex items-center gap-2 text-red-600">
                  <Shield className="h-4 w-4" />
                  Allergen-free preparation zone required
                </div>
              )}
              {matrix?.kitchenRequirements?.separatePrepNeeded && (
                <div className="flex items-center gap-2 text-orange-600">
                  <ChefHat className="h-4 w-4" />
                  Separate preparation areas needed
                </div>
              )}
            </div>
          </div>

          {/* Generate Report Button */}
          <Button onClick={onGenerateReport} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generate Encrypted Catering Report
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Dietary Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Guests</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {requirements
                  .sort(
                    (a: any, b: any) =>
                      SEVERITY_CONFIG[a.severity as DietarySeverity].priority -
                      SEVERITY_CONFIG[b.severity as DietarySeverity].priority,
                  )
                  .map((req: any) => (
                    <tr key={req.id} className="border-b">
                      <td className="p-2">{req.dietaryType?.name}</td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {req.dietaryType?.category}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge
                          className={cn(
                            SEVERITY_CONFIG[req.severity as DietarySeverity]
                              .bgColor,
                            SEVERITY_CONFIG[req.severity as DietarySeverity]
                              .color,
                          )}
                        >
                          {
                            SEVERITY_CONFIG[req.severity as DietarySeverity]
                              .label
                          }
                        </Badge>
                      </td>
                      <td className="p-2">{req.guestName || 'Guest'}</td>
                      <td className="p-2">
                        {req.kitchenSeparationRequired && (
                          <span className="text-orange-600">
                            Separation required
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AuditLogView({ logs, onLoad }: any) {
  useEffect(() => {
    onLoad();
  }, []);

  return (
    <div className="space-y-2">
      {logs.map((log: any) => (
        <div key={log.id} className="p-3 bg-gray-50 rounded text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{log.action}</span>
            <span className="text-xs text-gray-500">
              {format(new Date(log.createdAt), 'PPpp')}
            </span>
          </div>
          {log.accessReason && (
            <p className="text-gray-600">{log.accessReason}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>User: {log.performedBy}</span>
            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="text-center text-gray-500">No audit logs available</p>
      )}
    </div>
  );
}
