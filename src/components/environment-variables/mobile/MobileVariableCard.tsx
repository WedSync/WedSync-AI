'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  Edit,
  Trash2,
  Lock,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Variable {
  id: string;
  key: string;
  value: string;
  environment:
    | 'development'
    | 'staging'
    | 'production'
    | 'wedding-day-critical';
  security_level:
    | 'Public'
    | 'Internal'
    | 'Confidential'
    | 'Wedding-Day-Critical';
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  description?: string;
}

interface MobileVariableCardProps {
  variable: Variable;
  onUpdate: () => void;
  isReadOnly?: boolean;
}

export function MobileVariableCard({
  variable,
  onUpdate,
  isReadOnly = false,
}: MobileVariableCardProps) {
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const supabase = createClientComponentClient();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const deleteVariable = async () => {
    if (isReadOnly) {
      toast.error('Cannot delete variables during wedding day mode');
      return;
    }

    if (!confirm(`Delete ${variable.key}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('environment_variables')
        .delete()
        .eq('id', variable.id);

      if (error) throw error;

      toast.success('Variable deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete variable');
    }
  };

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'Public':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 text-xs"
          >
            Public
          </Badge>
        );
      case 'Internal':
        return (
          <Badge variant="secondary" className="text-xs">
            Internal
          </Badge>
        );
      case 'Confidential':
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 text-xs"
          >
            Confidential
          </Badge>
        );
      case 'Wedding-Day-Critical':
        return (
          <Badge variant="destructive" className="text-xs">
            Critical
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {level}
          </Badge>
        );
    }
  };

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'production':
        return (
          <Badge variant="destructive" className="text-xs">
            Prod
          </Badge>
        );
      case 'staging':
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 text-xs"
          >
            Stage
          </Badge>
        );
      case 'development':
        return (
          <Badge variant="outline" className="text-xs">
            Dev
          </Badge>
        );
      case 'wedding-day-critical':
        return (
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-700 text-xs"
          >
            Wedding
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {env}
          </Badge>
        );
    }
  };

  const maskValue = (value: string, securityLevel: string) => {
    if (securityLevel === 'Public') return value;
    if (value.length <= 8) return '•'.repeat(value.length);
    return (
      value.substring(0, 4) +
      '•'.repeat(Math.min(value.length - 8, 12)) +
      value.substring(value.length - 4)
    );
  };

  return (
    <Card className="relative">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold font-mono text-gray-900 truncate">
              {variable.key}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {getEnvironmentBadge(variable.environment)}
              {getSecurityBadge(variable.security_level)}
              {variable.is_encrypted && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 text-xs"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Encrypted
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Quick Actions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(variable.key, 'Variable key')}
              className="p-2 min-h-[44px] min-w-[44px]"
            >
              <Copy className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px]"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Value Display */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Value:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsValueVisible(!isValueVisible)}
              className="p-1 min-h-[36px] min-w-[36px]"
            >
              {isValueVisible ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="font-mono text-xs bg-gray-50 p-3 rounded border break-all">
            {isValueVisible
              ? variable.value
              : maskValue(variable.value, variable.security_level)}
          </div>
        </div>

        {/* Expandable Details */}
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 min-h-[40px]"
          >
            <span className="text-xs text-gray-600">
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {variable.description && (
                <div>
                  <span className="text-xs font-medium text-gray-700">
                    Description:
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {variable.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600 mt-1">
                    {formatDistanceToNow(new Date(variable.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Updated:</span>
                  <p className="text-gray-600 mt-1">
                    {formatDistanceToNow(new Date(variable.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(variable.value, 'Variable value')
                  }
                  disabled={!isValueVisible}
                  className="flex-1 min-h-[40px]"
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Value
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isReadOnly}
                  className="flex-1 min-h-[40px]"
                >
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-4 top-16 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
            <div className="p-1">
              <button
                onClick={() => {
                  copyToClipboard(variable.key, 'Variable key');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center min-h-[40px]"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Key
              </button>
              <button
                onClick={() => {
                  if (isValueVisible) {
                    copyToClipboard(variable.value, 'Variable value');
                  }
                  setIsMenuOpen(false);
                }}
                disabled={!isValueVisible}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center min-h-[40px] disabled:opacity-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Value
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  // Edit functionality would go here
                }}
                disabled={isReadOnly}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center min-h-[40px] disabled:opacity-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  deleteVariable();
                }}
                disabled={isReadOnly}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded flex items-center min-h-[40px] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Overlay to close menu */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-5"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
