'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CalendarIcon, Search, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CreateInterventionData,
  UpdateInterventionData,
  InterventionResponse,
} from '@/types/customer-success-api';

interface InterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  intervention?: InterventionResponse | null;
}

interface Client {
  id: string;
  name: string;
  healthScore?: number;
  riskLevel?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export function InterventionModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  intervention,
}: InterventionModalProps) {
  const [formData, setFormData] = useState<
    Partial<CreateInterventionData | UpdateInterventionData>
  >({
    type: 'call',
    priority: 'medium',
    title: '',
    description: '',
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [clientSearch, setClientSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock data - replace with actual API calls
  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'Sarah & John Wedding',
      healthScore: 85,
      riskLevel: 'low',
    },
    {
      id: '2',
      name: 'Emma & Michael Event',
      healthScore: 45,
      riskLevel: 'high',
    },
    {
      id: '3',
      name: 'Lisa & David Celebration',
      healthScore: 72,
      riskLevel: 'medium',
    },
  ]);

  const [adminUsers] = useState<AdminUser[]>([
    { id: '1', name: 'Alice Johnson', email: 'alice@wedsync.com' },
    { id: '2', name: 'Bob Smith', email: 'bob@wedsync.com' },
    { id: '3', name: 'Carol Williams', email: 'carol@wedsync.com' },
  ]);

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && intervention) {
      setFormData({
        type: intervention.type as any,
        priority: intervention.priority as any,
        title: intervention.title,
        description: intervention.description || '',
        status: intervention.status as any,
      });

      if (intervention.due_date) {
        setDueDate(new Date(intervention.due_date));
      }

      if (intervention.assigned_user) {
        setSelectedAdmin({
          id: intervention.assigned_user.id,
          name: intervention.assigned_user.name,
          email: intervention.assigned_user.email,
        });
      }

      // Set client info
      setSelectedClient({
        id: intervention.client_id,
        name: intervention.client_name,
      });
    } else {
      // Reset for create mode
      setFormData({
        type: 'call',
        priority: 'medium',
        title: '',
        description: '',
      });
      setSelectedClient(null);
      setSelectedAdmin(null);
      setDueDate(undefined);
    }
  }, [mode, intervention, isOpen]);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const filteredAdmins = adminUsers.filter(
    (admin) =>
      admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      admin.email.toLowerCase().includes(adminSearch.toLowerCase()),
  );

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'text-green-700 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'critical':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (mode === 'create' && !selectedClient) {
      newErrors.client = 'Client selection is required';
    }

    if (!formData.type) {
      newErrors.type = 'Intervention type is required';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const createData: CreateInterventionData = {
          client_id: selectedClient!.id,
          type: formData.type as any,
          priority: formData.priority as any,
          title: formData.title!,
          description: formData.description || undefined,
          assigned_to: selectedAdmin?.id,
          due_date: dueDate?.toISOString(),
        };

        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock API call
        console.log('Creating intervention:', createData);
      } else {
        const updateData: UpdateInterventionData = {
          status: formData.status as any,
          assigned_to: selectedAdmin?.id,
          due_date: dueDate?.toISOString(),
        };

        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock API call
        console.log('Updating intervention:', intervention?.id, updateData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error submitting intervention:', error);
      setErrors({ submit: 'Failed to save intervention. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      setClientSearch('');
      setAdminSearch('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Create New Intervention'
              : 'Edit Intervention'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new customer success intervention to address client needs.'
              : 'Update the intervention details and status.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection (Create mode only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              {selectedClient ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {selectedClient.name}
                      </p>
                      {selectedClient.healthScore && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Health Score: {selectedClient.healthScore}/100
                          </span>
                          {selectedClient.riskLevel && (
                            <Badge
                              className={cn(
                                'text-xs',
                                getRiskColor(selectedClient.riskLevel),
                              )}
                            >
                              {selectedClient.riskLevel} risk
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedClient(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  {clientSearch && (
                    <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {client.name}
                            </span>
                            {client.riskLevel && (
                              <Badge
                                className={cn(
                                  'text-xs',
                                  getRiskColor(client.riskLevel),
                                )}
                              >
                                {client.riskLevel}
                              </Badge>
                            )}
                          </div>
                          {client.healthScore && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Health Score: {client.healthScore}/100
                            </p>
                          )}
                        </button>
                      ))}

                      {filteredClients.length === 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          No clients found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {errors.client && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.client}
                </p>
              )}
            </div>
          )}

          {/* Current Client (Edit mode only) */}
          {mode === 'edit' && selectedClient && (
            <div className="space-y-2">
              <Label>Client</Label>
              <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {selectedClient.name}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Intervention Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="account_review">Account Review</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-600">{errors.priority}</p>
              )}
            </div>
          </div>

          {/* Status (Edit mode only) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter intervention title"
              value={formData.title || ''}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter intervention description (optional)"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Assigned Admin */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            {selectedAdmin ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{selectedAdmin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAdmin.email}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAdmin(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {adminSearch && (
                  <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                    {filteredAdmins.map((admin) => (
                      <button
                        key={admin.id}
                        type="button"
                        onClick={() => setSelectedAdmin(admin)}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-sm">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {admin.email}
                        </p>
                      </button>
                    ))}

                    {filteredAdmins.length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No team members found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate
                    ? format(dueDate, 'PPP')
                    : 'Select due date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
                {dueDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDueDate(undefined)}
                      className="w-full"
                    >
                      Clear Date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errors.submit}
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Processing...</>
              ) : mode === 'create' ? (
                'Create Intervention'
              ) : (
                'Update Intervention'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
