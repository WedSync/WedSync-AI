'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, User, Users } from 'lucide-react';
import { WeddingPartyMember } from '@/types/wedding-website';
import { toast } from 'sonner';

const roleOptions = [
  { value: 'maid_of_honor', label: 'Maid of Honor' },
  { value: 'best_man', label: 'Best Man' },
  { value: 'bridesmaid', label: 'Bridesmaid' },
  { value: 'groomsman', label: 'Groomsman' },
  { value: 'flower_girl', label: 'Flower Girl' },
  { value: 'ring_bearer', label: 'Ring Bearer' },
  { value: 'other', label: 'Other' },
];

const getRoleColor = (role: string) => {
  switch (role) {
    case 'maid_of_honor':
    case 'bridesmaid':
    case 'flower_girl':
      return 'bg-pink-100 text-pink-800';
    case 'best_man':
    case 'groomsman':
    case 'ring_bearer':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function WeddingParty() {
  const [members, setMembers] = useState<WeddingPartyMember[]>([
    {
      id: '1',
      website_id: 'demo',
      name: 'Sarah Johnson',
      role: 'maid_of_honor',
      bio: 'Best friend since college and partner in all adventures. Sarah has been there through thick and thin.',
      order_index: 0,
    },
    {
      id: '2',
      website_id: 'demo',
      name: 'Michael Smith',
      role: 'best_man',
      bio: 'Brother and lifelong best friend. Michael has always been the voice of reason and source of endless laughs.',
      order_index: 1,
    },
    {
      id: '3',
      website_id: 'demo',
      name: 'Emily Davis',
      role: 'bridesmaid',
      bio: 'College roommate and travel buddy. Emily brings joy and laughter wherever she goes.',
      order_index: 2,
    },
    {
      id: '4',
      website_id: 'demo',
      name: 'James Wilson',
      role: 'groomsman',
      bio: 'High school friend and golf partner. James has been a constant source of support and friendship.',
      order_index: 3,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WeddingPartyMember | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: '',
    role: 'bridesmaid' as WeddingPartyMember['role'],
    bio: '',
    image_url: '',
  });

  const handleAdd = () => {
    setFormData({
      name: '',
      role: 'bridesmaid',
      bio: '',
      image_url: '',
    });
    setEditingMember(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (member: WeddingPartyMember) => {
    setFormData({
      name: member.name,
      role: member.role,
      bio: member.bio || '',
      image_url: member.image_url || '',
    });
    setEditingMember(member);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingMember) {
        setMembers(
          members.map((m) =>
            m.id === editingMember.id
              ? {
                  ...m,
                  name: formData.name,
                  role: formData.role,
                  bio: formData.bio || undefined,
                  image_url: formData.image_url || undefined,
                }
              : m,
          ),
        );
        toast.success('Wedding party member updated');
      } else {
        const newMember: WeddingPartyMember = {
          id: Date.now().toString(),
          website_id: 'demo',
          name: formData.name,
          role: formData.role,
          bio: formData.bio || undefined,
          image_url: formData.image_url || undefined,
          order_index: members.length,
        };
        setMembers([...members, newMember]);
        toast.success('Wedding party member added');
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save wedding party member');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setMembers(members.filter((m) => m.id !== id));
      toast.success('Wedding party member removed');
    } catch (error) {
      toast.error('Failed to remove wedding party member');
    }
  };

  const bridesSide = members.filter((m) =>
    ['maid_of_honor', 'bridesmaid', 'flower_girl'].includes(m.role),
  );

  const groomsSide = members.filter((m) =>
    ['best_man', 'groomsman', 'ring_bearer'].includes(m.role),
  );

  const others = members.filter((m) => m.role === 'other');

  const renderMemberCard = (member: WeddingPartyMember) => (
    <div
      key={member.id}
      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg">{member.name}</h3>
            <Badge className={getRoleColor(member.role)}>
              {roleOptions.find((r) => r.value === member.role)?.label}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {member.bio && (
        <p className="text-sm text-muted-foreground">{member.bio}</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Wedding Party
          </span>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No wedding party members added yet
            </p>
            <Button onClick={handleAdd} variant="outline">
              Add Your First Member
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {bridesSide.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-pink-600">
                  Bride's Side
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bridesSide.map(renderMemberCard)}
                </div>
              </div>
            )}

            {groomsSide.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-600">
                  Groom's Side
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groomsSide.map(renderMemberCard)}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-600">
                  Special Guests
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {others.map(renderMemberCard)}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingMember
                  ? 'Edit Wedding Party Member'
                  : 'Add Wedding Party Member'}
              </DialogTitle>
              <DialogDescription>
                Add details about your wedding party member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Sarah Johnson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as WeddingPartyMember['role'],
                    })
                  }
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-bio">Bio (Optional)</Label>
                <Textarea
                  id="member-bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="Tell guests about this special person..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-image">Image URL (Optional)</Label>
                <Input
                  id="member-image"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingMember ? 'Update' : 'Add'} Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
