'use client';

import React, { useState } from 'react';
import {
  Play,
  Database,
  FileText,
  Image,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { z } from 'zod';
import { BackupFormData, BackupComponent } from '../../../types/backup';

// Validation schema using Zod
const backupFormSchema = z.object({
  components: z
    .array(z.string())
    .min(1, 'At least one component must be selected'),
  priority: z.enum(['low', 'normal', 'high'], {
    required_error: 'Priority level is required',
  }),
  reason: z
    .string()
    .min(10, 'Backup reason must be at least 10 characters')
    .max(500, 'Backup reason cannot exceed 500 characters'),
  includeUserData: z.boolean().default(true),
  compressionLevel: z.enum(['none', 'standard', 'maximum']).default('standard'),
});

interface ManualBackupFormProps {
  onBackupTrigger: () => void;
}

const ManualBackupForm: React.FC<ManualBackupFormProps> = ({
  onBackupTrigger,
}) => {
  const [formData, setFormData] = useState<Partial<BackupFormData>>({
    components: [],
    priority: 'normal',
    reason: '',
    includeUserData: true,
    compressionLevel: 'standard',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof BackupFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');

  const backupComponents: BackupComponent[] = [
    {
      id: 'database',
      label: 'Database',
      description: 'User profiles, wedding data, vendor information',
      icon: <Database className="w-5 h-5" />,
      estimatedSize: '2.4 GB',
      estimatedTime: '5-10 min',
      critical: true,
    },
    {
      id: 'files',
      label: 'Documents',
      description: 'Contracts, invoices, planning documents',
      icon: <FileText className="w-5 h-5" />,
      estimatedSize: '850 MB',
      estimatedTime: '3-5 min',
      critical: false,
    },
    {
      id: 'images',
      label: 'Media Files',
      description: 'Photos, videos, inspiration boards',
      icon: <Image className="w-5 h-5" />,
      estimatedSize: '15.2 GB',
      estimatedTime: '15-30 min',
      critical: false,
    },
    {
      id: 'system',
      label: 'System Config',
      description: 'Application settings, integrations',
      icon: <HardDrive className="w-5 h-5" />,
      estimatedSize: '120 MB',
      estimatedTime: '1-2 min',
      critical: true,
    },
  ];

  const priorityOptions = [
    {
      value: 'low',
      label: 'Low',
      description: 'Background processing, may take longer',
    },
    {
      value: 'normal',
      label: 'Normal',
      description: 'Standard processing time',
    },
    {
      value: 'high',
      label: 'High',
      description: 'Priority processing, faster completion',
    },
  ] as const;

  const compressionOptions = [
    {
      value: 'none',
      label: 'None',
      description: 'Fastest backup, largest size',
    },
    {
      value: 'standard',
      label: 'Standard',
      description: 'Balanced speed and size',
    },
    {
      value: 'maximum',
      label: 'Maximum',
      description: 'Smallest size, slower backup',
    },
  ] as const;

  const handleComponentToggle = (componentId: string) => {
    const currentComponents = formData.components || [];
    const newComponents = currentComponents.includes(componentId)
      ? currentComponents.filter((id) => id !== componentId)
      : [...currentComponents, componentId];

    setFormData((prev) => ({ ...prev, components: newComponents }));

    // Clear component error if any selected
    if (newComponents.length > 0 && errors.components) {
      setErrors((prev) => ({ ...prev, components: undefined }));
    }
  };

  const handleSelectAll = () => {
    const allComponentIds = backupComponents.map((comp) => comp.id);
    setFormData((prev) => ({ ...prev, components: allComponentIds }));
    setErrors((prev) => ({ ...prev, components: undefined }));
  };

  const handleSelectCritical = () => {
    const criticalComponentIds = backupComponents
      .filter((comp) => comp.critical)
      .map((comp) => comp.id);
    setFormData((prev) => ({ ...prev, components: criticalComponentIds }));
    setErrors((prev) => ({ ...prev, components: undefined }));
  };

  const validateForm = (): boolean => {
    try {
      backupFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Partial<Record<keyof BackupFormData, string>> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof BackupFormData;
          formErrors[path] = err.message;
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  const calculateEstimatedTime = () => {
    if (!formData.components?.length) return '0 min';

    const selectedComponents = backupComponents.filter((comp) =>
      formData.components?.includes(comp.id),
    );

    // Simple estimation based on component count and priority
    let baseTime = selectedComponents.length * 5; // 5 min base per component

    // Adjust for priority
    if (formData.priority === 'high') baseTime *= 0.7;
    if (formData.priority === 'low') baseTime *= 1.5;

    // Adjust for compression
    if (formData.compressionLevel === 'maximum') baseTime *= 1.3;
    if (formData.compressionLevel === 'none') baseTime *= 0.8;

    return `${Math.round(baseTime)} min`;
  };

  const calculateEstimatedSize = () => {
    if (!formData.components?.length) return '0 MB';

    const selectedComponents = backupComponents.filter((comp) =>
      formData.components?.includes(comp.id),
    );

    // Simple size calculation (in reality this would come from API)
    let totalSizeGB = 0;
    selectedComponents.forEach((comp) => {
      const sizeMatch = comp.estimatedSize.match(/(\d+\.?\d*)\s*(MB|GB)/);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        totalSizeGB += unit === 'GB' ? value : value / 1024;
      }
    });

    // Adjust for compression
    if (formData.compressionLevel === 'maximum') totalSizeGB *= 0.6;
    if (formData.compressionLevel === 'standard') totalSizeGB *= 0.8;

    return totalSizeGB > 1
      ? `${totalSizeGB.toFixed(1)} GB`
      : `${(totalSizeGB * 1024).toFixed(0)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call - Team B will implement actual backup trigger
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Backup triggered with data:', formData);

      setSubmitStatus('success');
      onBackupTrigger();

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          components: [],
          priority: 'normal',
          reason: '',
          includeUserData: true,
          compressionLevel: 'standard',
        });
        setSubmitStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Backup trigger failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Manual Backup
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create a backup of selected components with custom settings
        </p>
      </div>

      {/* Component Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Components to Backup
        </label>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 transition-colors"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleSelectCritical}
            className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30 transition-colors"
          >
            Critical Only
          </button>
        </div>

        <div className="space-y-3">
          {backupComponents.map((component) => {
            const isSelected = formData.components?.includes(component.id);

            return (
              <div
                key={component.id}
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
                onClick={() => handleComponentToggle(component.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleComponentToggle(component.id)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="text-purple-600 dark:text-purple-400">
                        {component.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {component.label}
                      </span>
                      {component.critical && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                          Critical
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {component.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <HardDrive className="w-3 h-3" />
                        <span>{component.estimatedSize}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{component.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errors.components && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.components}</span>
          </p>
        )}
      </div>

      {/* Priority Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Priority Level
        </label>

        <div className="space-y-2">
          {priorityOptions.map((option) => (
            <label
              key={option.value}
              className="relative flex items-start cursor-pointer"
            >
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={formData.priority === option.value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value as any,
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>

        {errors.priority && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.priority}</span>
          </p>
        )}
      </div>

      {/* Compression Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Compression Level
        </label>

        <select
          value={formData.compressionLevel}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              compressionLevel: e.target.value as any,
            }))
          }
          className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white sm:text-sm"
        >
          {compressionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
      </div>

      {/* Include User Data */}
      <div>
        <label className="relative flex items-start cursor-pointer">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={formData.includeUserData}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  includeUserData: e.target.checked,
                }))
              }
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div className="ml-3 text-sm">
            <span className="font-medium text-gray-900 dark:text-white">
              Include User Data
            </span>
            <p className="text-gray-600 dark:text-gray-400">
              Include personal user information and sensitive data in the backup
            </p>
          </div>
        </label>
      </div>

      {/* Backup Reason */}
      <div>
        <label
          htmlFor="reason"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Backup Reason *
        </label>

        <textarea
          id="reason"
          rows={4}
          value={formData.reason}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, reason: e.target.value }))
          }
          placeholder="Describe the reason for this manual backup (e.g., before major update, pre-deployment backup, data migration preparation...)"
          className={`mt-1 block w-full rounded-lg shadow-sm sm:text-sm resize-none ${
            errors.reason
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
          } dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
        />

        <div className="flex justify-between items-center mt-2">
          {errors.reason ? (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.reason}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Minimum 10 characters required
            </p>
          )}

          <span
            className={`text-xs ${
              (formData.reason?.length || 0) > 500
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formData.reason?.length || 0}/500
          </span>
        </div>
      </div>

      {/* Backup Estimates */}
      {formData.components && formData.components.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Backup Estimates
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Estimated Time:
              </span>
              <p className="font-medium text-gray-900 dark:text-white">
                {calculateEstimatedTime()}
              </p>
            </div>

            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Estimated Size:
              </span>
              <p className="font-medium text-gray-900 dark:text-white">
                {calculateEstimatedSize()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || submitStatus === 'success'}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Triggering Backup...
            </>
          ) : submitStatus === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Backup Started Successfully
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Backup
            </>
          )}
        </button>

        {submitStatus === 'error' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to start backup. Please try again.</span>
          </p>
        )}
      </div>
    </form>
  );
};

export { ManualBackupForm };
export default ManualBackupForm;
