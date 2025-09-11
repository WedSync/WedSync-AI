'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CameraIcon,
  XIcon,
  FlipHorizontalIcon,
  FlashIcon,
  ImageIcon,
  CheckIcon,
  RotateCcwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
  TrashIcon,
} from 'lucide-react';
import { BottomSheet } from '@/components/mobile/MobileEnhancedFeatures';
import { useHapticFeedback } from '@/components/mobile/MobileEnhancedFeatures';
import { validatePhotoUploadSecurity } from '@/lib/security/mobile-security';
import { cn } from '@/lib/utils';

interface PhotoCaptureInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosAdded: (photos: string[]) => void;
  maxPhotos?: number;
  allowMultiple?: boolean;
  quality?: number; // 0-1 for compression
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  file?: File;
  timestamp: Date;
  selected: boolean;
}

export function PhotoCaptureInterface({
  isOpen,
  onClose,
  onPhotosAdded,
  maxPhotos = 10,
  allowMultiple = true,
  quality = 0.8,
}: PhotoCaptureInterfaceProps) {
  // State management
  const [cameraMode, setCameraMode] = useState<'capture' | 'preview'>(
    'capture',
  );
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>(
    'environment',
  );
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const haptic = useHapticFeedback();

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported on this device');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentCamera,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraError('Camera access denied or unavailable');
    }
  }, [currentCamera, stream]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && cameraMode === 'capture') {
      initializeCamera();
    }

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, cameraMode, initializeCamera]);

  // Handle photo capture
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      haptic.medium();

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and validate
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          try {
            // Create file for security validation
            const file = new File([blob], `photo-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });

            // Validate photo security
            const mobileContext = {
              deviceId: 'mobile-device',
              platform: 'web' as const,
              biometricAvailable: false,
              networkStatus: 'online' as const,
            };

            const isSecure = await validatePhotoUploadSecurity(
              file,
              mobileContext,
            );
            if (!isSecure) {
              alert('Photo failed security validation');
              return;
            }

            // Create data URL for preview
            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            // Add to captured photos
            const newPhoto: CapturedPhoto = {
              id: crypto.randomUUID(),
              dataUrl,
              file,
              timestamp: new Date(),
              selected: true,
            };

            setCapturedPhotos((prev) => [...prev, newPhoto]);
            setCameraMode('preview');
            haptic.success();
          } catch (error) {
            console.error('Photo validation failed:', error);
            alert('Photo capture failed. Please try again.');
            haptic.error();
          }
        },
        'image/jpeg',
        quality,
      );
    } catch (error) {
      console.error('Photo capture failed:', error);
      haptic.error();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, quality, haptic]);

  // Handle file input (fallback)
  const handleFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const newPhotos: CapturedPhoto[] = [];

      for (
        let i = 0;
        i < Math.min(files.length, maxPhotos - capturedPhotos.length);
        i++
      ) {
        const file = files[i];

        try {
          // Validate photo security
          const mobileContext = {
            deviceId: 'mobile-device',
            platform: 'web' as const,
            biometricAvailable: false,
            networkStatus: 'online' as const,
          };

          const isSecure = await validatePhotoUploadSecurity(
            file,
            mobileContext,
          );
          if (!isSecure) {
            alert(`Photo ${file.name} failed security validation`);
            continue;
          }

          // Create data URL for preview
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });

          newPhotos.push({
            id: crypto.randomUUID(),
            dataUrl,
            file,
            timestamp: new Date(),
            selected: true,
          });
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
        }
      }

      if (newPhotos.length > 0) {
        setCapturedPhotos((prev) => [...prev, ...newPhotos]);
        setCameraMode('preview');
        haptic.success();
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [maxPhotos, capturedPhotos.length, haptic],
  );

  // Toggle photo selection
  const togglePhotoSelection = useCallback(
    (photoId: string) => {
      setCapturedPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? { ...photo, selected: !photo.selected }
            : photo,
        ),
      );
      haptic.light();
    },
    [haptic],
  );

  // Delete photo
  const deletePhoto = useCallback(
    (photoId: string) => {
      setCapturedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      haptic.light();
    },
    [haptic],
  );

  // Switch camera
  const switchCamera = useCallback(() => {
    setCurrentCamera((prev) => (prev === 'user' ? 'environment' : 'user'));
    haptic.light();
  }, [haptic]);

  // Handle done - send selected photos
  const handleDone = useCallback(async () => {
    const selectedPhotos = capturedPhotos.filter((photo) => photo.selected);

    if (selectedPhotos.length === 0) {
      alert('Please select at least one photo');
      return;
    }

    try {
      // Convert to data URLs for now (in production, would upload to storage)
      const photoUrls = selectedPhotos.map((photo) => photo.dataUrl);
      onPhotosAdded(photoUrls);
      haptic.success();
    } catch (error) {
      console.error('Failed to process photos:', error);
      haptic.error();
    }
  }, [capturedPhotos, onPhotosAdded, haptic]);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedPhotos([]);
    setCameraMode('capture');
    setCameraError(null);
    onClose();
  }, [stream, onClose]);

  const selectedCount = capturedPhotos.filter((p) => p.selected).length;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      snapPoints={[0.95]}
      initialSnap={0}
      className="bg-black"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <button
          onClick={handleClose}
          className={cn(
            'p-2 rounded-lg hover:bg-gray-800 transition-colors',
            'touch-manipulation focus:outline-none focus:ring-2 focus:ring-white/20',
          )}
        >
          <XIcon className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold">
          {cameraMode === 'capture'
            ? 'Take Photo'
            : `Photos (${selectedCount})`}
        </h2>

        {cameraMode === 'preview' && capturedPhotos.length > 0 && (
          <button
            onClick={handleDone}
            className={cn(
              'px-4 py-2 bg-pink-600 text-white rounded-lg font-medium',
              'hover:bg-pink-700 transition-colors touch-manipulation',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            disabled={selectedCount === 0}
          >
            Done ({selectedCount})
          </button>
        )}

        {cameraMode === 'capture' && (
          <div className="w-12" /> // Spacer for centering
        )}
      </div>

      {cameraMode === 'capture' ? (
        /* Camera Capture Mode */
        <div className="flex-1 bg-black relative">
          {cameraError ? (
            /* Error State */
            <div className="flex-1 flex flex-col items-center justify-center text-white p-8">
              <CameraIcon className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Camera Unavailable</h3>
              <p className="text-gray-300 text-center mb-6">{cameraError}</p>

              {/* File Input Fallback */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex items-center gap-2 px-6 py-3',
                  'bg-pink-600 text-white rounded-lg font-medium',
                  'hover:bg-pink-700 transition-colors touch-manipulation',
                )}
              >
                <ImageIcon className="w-5 h-5" />
                Choose from Gallery
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={allowMultiple}
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            /* Camera View */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Controls Overlay */}
              <div className="absolute inset-0 flex flex-col">
                {/* Top Controls */}
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={switchCamera}
                    className={cn(
                      'p-3 rounded-full bg-black/50 text-white',
                      'hover:bg-black/70 transition-colors touch-manipulation',
                    )}
                    aria-label="Switch camera"
                  >
                    <FlipHorizontalIcon className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() =>
                      setFlashMode((prev) =>
                        prev === 'off'
                          ? 'auto'
                          : prev === 'auto'
                            ? 'on'
                            : 'off',
                      )
                    }
                    className={cn(
                      'p-3 rounded-full bg-black/50 text-white',
                      'hover:bg-black/70 transition-colors touch-manipulation',
                    )}
                    aria-label={`Flash: ${flashMode}`}
                  >
                    <FlashIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Bottom Controls */}
                <div className="mt-auto p-6">
                  <div className="flex items-center justify-between">
                    {/* Gallery Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'w-12 h-12 rounded-lg bg-black/50 text-white',
                        'flex items-center justify-center',
                        'hover:bg-black/70 transition-colors touch-manipulation',
                      )}
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>

                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      disabled={isCapturing}
                      className={cn(
                        'w-20 h-20 rounded-full border-4 border-white',
                        'bg-white/20 hover:bg-white/30 transition-colors',
                        'flex items-center justify-center touch-manipulation',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        isCapturing && 'animate-pulse',
                      )}
                      aria-label="Capture photo"
                    >
                      <div
                        className={cn(
                          'w-16 h-16 rounded-full bg-white',
                          isCapturing && 'animate-ping',
                        )}
                      />
                    </button>

                    {/* Photos Count */}
                    <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {capturedPhotos.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={allowMultiple}
                onChange={handleFileInput}
                className="hidden"
              />
            </>
          )}
        </div>
      ) : (
        /* Photo Preview Mode */
        <div className="flex-1 bg-gray-900">
          {capturedPhotos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white p-8">
              <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Photos</h3>
              <p className="text-gray-300 text-center mb-6">
                Capture some photos to get started
              </p>
              <button
                onClick={() => setCameraMode('capture')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3',
                  'bg-pink-600 text-white rounded-lg font-medium',
                  'hover:bg-pink-700 transition-colors touch-manipulation',
                )}
              >
                <CameraIcon className="w-5 h-5" />
                Take Photos
              </button>
            </div>
          ) : (
            <div className="p-4">
              {/* Action Bar */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCameraMode('capture')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2',
                    'bg-gray-800 text-white rounded-lg',
                    'hover:bg-gray-700 transition-colors touch-manipulation',
                  )}
                >
                  <CameraIcon className="w-4 h-4" />
                  Take More
                </button>

                <div className="text-white text-sm">
                  {selectedCount} of {capturedPhotos.length} selected
                </div>
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 gap-3">
                {capturedPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square group">
                    <img
                      src={photo.dataUrl}
                      alt="Captured photo"
                      className={cn(
                        'w-full h-full object-cover rounded-lg',
                        'transition-all duration-200',
                        photo.selected
                          ? 'ring-4 ring-pink-500 opacity-100'
                          : 'opacity-70',
                      )}
                    />

                    {/* Selection Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 border-white',
                          'flex items-center justify-center transition-all',
                          'touch-manipulation',
                          photo.selected
                            ? 'bg-pink-500 text-white'
                            : 'bg-black/50 text-white hover:bg-black/70',
                        )}
                      >
                        {photo.selected && <CheckIcon className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className={cn(
                        'absolute top-2 right-2 p-1.5 rounded-full',
                        'bg-red-500 text-white opacity-0 group-hover:opacity-100',
                        'transition-opacity touch-manipulation',
                      )}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>

                    {/* Timestamp */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                      {photo.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
