'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserPlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  onSuccess: () => void;
  className?: string;
}

interface GuestFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  age_group: 'adult' | 'child' | 'infant';
  plus_one: boolean;
  plus_one_name: string;
  dietary_restrictions: string;
  special_needs: string;
  helper_role: string;
  notes: string;
}

const initialFormData: GuestFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  category: 'family',
  side: 'mutual',
  age_group: 'adult',
  plus_one: false,
  plus_one_name: '',
  dietary_restrictions: '',
  special_needs: '',
  helper_role: '',
  notes: '',
};

export function AddGuestModal({
  isOpen,
  onClose,
  coupleId,
  onSuccess,
  className,
}: AddGuestModalProps) {
  const [formData, setFormData] = useState<GuestFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = useCallback(
    (field: keyof GuestFormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setError('First name and last name are required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const guestData = {
          ...formData,
          couple_id: coupleId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          plus_one_name:
            formData.plus_one && formData.plus_one_name.trim()
              ? formData.plus_one_name.trim()
              : undefined,
          dietary_restrictions:
            formData.dietary_restrictions.trim() || undefined,
          special_needs: formData.special_needs.trim() || undefined,
          helper_role: formData.helper_role.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          rsvp_status: 'pending',
          tags: [],
        };

        const response = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestData),
        });

        if (response.ok) {
          onSuccess();
          onClose();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add guest');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add guest');
      } finally {
        setLoading(false);
      }
    },
    [formData, coupleId, onSuccess, onClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-[600px] max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserPlusIcon className="w-6 h-6 text-primary-600" />
            Add New Guest
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Basic Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    handleInputChange('first_name', e.target.value)
                  }
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    handleInputChange('last_name', e.target.value)
                  }
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Guest Details</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) =>
                    handleInputChange('category', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="side">Wedding Side</Label>
                <Select
                  value={formData.side}
                  onValueChange={(value: any) =>
                    handleInputChange('side', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner1">Partner 1</SelectItem>
                    <SelectItem value="partner2">Partner 2</SelectItem>
                    <SelectItem value="mutual">Mutual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age_group">Age Group</Label>
                <Select
                  value={formData.age_group}
                  onValueChange={(value: any) =>
                    handleInputChange('age_group', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="infant">Infant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Plus One */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Plus One</Label>
              <Switch
                checked={formData.plus_one}
                onCheckedChange={(checked) =>
                  handleInputChange('plus_one', checked)
                }
              />
            </div>

            {formData.plus_one && (
              <div className="space-y-2">
                <Label htmlFor="plus_one_name">Plus One Name</Label>
                <Input
                  id="plus_one_name"
                  value={formData.plus_one_name}
                  onChange={(e) =>
                    handleInputChange('plus_one_name', e.target.value)
                  }
                  placeholder="Enter plus one name"
                />
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">
              Additional Information
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dietary_restrictions">
                  Dietary Restrictions
                </Label>
                <Textarea
                  id="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={(e) =>
                    handleInputChange('dietary_restrictions', e.target.value)
                  }
                  placeholder="Enter any dietary restrictions or allergies"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_needs">Special Needs</Label>
                <Textarea
                  id="special_needs"
                  value={formData.special_needs}
                  onChange={(e) =>
                    handleInputChange('special_needs', e.target.value)
                  }
                  placeholder="Enter any special accommodations needed"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="helper_role">Wedding Role</Label>
                <Input
                  id="helper_role"
                  value={formData.helper_role}
                  onChange={(e) =>
                    handleInputChange('helper_role', e.target.value)
                  }
                  placeholder="e.g., Usher, Reader, Photographer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about this guest"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding Guest...' : 'Add Guest'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
