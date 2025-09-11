'use client';

import React, { useState, useEffect, useActionState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileImage,
  Heart,
  MapPin,
  Users,
  X,
  XCircle,
} from 'lucide-react';

// Types for wedding data recovery
interface BackupSnapshot {
  id: string;
  timestamp: string;
  size: string;
  version: string;
  affectedWeddings: WeddingInfo[];
  guestLists: GuestListData[];
  timelines: TimelineData[];
  photos: PhotoData[];
  forms: FormData[];
  vendors: VendorData[];
  contracts: ContractData[];
  metadata: BackupMetadata;
}

interface WeddingInfo {
  id: string;
  coupleName: string;
  weddingDate: string;
  venue: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  daysUntilWedding: number;
}

interface GuestListData {
  weddingId: string;
  guestCount: number;
  lastModified: string;
  rsvpStatus: 'pending' | 'complete' | 'partial';
}

interface TimelineData {
  weddingId: string;
  eventCount: number;
  lastModified: string;
  criticalEvents: string[];
}

interface PhotoData {
  weddingId: string;
  photoCount: number;
  totalSize: string;
  galleries: string[];
}

interface FormData {
  weddingId: string;
  formCount: number;
  submissionCount: number;
  lastModified: string;
}

interface VendorData {
  weddingId: string;
  vendorCount: number;
  contracts: number;
  lastModified: string;
}

interface ContractData {
  weddingId: string;
  contractCount: number;
  signedCount: number;
  pendingCount: number;
}

interface BackupMetadata {
  createdBy: string;
  backupType: 'manual' | 'scheduled' | 'emergency';
  dataIntegrityScore: number;
  encryptionStatus: 'encrypted' | 'partial' | 'none';
}

interface ConflictDetection {
  dataType: string;
  conflictCount: number;
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  conflictDetails: string[];
  resolutionOptions: string[];
}

interface RecoveryImpactAssessment {
  estimatedDuration: string;
  dataLossRisk: 'none' | 'minimal' | 'moderate' | 'high';
  affectedUsers: number;
  backupAge: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

type DataType =
  | 'guest-lists'
  | 'timelines'
  | 'photos'
  | 'forms'
  | 'vendors'
  | 'contracts';

interface DataRecoveryPreviewProps {
  backupSnapshot: BackupSnapshot;
  onSelectiveRestore: (dataTypes: DataType[], options: any) => Promise<void>;
  onCancel: () => void;
  currentSystemState?: any;
  emergencyMode?: boolean;
}

const DataRecoveryPreview: React.FC<DataRecoveryPreviewProps> = ({
  backupSnapshot,
  onSelectiveRestore,
  onCancel,
  currentSystemState,
  emergencyMode = false,
}) => {
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDetection[]>([]);
  const [impactAssessment, setImpactAssessment] =
    useState<RecoveryImpactAssessment | null>(null);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [recoveryOptions, setRecoveryOptions] = useState({
    overwriteExisting: false,
    createBackupBeforeRestore: true,
    notifyAffectedUsers: true,
    validateDataIntegrity: true,
  });

  // React 19 useActionState for selective restore
  const [restoreState, restoreAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        const selectedTypes = JSON.parse(
          formData.get('selectedDataTypes') as string,
        );
        const options = JSON.parse(formData.get('recoveryOptions') as string);

        if (selectedTypes.length === 0) {
          throw new Error('Please select at least one data type to restore');
        }

        // Validate conflicts are resolved
        const criticalConflicts = conflicts.filter(
          (c) => c.conflictSeverity === 'critical',
        );
        if (criticalConflicts.length > 0 && !options.overwriteExisting) {
          throw new Error(
            'Critical conflicts detected. Please resolve conflicts or enable overwrite mode.',
          );
        }

        await onSelectiveRestore(selectedTypes, options);
        return {
          success: true,
          message: 'Data recovery initiated successfully',
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Recovery failed to initiate',
        };
      }
    },
    { success: false, message: '' },
  );

  // Monitor for conflicts when data types are selected
  useEffect(() => {
    if (selectedDataTypes.length > 0) {
      detectConflicts();
      assessRecoveryImpact();
    } else {
      setConflicts([]);
      setImpactAssessment(null);
    }
  }, [selectedDataTypes, currentSystemState]);

  const detectConflicts = () => {
    // Simulate conflict detection based on selected data types
    const mockConflicts: ConflictDetection[] = [];

    if (selectedDataTypes.includes('guest-lists')) {
      mockConflicts.push({
        dataType: 'guest-lists',
        conflictCount: 3,
        conflictSeverity: 'medium',
        conflictDetails: [
          'Guest list for Sarah & John wedding has 12 new RSVPs since backup',
          'Table assignments modified for 8 guests',
          'Dietary requirements updated for 5 guests',
        ],
        resolutionOptions: [
          'Merge changes',
          'Overwrite with backup',
          'Manual review',
        ],
      });
    }

    if (selectedDataTypes.includes('timelines')) {
      mockConflicts.push({
        dataType: 'timelines',
        conflictCount: 1,
        conflictSeverity: 'high',
        conflictDetails: [
          'Wedding timeline for Emma & David has 4 vendor time changes',
          'Ceremony start time moved by 30 minutes',
        ],
        resolutionOptions: [
          'Keep current timeline',
          'Restore backup timeline',
          'Merge both',
        ],
      });
    }

    if (selectedDataTypes.includes('photos')) {
      mockConflicts.push({
        dataType: 'photos',
        conflictCount: 156,
        conflictSeverity: 'critical',
        conflictDetails: [
          '156 new photos uploaded since backup',
          '23 photos edited with new adjustments',
          '12 photos deleted from gallery',
        ],
        resolutionOptions: [
          'Keep all current photos',
          'Merge with backup',
          'Full restore (data loss)',
        ],
      });
    }

    setConflicts(mockConflicts);
  };

  const assessRecoveryImpact = () => {
    const assessment: RecoveryImpactAssessment = {
      estimatedDuration:
        selectedDataTypes.length <= 2 ? '5-10 minutes' : '15-30 minutes',
      dataLossRisk: conflicts.some((c) => c.conflictSeverity === 'critical')
        ? 'high'
        : 'minimal',
      affectedUsers: backupSnapshot.affectedWeddings.reduce(
        (total, wedding) => {
          return total + (wedding.status === 'upcoming' ? 10 : 5); // Estimate users per wedding
        },
        0,
      ),
      backupAge: calculateBackupAge(backupSnapshot.timestamp),
      businessImpact:
        selectedDataTypes.includes('photos') ||
        selectedDataTypes.includes('timelines')
          ? 'high'
          : 'medium',
    };

    setImpactAssessment(assessment);
  };

  const calculateBackupAge = (timestamp: string): string => {
    const backupDate = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const toggleDataType = (dataType: DataType, selected: boolean) => {
    if (selected) {
      setSelectedDataTypes((prev) => [...prev, dataType]);
    } else {
      setSelectedDataTypes((prev) => prev.filter((type) => type !== dataType));
    }
  };

  const getDataTypeIcon = (dataType: DataType) => {
    const iconProps = { className: 'h-5 w-5' };
    switch (dataType) {
      case 'guest-lists':
        return <Users {...iconProps} />;
      case 'timelines':
        return <Calendar {...iconProps} />;
      case 'photos':
        return <FileImage {...iconProps} />;
      case 'forms':
        return <Database {...iconProps} />;
      case 'vendors':
        return <Heart {...iconProps} />;
      case 'contracts':
        return <MapPin {...iconProps} />;
      default:
        return <Database {...iconProps} />;
    }
  };

  const getDataTypeStats = (dataType: DataType) => {
    switch (dataType) {
      case 'guest-lists':
        const guestData = backupSnapshot.guestLists;
        const totalGuests = guestData.reduce(
          (sum, list) => sum + list.guestCount,
          0,
        );
        return `${totalGuests} guests across ${guestData.length} weddings`;

      case 'timelines':
        const timelineData = backupSnapshot.timelines;
        const totalEvents = timelineData.reduce(
          (sum, timeline) => sum + timeline.eventCount,
          0,
        );
        return `${totalEvents} events across ${timelineData.length} timelines`;

      case 'photos':
        const photoData = backupSnapshot.photos;
        const totalPhotos = photoData.reduce(
          (sum, photos) => sum + photos.photoCount,
          0,
        );
        return `${totalPhotos} photos (${photoData[0]?.totalSize || '0 MB'})`;

      case 'forms':
        const formData = backupSnapshot.forms;
        const totalForms = formData.reduce(
          (sum, form) => sum + form.formCount,
          0,
        );
        const totalSubmissions = formData.reduce(
          (sum, form) => sum + form.submissionCount,
          0,
        );
        return `${totalForms} forms, ${totalSubmissions} submissions`;

      case 'vendors':
        const vendorData = backupSnapshot.vendors;
        const totalVendors = vendorData.reduce(
          (sum, vendor) => sum + vendor.vendorCount,
          0,
        );
        return `${totalVendors} vendors across ${vendorData.length} weddings`;

      case 'contracts':
        const contractData = backupSnapshot.contracts;
        const totalContracts = contractData.reduce(
          (sum, contract) => sum + contract.contractCount,
          0,
        );
        return `${totalContracts} contracts`;

      default:
        return 'Data available';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none':
        return 'text-success';
      case 'minimal':
        return 'text-warning';
      case 'moderate':
        return 'text-danger';
      case 'high':
        return 'text-danger';
      case 'critical':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'border-l-warning';
      case 'medium':
        return 'border-l-warning';
      case 'high':
        return 'border-l-danger';
      case 'critical':
        return 'border-l-danger';
      default:
        return 'border-l-border';
    }
  };

  return (
    <div className="data-recovery-preview bg-background border border-border rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border bg-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Data Recovery Preview
            </h2>
            <p className="text-muted-foreground mt-1">
              Select wedding data to restore from backup taken{' '}
              {calculateBackupAge(backupSnapshot.timestamp)}
            </p>
          </div>
          {emergencyMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-danger/10 text-danger rounded-md text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Emergency Mode
            </div>
          )}
        </div>
      </div>

      {/* Backup Metadata */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">
                Backup Time
              </span>
            </div>
            <p className="text-sm text-foreground mt-1">
              {new Date(backupSnapshot.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">
                Backup Size
              </span>
            </div>
            <p className="text-sm text-foreground mt-1">
              {backupSnapshot.size}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">
                Weddings
              </span>
            </div>
            <p className="text-sm text-foreground mt-1">
              {backupSnapshot.affectedWeddings.length} affected
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2">
              {backupSnapshot.metadata.encryptionStatus === 'encrypted' ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-warning" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Security
              </span>
            </div>
            <p className="text-sm text-foreground mt-1 capitalize">
              {backupSnapshot.metadata.encryptionStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Affected Weddings */}
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Affected Weddings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {backupSnapshot.affectedWeddings.map((wedding) => (
            <div
              key={wedding.id}
              className={`border rounded-lg p-4 ${
                wedding.daysUntilWedding <= 7 && wedding.status === 'upcoming'
                  ? 'border-danger bg-danger/5'
                  : 'border-border bg-background'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {wedding.coupleName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {wedding.venue}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(wedding.weddingDate).toLocaleDateString()}
                  </p>
                </div>
                {wedding.status === 'upcoming' &&
                  wedding.daysUntilWedding <= 7 && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-danger">
                        URGENT
                      </div>
                      <div className="text-xs text-danger">
                        {wedding.daysUntilWedding} days
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Type Selection */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Select Data to Restore
        </h3>
        <div className="space-y-4">
          {(
            [
              'guest-lists',
              'timelines',
              'photos',
              'forms',
              'vendors',
              'contracts',
            ] as DataType[]
          ).map((dataType) => (
            <div
              key={dataType}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedDataTypes.includes(dataType)
                  ? 'border-accent bg-accent/5'
                  : 'border-border bg-background hover:border-muted-foreground'
              }`}
              onClick={() =>
                toggleDataType(dataType, !selectedDataTypes.includes(dataType))
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getDataTypeIcon(dataType)}
                    <span className="font-medium text-foreground capitalize">
                      {dataType.replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {getDataTypeStats(dataType)}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedDataTypes.includes(dataType)
                      ? 'border-accent bg-accent'
                      : 'border-border'
                  }`}
                >
                  {selectedDataTypes.includes(dataType) && (
                    <CheckCircle2 className="h-3 w-3 text-accent-foreground" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Detection & Resolution */}
      {conflicts.length > 0 && (
        <div className="p-6 border-t border-border bg-warning/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Data Conflicts Detected
            </h3>
            <button
              onClick={() => setShowConflictResolution(!showConflictResolution)}
              className="text-sm text-accent hover:text-accent/80 font-medium"
            >
              {showConflictResolution ? 'Hide Details' : 'View Details'}
            </button>
          </div>

          {showConflictResolution ? (
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`border-l-4 ${getConflictSeverityColor(conflict.conflictSeverity)} bg-background p-4 rounded-r-lg`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground capitalize">
                      {conflict.dataType.replace('-', ' ')} -{' '}
                      {conflict.conflictCount} conflicts
                    </h4>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        conflict.conflictSeverity === 'critical'
                          ? 'bg-danger/20 text-danger'
                          : conflict.conflictSeverity === 'high'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {conflict.conflictSeverity.toUpperCase()}
                    </span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                    {conflict.conflictDetails.map((detail, detailIndex) => (
                      <li key={detailIndex}>• {detail}</li>
                    ))}
                  </ul>
                  <div className="text-sm">
                    <span className="text-foreground font-medium">
                      Resolution options:{' '}
                    </span>
                    <span className="text-muted-foreground">
                      {conflict.resolutionOptions.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="bg-background border border-border rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        conflict.conflictSeverity === 'critical'
                          ? 'text-danger'
                          : 'text-warning'
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {conflict.dataType.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {conflict.conflictCount} conflicts (
                    {conflict.conflictSeverity} priority)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recovery Impact Assessment */}
      {impactAssessment && (
        <div className="p-6 border-t border-border bg-muted/30">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recovery Impact Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Duration
              </p>
              <p className="text-lg font-semibold text-foreground">
                {impactAssessment.estimatedDuration}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Data Loss Risk
              </p>
              <p
                className={`text-lg font-semibold ${getRiskColor(impactAssessment.dataLossRisk)}`}
              >
                {impactAssessment.dataLossRisk}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Affected Users
              </p>
              <p className="text-lg font-semibold text-foreground">
                {impactAssessment.affectedUsers}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Backup Age
              </p>
              <p className="text-lg font-semibold text-foreground">
                {impactAssessment.backupAge}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Business Impact
              </p>
              <p
                className={`text-lg font-semibold ${getRiskColor(impactAssessment.businessImpact)}`}
              >
                {impactAssessment.businessImpact}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Options */}
      {selectedDataTypes.length > 0 && (
        <div className="p-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recovery Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recoveryOptions.createBackupBeforeRestore}
                onChange={(e) =>
                  setRecoveryOptions((prev) => ({
                    ...prev,
                    createBackupBeforeRestore: e.target.checked,
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Create backup before restore (recommended)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recoveryOptions.overwriteExisting}
                onChange={(e) =>
                  setRecoveryOptions((prev) => ({
                    ...prev,
                    overwriteExisting: e.target.checked,
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Overwrite existing data (resolves all conflicts)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recoveryOptions.notifyAffectedUsers}
                onChange={(e) =>
                  setRecoveryOptions((prev) => ({
                    ...prev,
                    notifyAffectedUsers: e.target.checked,
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Notify affected users of data recovery
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recoveryOptions.validateDataIntegrity}
                onChange={(e) =>
                  setRecoveryOptions((prev) => ({
                    ...prev,
                    validateDataIntegrity: e.target.checked,
                  }))
                }
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Validate data integrity after restore
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 border-t border-border bg-elevated">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-muted-foreground transition-colors"
          >
            Cancel Recovery
          </button>

          <div className="flex items-center gap-3">
            {selectedDataTypes.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedDataTypes.length} data type
                {selectedDataTypes.length !== 1 ? 's' : ''} selected
              </div>
            )}

            <form action={restoreAction}>
              <input
                type="hidden"
                name="selectedDataTypes"
                value={JSON.stringify(selectedDataTypes)}
              />
              <input
                type="hidden"
                name="recoveryOptions"
                value={JSON.stringify(recoveryOptions)}
              />

              <button
                type="submit"
                disabled={selectedDataTypes.length === 0}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                  emergencyMode
                    ? 'bg-danger text-danger-foreground hover:bg-danger/90'
                    : selectedDataTypes.length === 0
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-accent text-accent-foreground hover:bg-accent/90'
                }`}
              >
                {emergencyMode ? 'Emergency Restore' : 'Start Recovery'}
              </button>
            </form>
          </div>
        </div>

        {restoreState.message && (
          <div
            className={`mt-3 text-sm ${
              restoreState.success ? 'text-success' : 'text-danger'
            }`}
          >
            {restoreState.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataRecoveryPreview;
