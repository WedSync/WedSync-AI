'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Shield,
  Lock,
  Copy,
  Calendar,
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

interface VariablesListProps {
  variables: Variable[];
  selectedEnvironment: string;
  onEnvironmentChange: (env: string) => void;
  onVariableUpdated: () => void;
  isReadOnly?: boolean;
}

export function VariablesList({
  variables,
  selectedEnvironment,
  onEnvironmentChange,
  onVariableUpdated,
  isReadOnly = false,
}: VariablesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [securityFilter, setSecurityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'security'>('name');
  const supabase = createClientComponentClient();

  const toggleValueVisibility = (variableId: string) => {
    const newVisibleValues = new Set(visibleValues);
    if (visibleValues.has(variableId)) {
      newVisibleValues.delete(variableId);
    } else {
      newVisibleValues.add(variableId);
    }
    setVisibleValues(newVisibleValues);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const deleteVariable = async (variableId: string, variableKey: string) => {
    if (isReadOnly) {
      toast.error('Cannot delete variables during wedding day mode');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${variableKey}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('environment_variables')
        .delete()
        .eq('id', variableId);

      if (error) throw error;

      // Log audit trail
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('environment_variable_audit').insert([
          {
            variable_key: variableKey,
            action: 'deleted',
            user_id: user.id,
            metadata: { deleted_at: new Date().toISOString() },
          },
        ]);
      }

      toast.success('Environment variable deleted successfully');
      onVariableUpdated();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete environment variable');
    }
  };

  const filteredVariables = variables
    .filter((variable) => {
      const matchesSearch =
        variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variable.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSecurity =
        securityFilter === 'all' || variable.security_level === securityFilter;
      return matchesSearch && matchesSecurity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.key.localeCompare(b.key);
        case 'updated':
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        case 'security':
          const securityOrder = {
            Public: 1,
            Internal: 2,
            Confidential: 3,
            'Wedding-Day-Critical': 4,
          };
          return (
            securityOrder[b.security_level] - securityOrder[a.security_level]
          );
        default:
          return 0;
      }
    });

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'Public':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Public
          </Badge>
        );
      case 'Internal':
        return <Badge variant="secondary">Internal</Badge>;
      case 'Confidential':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Confidential
          </Badge>
        );
      case 'Wedding-Day-Critical':
        return <Badge variant="destructive">Wedding Critical</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'production':
        return <Badge variant="destructive">Production</Badge>;
      case 'staging':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Staging
          </Badge>
        );
      case 'development':
        return <Badge variant="outline">Development</Badge>;
      case 'wedding-day-critical':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Wedding Critical
          </Badge>
        );
      default:
        return <Badge variant="outline">{env}</Badge>;
    }
  };

  const maskValue = (value: string, securityLevel: string) => {
    if (securityLevel === 'Public') return value;
    if (value.length <= 8) return '•'.repeat(value.length);
    return (
      value.substring(0, 4) +
      '•'.repeat(value.length - 8) +
      value.substring(value.length - 4)
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Environment Filter */}
            <Select
              value={selectedEnvironment}
              onValueChange={onEnvironmentChange}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="wedding-day-critical">
                  Wedding Critical
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Security Filter */}
            <Select value={securityFilter} onValueChange={setSecurityFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Security Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Security Levels</SelectItem>
                <SelectItem value="Public">Public</SelectItem>
                <SelectItem value="Internal">Internal</SelectItem>
                <SelectItem value="Confidential">Confidential</SelectItem>
                <SelectItem value="Wedding-Day-Critical">
                  Wedding Critical
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredVariables.length} of {variables.length} variables
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>
                Filtered by:{' '}
                {selectedEnvironment === 'all'
                  ? 'All Environments'
                  : selectedEnvironment}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variables List */}
      <div className="grid gap-4">
        {filteredVariables.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No variables found</h3>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredVariables.map((variable) => (
            <Card
              key={variable.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Variable Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold font-mono">
                        {variable.key}
                      </h3>
                      {variable.is_encrypted && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      )}
                    </div>

                    {/* Environment and Security Badges */}
                    <div className="flex items-center space-x-2">
                      {getEnvironmentBadge(variable.environment)}
                      {getSecurityBadge(variable.security_level)}
                    </div>

                    {/* Value Display */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Value:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleValueVisibility(variable.id)}
                          className="h-6 w-6 p-0"
                        >
                          {visibleValues.has(variable.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="font-mono text-sm bg-gray-50 p-3 rounded border">
                        {visibleValues.has(variable.id)
                          ? variable.value
                          : maskValue(variable.value, variable.security_level)}
                      </div>
                    </div>

                    {/* Description */}
                    {variable.description && (
                      <p className="text-sm text-gray-600">
                        {variable.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Updated{' '}
                          {formatDistanceToNow(new Date(variable.updated_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(variable.key, 'Variable key')
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(variable.value, 'Variable value')
                          }
                          disabled={!visibleValues.has(variable.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Value
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={isReadOnly}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Variable
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            deleteVariable(variable.id, variable.key)
                          }
                          disabled={isReadOnly}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Variable
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
