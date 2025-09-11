'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Upload,
  X,
  Heart,
  Download,
  Share2,
  Eye,
  Grid,
  List,
} from 'lucide-react';

export interface PhotoAlbum {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  photo_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  website_id: string;
}

export interface Photo {
  id: string;
  album_id: string;
  url: string;
  thumbnail_url: string;
  filename: string;
  caption?: string;
  uploaded_by?: string;
  likes_count: number;
  is_featured: boolean;
  created_at: string;
}

interface PhotoAlbumsProps {
  websiteId: string;
  isOwner?: boolean;
  allowUploads?: boolean;
}

export default function PhotoAlbums({
  websiteId,
  isOwner = false,
  allowUploads = true,
}: PhotoAlbumsProps) {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = await createClient();

  // Load albums
  const loadAlbums = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photo_albums')
        .select(
          `
          *,
          photos(count)
        `,
        )
        .eq('website_id', websiteId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const albumsWithCount =
        data?.map((album) => ({
          ...album,
          photo_count: album.photos?.[0]?.count || 0,
        })) || [];

      setAlbums(albumsWithCount);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  }, [websiteId, supabase]);

  // Load photos for selected album
  const loadPhotos = useCallback(
    async (albumId: string) => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('album_id', albumId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPhotos(data || []);
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    },
    [supabase],
  );

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum.id);
    }
  }, [selectedAlbum, loadPhotos]);

  // Handle file upload
  const handleFileUpload = async (files: FileList, albumId: string) => {
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please upload only image files');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB');
          continue;
        }

        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('wedding-photos')
          .upload(`${websiteId}/${albumId}/${fileName}`, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('wedding-photos')
          .getPublicUrl(uploadData.path);

        // Create thumbnail URL (assuming we have image processing)
        const thumbnailUrl = `${urlData.publicUrl}?width=300&height=300&fit=cover`;

        // Save photo record to database
        const { error: dbError } = await supabase.from('photos').insert({
          album_id: albumId,
          url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          filename: file.name,
          uploaded_by: 'guest', // In real app, get from auth
        });

        if (dbError) throw dbError;
      }

      // Reload photos
      await loadPhotos(albumId);
      await loadAlbums(); // Update photo counts
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Error uploading photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Like/unlike photo
  const toggleLike = async (photoId: string) => {
    try {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      const { error } = await supabase
        .from('photos')
        .update({ likes_count: photo.likes_count + 1 })
        .eq('id', photoId);

      if (error) throw error;

      // Update local state
      setPhotos(
        photos.map((p) =>
          p.id === photoId ? { ...p, likes_count: p.likes_count + 1 } : p,
        ),
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Share photo
  const sharePhoto = (photo: Photo) => {
    if (navigator.share) {
      navigator.share({
        title: 'Wedding Photo',
        text: photo.caption || 'Check out this wedding photo!',
        url: photo.url,
      });
    } else {
      navigator.clipboard.writeText(photo.url);
      alert('Photo URL copied to clipboard!');
    }
  };

  // Download photo
  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {!selectedAlbum ? (
        // Albums Grid View
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Photo Albums</h1>
            {isOwner && (
              <button className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors">
                Create Album
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <div
                key={album.id}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedAlbum(album)}
              >
                <div className="aspect-video bg-gray-200 relative">
                  {album.cover_image ? (
                    <Image
                      src={album.cover_image}
                      alt={album.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Grid size={48} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                    {album.photo_count} photos
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {album.name}
                  </h3>
                  {album.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {album.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Album Photo View
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Albums
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedAlbum.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  <List size={20} />
                </button>
              </div>
              {allowUploads && (
                <label className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 cursor-pointer transition-colors">
                  <Upload size={20} className="inline mr-2" />
                  Add Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileUpload(e.target.files, selectedAlbum.id)
                    }
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">Uploading photos...</p>
            </div>
          )}

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo.thumbnail_url}
                      alt={photo.caption || photo.filename}
                      fill
                      className="object-cover"
                    />
                    {photo.is_featured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white p-1 rounded">
                        ⭐
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(photo.id);
                        }}
                        className="flex items-center space-x-1 text-gray-600 hover:text-rose-600"
                      >
                        <Heart size={16} />
                        <span className="text-sm">{photo.likes_count}</span>
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sharePhoto(photo);
                          }}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPhoto(photo);
                          }}
                          className="text-gray-600 hover:text-green-600"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                    {photo.caption && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-4"
                >
                  <div className="w-20 h-20 relative rounded-lg overflow-hidden">
                    <Image
                      src={photo.thumbnail_url}
                      alt={photo.caption || photo.filename}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {photo.filename}
                    </h3>
                    {photo.caption && (
                      <p className="text-gray-600 text-sm">{photo.caption}</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      Uploaded {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleLike(photo.id)}
                      className="flex items-center space-x-1 text-gray-600 hover:text-rose-600"
                    >
                      <Heart size={16} />
                      <span className="text-sm">{photo.likes_count}</span>
                    </button>
                    <button
                      onClick={() => sharePhoto(photo)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => downloadPhoto(photo)}
                      className="text-gray-600 hover:text-green-600"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedPhoto(photo)}
                      className="text-gray-600 hover:text-purple-600"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Modal/Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X size={24} />
            </button>
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || selectedPhoto.filename}
              width={800}
              height={600}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {selectedPhoto.caption && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-60 text-white p-4 rounded">
                <p>{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
