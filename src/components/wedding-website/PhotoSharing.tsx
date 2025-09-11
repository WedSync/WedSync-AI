'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Heart,
  Upload,
  Camera,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';

interface WeddingPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  category: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  upload_date: string;
  likes_count: number;
  is_featured: boolean;
  metadata?: any;
}

interface PhotoSharingProps {
  websiteId: string;
  allowUploads?: boolean;
  className?: string;
}

export function PhotoSharing({
  websiteId,
  allowUploads = true,
  className = '',
}: PhotoSharingProps) {
  const [photos, setPhotos] = useState<WeddingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<WeddingPhoto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'ceremony',
    uploaderName: '',
  });

  const categories = [
    { value: 'all', label: 'All Photos' },
    { value: 'ceremony', label: 'Ceremony' },
    { value: 'reception', label: 'Reception' },
    { value: 'preparation', label: 'Getting Ready' },
    { value: 'portraits', label: 'Portraits' },
    { value: 'candid', label: 'Candid Moments' },
    { value: 'family', label: 'Family' },
    { value: 'details', label: 'Details' },
  ];

  const fetchPhotos = useCallback(
    async (reset = false) => {
      if (!hasMore && !reset) return;

      setLoading(true);
      try {
        const offset = reset ? 0 : photos.length;
        const params = new URLSearchParams({
          website_id: websiteId,
          category: selectedCategory,
          limit: '20',
          offset: offset.toString(),
        });

        const response = await fetch(`/api/wedding-website/photos?${params}`);
        const result = await response.json();

        if (result.success) {
          const newPhotos = result.data.photos;
          setPhotos((prev) => (reset ? newPhotos : [...prev, ...newPhotos]));
          setHasMore(result.data.pagination.hasMore);
          if (reset) setPage(0);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch photos');
        }
      } catch (err) {
        setError('Error connecting to server');
        console.error('Error fetching photos:', err);
      } finally {
        setLoading(false);
      }
    },
    [websiteId, selectedCategory, photos.length, hasMore],
  );

  useEffect(() => {
    fetchPhotos(true);
  }, [selectedCategory]); // Only depend on category change

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'wedding-photo');

      // Upload to storage service (assuming we have one)
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadResult = await uploadResponse.json();

      // Save photo record
      const photoResponse = await fetch('/api/wedding-website/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          photoUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnail_url,
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          uploadedByName: uploadForm.uploaderName,
          metadata: {
            originalName: file.name,
            size: file.size,
            type: file.type,
          },
        }),
      });

      const photoResult = await photoResponse.json();

      if (photoResult.success) {
        // Add new photo to the beginning of the list
        setPhotos((prev) => [photoResult.data, ...prev]);
        setShowUploadModal(false);
        setUploadForm({
          title: '',
          description: '',
          category: 'ceremony',
          uploaderName: '',
        });
        setError(null);
      } else {
        setError(photoResult.error || 'Failed to save photo');
      }
    } catch (err) {
      setError('Error uploading photo');
      console.error('Error uploading photo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleLikePhoto = async (photoId: string) => {
    try {
      const response = await fetch(
        `/api/wedding-website/photos/${photoId}/like`,
        {
          method: 'POST',
        },
      );

      if (response.ok) {
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === photoId
              ? { ...photo, likes_count: photo.likes_count + 1 }
              : photo,
          ),
        );
      }
    } catch (err) {
      console.error('Error liking photo:', err);
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;

    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedPhoto(photos[newIndex]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Wedding Photos</span>
            </div>
            <div className="flex items-center space-x-2">
              {allowUploads && (
                <Dialog
                  open={showUploadModal}
                  onOpenChange={setShowUploadModal}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Wedding Photo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Your name"
                        value={uploadForm.uploaderName}
                        onChange={(e) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            uploaderName: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Photo title (optional)"
                        value={uploadForm.title}
                        onChange={(e) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={uploadForm.description}
                        onChange={(e) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                      <Select
                        value={uploadForm.category}
                        onValueChange={(value) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            category: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.slice(1).map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      {uploading && (
                        <p className="text-sm text-gray-600">Uploading...</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  className="text-xs"
                >
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid/List */}
      <Card>
        <CardContent className="pt-6">
          {loading && photos.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No photos yet. Be the first to share!
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Image
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.title || 'Wedding photo'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
                    <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <div className="text-sm truncate">
                          {photo.title || 'Untitled'}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs">{photo.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {photo.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500">
                      Featured
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex space-x-4 p-4 border rounded-lg"
                >
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={photo.thumbnail_url || photo.url}
                      alt={photo.title || 'Wedding photo'}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold">
                      {photo.title || 'Untitled'}
                    </h3>
                    {photo.description && (
                      <p className="text-gray-600 text-sm mt-1">
                        {photo.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>By {photo.uploaded_by_name || 'Anonymous'}</span>
                      <span>{formatDate(photo.upload_date)}</span>
                      <Badge variant="secondary">{photo.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikePhoto(photo.id)}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {photo.likes_count}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center mt-6">
              <Button onClick={() => fetchPhotos()} disabled={loading}>
                Load More Photos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <div className="relative h-[60vh] bg-black">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title || 'Wedding photo'}
                  fill
                  className="object-contain"
                />

                {/* Navigation */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/50"
                  onClick={() => navigatePhoto('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/50"
                  onClick={() => navigatePhoto('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Photo Info */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedPhoto.title || 'Untitled'}
                    </h3>
                    {selectedPhoto.description && (
                      <p className="text-gray-600 mt-1">
                        {selectedPhoto.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span>
                        By {selectedPhoto.uploaded_by_name || 'Anonymous'}
                      </span>
                      <span>{formatDate(selectedPhoto.upload_date)}</span>
                      <Badge variant="secondary">
                        {selectedPhoto.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleLikePhoto(selectedPhoto.id)}
                    className="flex items-center space-x-2"
                  >
                    <Heart className="h-4 w-4" />
                    <span>{selectedPhoto.likes_count}</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
