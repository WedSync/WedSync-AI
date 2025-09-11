'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  Edit3,
  Trash2,
  Plus,
  Download,
  Eye,
  FileSearch,
  RefreshCw,
  Shield,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Flag,
  BarChart3,
  Users,
  MessageSquare,
  Bell,
  Lock,
  Unlock,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractMilestonesProps {
  clientId: string;
  budgetId: string;
  className?: string;
  onMilestoneComplete?: (milestoneId: string) => void;
}

interface Contract {
  id: string;
  vendor_id: string;
  vendor_name: string;
  contract_number: string;
  total_amount: number;
  currency: string;
  start_date: Date;
  end_date: Date;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  pdf_url?: string;
  extracted_data?: ContractData;
  milestones: Milestone[];
  attachments: Attachment[];
  created_at: Date;
  updated_at: Date;
  signed_date?: Date;
  cancellation_terms?: string;
  payment_terms?: string;
  notes?: string;
}

interface Milestone {
  id: string;
  contract_id: string;
  title: string;
  description: string;
  due_date: Date;
  amount: number;
  currency: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  completion_percentage: number;
  deliverables: Deliverable[];
  dependencies?: string[]; // IDs of other milestones
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount: number;
  invoice_number?: string;
  completed_date?: Date;
  verified_by?: string;
  verification_notes?: string;
  attachments: Attachment[];
  reminders: Reminder[];
}

interface Deliverable {
  id: string;
  milestone_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'verified';
  due_date?: Date;
  completed_date?: Date;
  verification_required: boolean;
  verified_by?: string;
  notes?: string;
}

interface Attachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  url: string;
  uploaded_at: Date;
  uploaded_by: string;
  description?: string;
}

interface Reminder {
  id: string;
  milestone_id: string;
  reminder_date: Date;
  reminder_type: 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  recipient: string;
  message?: string;
}

interface ContractData {
  vendor_name?: string;
  contract_date?: Date;
  total_value?: number;
  payment_schedule?: Array<{
    date: Date;
    amount: number;
    description: string;
  }>;
  deliverables?: string[];
  terms_conditions?: string;
  cancellation_policy?: string;
  extracted_milestones?: Array<{
    title: string;
    date: Date;
    amount: number;
    description: string;
  }>;
  confidence_score: number;
}

interface MilestoneStats {
  total: number;
  completed: number;
  in_progress: number;
  overdue: number;
  upcoming_30_days: number;
  total_value: number;
  paid_value: number;
  pending_value: number;
}

export function ContractMilestones({
  clientId,
  budgetId,
  className,
  onMilestoneComplete,
}: ContractMilestonesProps) {
  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );
  const [milestoneStats, setMilestoneStats] = useState<MilestoneStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'calendar'>(
    'list',
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(
    new Set(),
  );
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'overdue' | 'completed'
  >('all');

  // PDF Processing State
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [extractedData, setExtractedData] = useState<ContractData | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Load data
  useEffect(() => {
    loadContracts();
    loadMilestoneStats();
  }, [budgetId]);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/budget/${budgetId}/contracts`);
      if (!response.ok) throw new Error('Failed to load contracts');

      const data = await response.json();
      setContracts(
        data.contracts.map((c: any) => ({
          ...c,
          start_date: new Date(c.start_date),
          end_date: new Date(c.end_date),
          created_at: new Date(c.created_at),
          updated_at: new Date(c.updated_at),
          signed_date: c.signed_date ? new Date(c.signed_date) : undefined,
          milestones: c.milestones.map((m: any) => ({
            ...m,
            due_date: new Date(m.due_date),
            completed_date: m.completed_date
              ? new Date(m.completed_date)
              : undefined,
          })),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const loadMilestoneStats = async () => {
    try {
      const response = await fetch(`/api/budget/${budgetId}/milestones/stats`);
      if (response.ok) {
        const data = await response.json();
        setMilestoneStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load milestone stats:', err);
    }
  };

  const handlePDFUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || file.type !== 'application/pdf') return;

      setPdfFile(file);
      setUploadingPDF(true);
      setError(null);

      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('budget_id', budgetId);

        // Upload and process PDF
        const response = await fetch('/api/budget/contracts/process-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to process PDF');

        const { extracted_data, contract_id } = await response.json();
        setExtractedData(extracted_data);

        // Auto-create milestones from extracted data
        if (extracted_data.extracted_milestones) {
          await createMilestonesFromExtraction(
            contract_id,
            extracted_data.extracted_milestones,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process PDF');
      } finally {
        setUploadingPDF(false);
      }
    },
    [budgetId],
  );

  const createMilestonesFromExtraction = async (
    contractId: string,
    extractedMilestones: any[],
  ) => {
    try {
      const response = await fetch(
        `/api/budget/contracts/${contractId}/milestones/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestones: extractedMilestones }),
        },
      );

      if (!response.ok) throw new Error('Failed to create milestones');

      await loadContracts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create milestones',
      );
    }
  };

  const updateMilestoneStatus = async (
    milestoneId: string,
    status: Milestone['status'],
  ) => {
    try {
      const response = await fetch(
        `/api/budget/milestones/${milestoneId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) throw new Error('Failed to update milestone');

      // Update local state
      setContracts(
        contracts.map((contract) => ({
          ...contract,
          milestones: contract.milestones.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  status,
                  completed_date:
                    status === 'completed' ? new Date() : undefined,
                }
              : m,
          ),
        })),
      );

      if (status === 'completed') {
        onMilestoneComplete?.(milestoneId);
      }

      await loadMilestoneStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update milestone',
      );
    }
  };

  const toggleDeliverable = async (
    deliverableId: string,
    completed: boolean,
  ) => {
    try {
      const response = await fetch(
        `/api/budget/deliverables/${deliverableId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: completed ? 'completed' : 'pending',
            completed_date: completed ? new Date() : null,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to update deliverable');

      await loadContracts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update deliverable',
      );
    }
  };

  const setMilestoneReminder = async (
    milestoneId: string,
    reminderDate: Date,
    type: Reminder['reminder_type'],
  ) => {
    try {
      const response = await fetch(
        `/api/budget/milestones/${milestoneId}/reminders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reminder_date: reminderDate,
            reminder_type: type,
            recipient: 'user@example.com', // Would come from user context
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to set reminder');

      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set reminder');
    }
  };

  const toggleContractExpansion = (contractId: string) => {
    const newExpanded = new Set(expandedContracts);
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId);
    } else {
      newExpanded.add(contractId);
    }
    setExpandedContracts(newExpanded);
  };

  // Filter milestones
  const getFilteredMilestones = () => {
    const allMilestones = contracts.flatMap((c) =>
      c.milestones.map((m) => ({ ...m, vendor_name: c.vendor_name })),
    );

    switch (filterStatus) {
      case 'pending':
        return allMilestones.filter((m) => m.status === 'pending');
      case 'overdue':
        return allMilestones.filter(
          (m) => m.status !== 'completed' && new Date(m.due_date) < new Date(),
        );
      case 'completed':
        return allMilestones.filter((m) => m.status === 'completed');
      default:
        return allMilestones;
    }
  };

  const getMilestoneStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'overdue':
        return 'text-error-600 bg-error-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-warning-600 bg-warning-50';
    }
  };

  const getMilestoneIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'in_progress':
        return <Clock className="w-5 h-5" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Contract Milestones & Tracking
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Track vendor contracts, milestones, and payment schedules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => document.getElementById('pdf-upload')?.click()}
              disabled={uploadingPDF}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Upload
                className={cn('w-4 h-4', uploadingPDF && 'animate-spin')}
              />
              {uploadingPDF ? 'Processing...' : 'Upload Contract'}
            </button>

            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handlePDFUpload}
              className="hidden"
            />

            <button
              onClick={() => setShowMilestoneModal(true)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {milestoneStats && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Total Milestones
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {milestoneStats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-xs text-success-600 font-medium">
                    Completed
                  </p>
                  <p className="text-lg font-bold text-success-900">
                    {milestoneStats.completed}/{milestoneStats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-warning-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-xs text-warning-600 font-medium">
                    Upcoming (30d)
                  </p>
                  <p className="text-lg font-bold text-warning-900">
                    {milestoneStats.upcoming_30_days}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-error-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-error-600" />
                </div>
                <div>
                  <p className="text-xs text-error-600 font-medium">Overdue</p>
                  <p className="text-lg font-bold text-error-900">
                    {milestoneStats.overdue}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Total Contract Value:
              </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(milestoneStats.total_value)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Paid to Date:</span>
              <span className="font-semibold text-success-600">
                {formatCurrency(milestoneStats.paid_value)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Pending Payments:</span>
              <span className="font-semibold text-warning-600">
                {formatCurrency(milestoneStats.pending_value)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['all', 'pending', 'overdue', 'completed'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                      filterStatus === status
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['list', 'timeline', 'calendar'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'list' && (
          <div className="space-y-4">
            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No contracts uploaded yet</p>
                <p className="text-sm text-gray-400">
                  Upload vendor contracts to track milestones and payments
                </p>
              </div>
            ) : (
              contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  isExpanded={expandedContracts.has(contract.id)}
                  onToggleExpand={() => toggleContractExpansion(contract.id)}
                  onUpdateMilestone={updateMilestoneStatus}
                  onToggleDeliverable={toggleDeliverable}
                  onSetReminder={setMilestoneReminder}
                />
              ))
            )}
          </div>
        )}

        {viewMode === 'timeline' && (
          <MilestoneTimeline
            milestones={getFilteredMilestones()}
            onUpdateStatus={updateMilestoneStatus}
          />
        )}

        {viewMode === 'calendar' && (
          <MilestoneCalendar
            milestones={getFilteredMilestones()}
            onUpdateStatus={updateMilestoneStatus}
          />
        )}
      </div>
    </div>
  );
}

// Component implementations would follow...
interface ContractCardProps {
  contract: Contract;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateMilestone: (id: string, status: Milestone['status']) => void;
  onToggleDeliverable: (id: string, completed: boolean) => void;
  onSetReminder: (
    id: string,
    date: Date,
    type: Reminder['reminder_type'],
  ) => void;
}

function ContractCard({
  contract,
  isExpanded,
  onToggleExpand,
  onUpdateMilestone,
  onToggleDeliverable,
  onSetReminder,
}: ContractCardProps) {
  const completedMilestones = contract.milestones.filter(
    (m) => m.status === 'completed',
  ).length;
  const progress = (completedMilestones / contract.milestones.length) * 100;

  return (
    <div className="border border-gray-200 rounded-lg">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h4 className="font-medium text-gray-900">
                {contract.vendor_name}
              </h4>
              <p className="text-sm text-gray-600">
                Contract #{contract.contract_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {formatCurrency(contract.total_amount, contract.currency)}
              </p>
              <p className="text-xs text-gray-500">
                {completedMilestones}/{contract.milestones.length} milestones
              </p>
            </div>

            <div className="w-32">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {contract.milestones.map((milestone) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              onUpdateStatus={(status) =>
                onUpdateMilestone(milestone.id, status)
              }
              onToggleDeliverable={onToggleDeliverable}
              onSetReminder={(date, type) =>
                onSetReminder(milestone.id, date, type)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneItem({
  milestone,
  onUpdateStatus,
  onToggleDeliverable,
  onSetReminder,
}: any) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              getMilestoneStatusColor(milestone.status),
            )}
          >
            {getMilestoneIcon(milestone.status)}
          </div>
          <div>
            <h5 className="font-medium text-gray-900">{milestone.title}</h5>
            <p className="text-sm text-gray-600 mt-1">
              {milestone.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due {new Date(milestone.due_date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(milestone.amount, milestone.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
            <Bell className="w-4 h-4" />
          </button>
          <select
            value={milestone.status}
            onChange={(e) =>
              onUpdateStatus(e.target.value as Milestone['status'])
            }
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {milestone.deliverables.length > 0 && (
        <div className="mt-3 pl-11 space-y-1">
          {milestone.deliverables.map((deliverable: Deliverable) => (
            <div
              key={deliverable.id}
              className="flex items-center gap-2 text-sm"
            >
              <button
                onClick={() =>
                  onToggleDeliverable(
                    deliverable.id,
                    deliverable.status !== 'completed',
                  )
                }
                className="text-gray-600 hover:text-gray-900"
              >
                {deliverable.status === 'completed' ? (
                  <CheckSquare className="w-4 h-4 text-success-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <span
                className={cn(
                  deliverable.status === 'completed' &&
                    'line-through text-gray-400',
                )}
              >
                {deliverable.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneTimeline({ milestones, onUpdateStatus }: any) {
  return null; // Implementation would go here
}

function MilestoneCalendar({ milestones, onUpdateStatus }: any) {
  return null; // Implementation would go here
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMilestoneStatusColor(status: Milestone['status']) {
  switch (status) {
    case 'completed':
      return 'text-success-600 bg-success-50';
    case 'in_progress':
      return 'text-blue-600 bg-blue-50';
    case 'overdue':
      return 'text-error-600 bg-error-50';
    case 'cancelled':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-warning-600 bg-warning-50';
  }
}

function getMilestoneIcon(status: Milestone['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5" />;
    case 'in_progress':
      return <Clock className="w-5 h-5" />;
    case 'overdue':
      return <AlertTriangle className="w-5 h-5" />;
    default:
      return <Circle className="w-5 h-5" />;
  }
}
