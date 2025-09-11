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
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Hotel,
  Car,
  Plane,
  Info,
  Phone,
  Globe,
  Navigation,
} from 'lucide-react';
import { TravelInfo } from '@/types/wedding-website';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'accommodation', label: 'Accommodation', icon: Hotel },
  { value: 'transportation', label: 'Transportation', icon: Car },
  { value: 'venue', label: 'Venue', icon: MapPin },
  { value: 'attraction', label: 'Local Attraction', icon: Navigation },
  { value: 'other', label: 'Other', icon: Info },
];

const getCategoryIcon = (category: string) => {
  const option = categoryOptions.find((opt) => opt.value === category);
  const Icon = option?.icon || Info;
  return <Icon className="h-4 w-4" />;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'accommodation':
      return 'bg-blue-100 text-blue-800';
    case 'transportation':
      return 'bg-green-100 text-green-800';
    case 'venue':
      return 'bg-purple-100 text-purple-800';
    case 'attraction':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function TravelInformation() {
  const [travelInfo, setTravelInfo] = useState<TravelInfo[]>([
    {
      id: '1',
      website_id: 'demo',
      title: 'Grand Hotel Downtown',
      description:
        'We have reserved a block of rooms at special wedding rates. Please mention the Smith-Johnson wedding when booking. Use code: SMITH2024',
      address: '123 Main Street, Downtown, NY 10001',
      category: 'accommodation',
      website_url: 'https://grandhoteldowntown.com',
      phone: '(555) 123-4567',
      order_index: 0,
    },
    {
      id: '2',
      website_id: 'demo',
      title: 'Airport Shuttle Service',
      description:
        'Complimentary shuttle service will be provided from the airport to the hotel and venue. Please provide your flight details when you RSVP.',
      category: 'transportation',
      order_index: 1,
    },
    {
      id: '3',
      website_id: 'demo',
      title: 'The Garden Venue',
      description:
        'Our ceremony and reception will be held at this beautiful garden venue. Parking is available on-site.',
      address: '456 Wedding Lane, Uptown, NY 10002',
      map_url: 'https://maps.google.com/?q=456+Wedding+Lane',
      category: 'venue',
      website_url: 'https://gardenvenue.com',
      order_index: 2,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<TravelInfo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    map_url: '',
    category: 'accommodation' as TravelInfo['category'],
    website_url: '',
    phone: '',
  });

  const handleAdd = () => {
    setFormData({
      title: '',
      description: '',
      address: '',
      map_url: '',
      category: 'accommodation',
      website_url: '',
      phone: '',
    });
    setEditingInfo(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (info: TravelInfo) => {
    setFormData({
      title: info.title,
      description: info.description,
      address: info.address || '',
      map_url: info.map_url || '',
      category: info.category,
      website_url: info.website_url || '',
      phone: info.phone || '',
    });
    setEditingInfo(info);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.description) {
        toast.error('Please provide a title and description');
        return;
      }

      if (editingInfo) {
        setTravelInfo(
          travelInfo.map((info) =>
            info.id === editingInfo.id
              ? {
                  ...info,
                  title: formData.title,
                  description: formData.description,
                  address: formData.address || undefined,
                  map_url: formData.map_url || undefined,
                  category: formData.category,
                  website_url: formData.website_url || undefined,
                  phone: formData.phone || undefined,
                }
              : info,
          ),
        );
        toast.success('Travel information updated');
      } else {
        const newInfo: TravelInfo = {
          id: Date.now().toString(),
          website_id: 'demo',
          title: formData.title,
          description: formData.description,
          address: formData.address || undefined,
          map_url: formData.map_url || undefined,
          category: formData.category,
          website_url: formData.website_url || undefined,
          phone: formData.phone || undefined,
          order_index: travelInfo.length,
        };
        setTravelInfo([...travelInfo, newInfo]);
        toast.success('Travel information added');
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save travel information');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setTravelInfo(travelInfo.filter((info) => info.id !== id));
      toast.success('Travel information removed');
    } catch (error) {
      toast.error('Failed to remove travel information');
    }
  };

  const groupedInfo = travelInfo.reduce(
    (acc, info) => {
      if (!acc[info.category]) {
        acc[info.category] = [];
      }
      acc[info.category].push(info);
      return acc;
    },
    {} as Record<string, TravelInfo[]>,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Travel Information
          </span>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {travelInfo.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No travel information added yet
            </p>
            <Button onClick={handleAdd} variant="outline">
              Add Your First Location
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedInfo).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {categoryOptions.find((opt) => opt.value === category)?.label}
                </h3>
                <div className="space-y-3">
                  {items.map((info) => (
                    <div
                      key={info.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {info.title}
                          </h4>
                          <Badge
                            className={`${getCategoryColor(info.category)} mt-1`}
                          >
                            {
                              categoryOptions.find(
                                (opt) => opt.value === info.category,
                              )?.label
                            }
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(info)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(info.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3">{info.description}</p>
                      <div className="space-y-2 text-sm">
                        {info.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{info.address}</span>
                            {info.map_url && (
                              <a
                                href={info.map_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline ml-2"
                              >
                                Get Directions
                              </a>
                            )}
                          </div>
                        )}
                        {info.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <a
                              href={`tel:${info.phone}`}
                              className="hover:underline"
                            >
                              {info.phone}
                            </a>
                          </div>
                        )}
                        {info.website_url && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a
                              href={info.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingInfo
                  ? 'Edit Travel Information'
                  : 'Add Travel Information'}
              </DialogTitle>
              <DialogDescription>
                Provide helpful travel details for your guests
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="info-title">Title *</Label>
                <Input
                  id="info-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Grand Hotel Downtown"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as TravelInfo['category'],
                    })
                  }
                >
                  <SelectTrigger id="info-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          {getCategoryIcon(option.value)}
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-description">Description *</Label>
                <Textarea
                  id="info-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide details about this location..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-address">Address (Optional)</Label>
                <Input
                  id="info-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Main Street, City, State ZIP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-map">Map URL (Optional)</Label>
                <Input
                  id="info-map"
                  value={formData.map_url}
                  onChange={(e) =>
                    setFormData({ ...formData, map_url: e.target.value })
                  }
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-website">Website URL (Optional)</Label>
                <Input
                  id="info-website"
                  value={formData.website_url}
                  onChange={(e) =>
                    setFormData({ ...formData, website_url: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-phone">Phone (Optional)</Label>
                <Input
                  id="info-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
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
                {editingInfo ? 'Update' : 'Add'} Information
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
