/**
 * WS-164: Mobile Camera Manager
 * Advanced camera system for receipt photography and OCR processing
 */

import { notificationManager } from './notification-manager';

export interface CameraCapabilities {
  hasCamera: boolean;
  hasFrontCamera: boolean;
  hasBackCamera: boolean;
  hasFlash: boolean;
  supportsImageCapture: boolean;
  maxResolution: { width: number; height: number };
  supportedFormats: string[];
}

export interface PhotoSettings {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
  quality: number; // 0.0 to 1.0
  flash: 'auto' | 'on' | 'off';
  focusMode: 'auto' | 'manual' | 'continuous';
}

export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  settings: PhotoSettings;
}

export interface OCRResult {
  success: boolean;
  confidence: number;
  extractedText: string;
  detectedFields: {
    amount?: number;
    vendor?: string;
    date?: string;
    category?: string;
    taxAmount?: number;
    totalAmount?: number;
  };
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface ReceiptData {
  photo: CapturedPhoto;
  ocrResult: OCRResult;
  manualCorrections?: Partial<OCRResult['detectedFields']>;
  processingTime: number;
}

export class MobileCameraManager {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private capabilities: CameraCapabilities | null = null;
  private currentSettings: PhotoSettings;
  private isInitialized = false;
  private imageCapture: any = null; // ImageCapture API

  constructor() {
    this.currentSettings = {
      facingMode: 'environment', // Default to back camera for receipts
      width: 1920,
      height: 1080,
      quality: 0.9,
      flash: 'auto',
      focusMode: 'auto',
    };
  }

  // Initialize camera system
  async initialize(): Promise<boolean> {
    try {
      // Check for camera support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      // Create canvas for image processing
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');

      if (!this.context) {
        throw new Error('Canvas context not available');
      }

      // Detect camera capabilities
      this.capabilities = await this.detectCapabilities();

      if (!this.capabilities.hasCamera) {
        throw new Error('No camera available');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[CameraManager] Initialization failed:', error);
      return false;
    }
  }

  // Detect camera capabilities
  private async detectCapabilities(): Promise<CameraCapabilities> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      );

      const capabilities: CameraCapabilities = {
        hasCamera: videoDevices.length > 0,
        hasFrontCamera: false,
        hasBackCamera: false,
        hasFlash: false,
        supportsImageCapture: 'ImageCapture' in window,
        maxResolution: { width: 1920, height: 1080 },
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      };

      // Check for front/back cameras
      for (const device of videoDevices) {
        const label = device.label.toLowerCase();
        if (label.includes('front') || label.includes('user')) {
          capabilities.hasFrontCamera = true;
        }
        if (
          label.includes('back') ||
          label.includes('rear') ||
          label.includes('environment')
        ) {
          capabilities.hasBackCamera = true;
        }
      }

      // If no specific labels, assume both are available if multiple cameras
      if (
        videoDevices.length > 1 &&
        !capabilities.hasFrontCamera &&
        !capabilities.hasBackCamera
      ) {
        capabilities.hasFrontCamera = true;
        capabilities.hasBackCamera = true;
      } else if (videoDevices.length === 1) {
        // Single camera - assume it's back camera for better receipt capture
        capabilities.hasBackCamera = true;
      }

      // Test for flash and other capabilities with temporary stream
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        const track = tempStream.getVideoTracks()[0];
        const trackCapabilities = track.getCapabilities?.();

        if (trackCapabilities) {
          capabilities.hasFlash = !!trackCapabilities.torch;

          if (trackCapabilities.width && trackCapabilities.height) {
            capabilities.maxResolution = {
              width: Math.max(
                ...(trackCapabilities.width.max
                  ? [trackCapabilities.width.max]
                  : [1920]),
              ),
              height: Math.max(
                ...(trackCapabilities.height.max
                  ? [trackCapabilities.height.max]
                  : [1080]),
              ),
            };
          }
        }

        // Clean up
        tempStream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.warn(
          '[CameraManager] Could not detect advanced capabilities:',
          error,
        );
      }

      return capabilities;
    } catch (error) {
      console.error('[CameraManager] Capability detection failed:', error);
      return {
        hasCamera: false,
        hasFrontCamera: false,
        hasBackCamera: false,
        hasFlash: false,
        supportsImageCapture: false,
        maxResolution: { width: 1280, height: 720 },
        supportedFormats: ['image/jpeg'],
      };
    }
  }

  // Start camera stream
  async startCamera(
    videoElement: HTMLVideoElement,
    settings?: Partial<PhotoSettings>,
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        throw new Error('Camera manager not initialized');
      }

      // Update settings
      if (settings) {
        this.currentSettings = { ...this.currentSettings, ...settings };
      }

      // Stop existing stream
      await this.stopCamera();

      // Request camera access
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.currentSettings.facingMode,
          width: { ideal: this.currentSettings.width },
          height: { ideal: this.currentSettings.height },
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement = videoElement;

      // Set up video element
      videoElement.srcObject = this.mediaStream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;

      // Set up ImageCapture if supported
      if (this.capabilities?.supportsImageCapture && this.mediaStream) {
        const videoTrack = this.mediaStream.getVideoTracks()[0];
        this.imageCapture = new (window as any).ImageCapture(videoTrack);
      }

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error: Event) => {
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          reject(error);
        };

        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('error', onError);
      });

      return true;
    } catch (error) {
      console.error('[CameraManager] Failed to start camera:', error);
      await this.stopCamera();
      return false;
    }
  }

  // Capture photo
  async capturePhoto(): Promise<CapturedPhoto | null> {
    try {
      if (
        !this.mediaStream ||
        !this.videoElement ||
        !this.canvas ||
        !this.context
      ) {
        throw new Error('Camera not ready for capture');
      }

      let photoBlob: Blob;
      let photoWidth: number;
      let photoHeight: number;

      // Use ImageCapture API if available for better quality
      if (this.imageCapture && this.capabilities?.supportsImageCapture) {
        try {
          photoBlob = await this.imageCapture.takePhoto({
            imageHeight: this.currentSettings.height,
            imageWidth: this.currentSettings.width,
          });

          // Get dimensions from blob
          const img = new Image();
          const imageUrl = URL.createObjectURL(photoBlob);

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              photoWidth = img.naturalWidth;
              photoHeight = img.naturalHeight;
              URL.revokeObjectURL(imageUrl);
              resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
          });
        } catch (error) {
          console.warn(
            '[CameraManager] ImageCapture failed, falling back to canvas:',
            error,
          );
          // Fall through to canvas capture
        }
      }

      // Canvas capture fallback
      if (!photoBlob!) {
        const video = this.videoElement;
        photoWidth = video.videoWidth;
        photoHeight = video.videoHeight;

        this.canvas.width = photoWidth;
        this.canvas.height = photoHeight;

        // Draw video frame to canvas
        this.context.drawImage(video, 0, 0, photoWidth, photoHeight);

        // Convert to blob
        photoBlob = await new Promise<Blob>((resolve, reject) => {
          this.canvas!.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create image blob'));
              }
            },
            'image/jpeg',
            this.currentSettings.quality,
          );
        });
      }

      // Create data URL for preview
      const dataUrl = URL.createObjectURL(photoBlob);

      // Get location if available
      const location = await this.getCurrentLocation();

      const capturedPhoto: CapturedPhoto = {
        blob: photoBlob,
        dataUrl,
        width: photoWidth,
        height: photoHeight,
        timestamp: new Date().toISOString(),
        location,
        settings: { ...this.currentSettings },
      };

      return capturedPhoto;
    } catch (error) {
      console.error('[CameraManager] Photo capture failed:', error);
      return null;
    }
  }

  // Process receipt with OCR
  async processReceipt(
    photo: CapturedPhoto,
    userId: string,
  ): Promise<ReceiptData> {
    const startTime = Date.now();

    try {
      // Optimize image for OCR
      const optimizedBlob = await this.optimizeImageForOCR(photo);

      // Send to OCR service
      const ocrResult = await this.performOCR(optimizedBlob);

      // Send notification about processing result
      await notificationManager.sendReceiptProcessingNotification(
        userId,
        ocrResult.success,
        ocrResult.detectedFields,
      );

      const processingTime = Date.now() - startTime;

      return {
        photo: {
          ...photo,
          blob: optimizedBlob, // Use optimized version
        },
        ocrResult,
        processingTime,
      };
    } catch (error) {
      console.error('[CameraManager] Receipt processing failed:', error);

      // Send failure notification
      await notificationManager.sendReceiptProcessingNotification(
        userId,
        false,
      );

      // Return with failed OCR result
      return {
        photo,
        ocrResult: {
          success: false,
          confidence: 0,
          extractedText: '',
          detectedFields: {},
          boundingBoxes: [],
        },
        processingTime: Date.now() - startTime,
      };
    }
  }

  // Optimize image for OCR processing
  private async optimizeImageForOCR(photo: CapturedPhoto): Promise<Blob> {
    try {
      if (!this.canvas || !this.context) {
        return photo.blob;
      }

      // Create image from blob
      const img = new Image();
      const imageUrl = URL.createObjectURL(photo.blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Calculate optimal size (balance between quality and processing speed)
      const maxDimension = 2048;
      let { width, height } = photo;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width *= ratio;
        height *= ratio;
      }

      // Set canvas dimensions
      this.canvas.width = width;
      this.canvas.height = height;

      // Apply image preprocessing for better OCR
      this.context.drawImage(img, 0, 0, width, height);

      // Enhance contrast and brightness
      const imageData = this.context.getImageData(0, 0, width, height);
      this.enhanceImageForOCR(imageData);
      this.context.putImageData(imageData, 0, 0);

      // Clean up
      URL.revokeObjectURL(imageUrl);

      // Convert to optimized blob
      return new Promise<Blob>((resolve, reject) => {
        this.canvas!.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create optimized image'));
            }
          },
          'image/jpeg',
          0.85,
        );
      });
    } catch (error) {
      // GUARDIAN FIX: Use environment-aware logging for camera errors
      if (process.env.NODE_ENV === 'development') {
        console.error('[CameraManager] Image optimization failed:', error);
      }
      // Return original blob as fallback
      return photo.blob;
    }
  }

  // Enhance image for better OCR results
  private enhanceImageForOCR(imageData: ImageData): void {
    const data = imageData.data;

    // Simple contrast and brightness adjustment
    for (let i = 0; i < data.length; i += 4) {
      // Get RGB values
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Convert to grayscale for better text recognition
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Enhance contrast
      const enhanced =
        gray > 127 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);

      // Apply back to RGB
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
      // Alpha channel (data[i + 3]) remains unchanged
    }
  }

  // Perform OCR using external service
  private async performOCR(imageBlob: Blob): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'receipt.jpg');
      formData.append('type', 'receipt');
      formData.append('enhance', 'true');

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR service responded with ${response.status}`);
      }

      const result = await response.json();

      return {
        success: result.success || false,
        confidence: result.confidence || 0,
        extractedText: result.text || '',
        detectedFields: this.parseReceiptFields(result),
        boundingBoxes: result.boundingBoxes || [],
      };
    } catch (error) {
      console.error('[CameraManager] OCR processing failed:', error);

      return {
        success: false,
        confidence: 0,
        extractedText: '',
        detectedFields: {},
        boundingBoxes: [],
      };
    }
  }

  // Parse receipt fields from OCR result
  private parseReceiptFields(ocrData: any): OCRResult['detectedFields'] {
    const fields: OCRResult['detectedFields'] = {};

    try {
      // Extract amount (look for currency patterns)
      const amountPattern = /\$?(\d+\.?\d{0,2})/g;
      const amounts = (ocrData.text || '').match(amountPattern);

      if (amounts && amounts.length > 0) {
        // Take the largest amount as total (usually at the bottom)
        const numericAmounts = amounts.map((a: string) =>
          parseFloat(a.replace('$', '')),
        );
        fields.totalAmount = Math.max(...numericAmounts);
        fields.amount = fields.totalAmount;
      }

      // Extract vendor name (usually at the top)
      const lines = (ocrData.text || '')
        .split('\n')
        .filter((line) => line.trim());
      if (lines.length > 0) {
        fields.vendor = lines[0].trim();
      }

      // Extract date (look for date patterns)
      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
      const dateMatch = (ocrData.text || '').match(datePattern);
      if (dateMatch) {
        fields.date = dateMatch[0];
      }

      // Extract tax amount
      const taxPattern = /tax[\s:]*\$?(\d+\.?\d{0,2})/gi;
      const taxMatch = (ocrData.text || '').match(taxPattern);
      if (taxMatch) {
        fields.taxAmount = parseFloat(taxMatch[0].replace(/[^\d.]/g, ''));
      }

      // Attempt to categorize based on vendor name
      if (fields.vendor) {
        fields.category = this.categorizeVendor(fields.vendor);
      }
    } catch (error) {
      console.error('[CameraManager] Field parsing failed:', error);
    }

    return fields;
  }

  // Simple vendor categorization
  private categorizeVendor(vendor: string): string {
    const vendorLower = vendor.toLowerCase();

    const categories: Record<string, string[]> = {
      'Food & Catering': [
        'restaurant',
        'cafe',
        'catering',
        'bakery',
        'pizza',
        'burger',
      ],
      'Venue & Decor': [
        'hotel',
        'venue',
        'hall',
        'flowers',
        'florist',
        'decor',
      ],
      Photography: ['photo', 'photographer', 'studio', 'picture'],
      'Music & Entertainment': [
        'music',
        'dj',
        'band',
        'sound',
        'entertainment',
      ],
      Transportation: ['transport', 'uber', 'lyft', 'taxi', 'rental', 'car'],
      Attire: ['dress', 'suit', 'tuxedo', 'boutique', 'tailor', 'alterations'],
      Beauty: ['salon', 'spa', 'makeup', 'hair', 'beauty', 'nail'],
      Miscellaneous: [],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => vendorLower.includes(keyword))) {
        return category;
      }
    }

    return 'Miscellaneous';
  }

  // Get current location for geotagging
  private async getCurrentLocation(): Promise<
    { lat: number; lng: number } | undefined
  > {
    try {
      if (!navigator.geolocation) {
        return undefined;
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.warn('[CameraManager] Geolocation failed:', error);
            resolve(undefined);
          },
          {
            timeout: 5000,
            enableHighAccuracy: false,
            maximumAge: 300000, // 5 minutes
          },
        );
      });
    } catch (error) {
      console.warn('[CameraManager] Location access failed:', error);
      return undefined;
    }
  }

  // Toggle camera (front/back)
  async toggleCamera(): Promise<boolean> {
    try {
      if (
        !this.capabilities?.hasFrontCamera ||
        !this.capabilities?.hasBackCamera
      ) {
        return false; // Can't toggle if only one camera
      }

      const newFacingMode =
        this.currentSettings.facingMode === 'user' ? 'environment' : 'user';

      return await this.startCamera(this.videoElement!, {
        facingMode: newFacingMode,
      });
    } catch (error) {
      console.error('[CameraManager] Camera toggle failed:', error);
      return false;
    }
  }

  // Toggle flash (if supported)
  async toggleFlash(): Promise<boolean> {
    try {
      if (!this.capabilities?.hasFlash || !this.mediaStream) {
        return false;
      }

      const videoTrack = this.mediaStream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities?.();

      if (capabilities?.torch) {
        const currentFlash = this.currentSettings.flash;
        const newFlash = currentFlash === 'off' ? 'on' : 'off';

        await videoTrack.applyConstraints({
          advanced: [{ torch: newFlash === 'on' } as any],
        });

        this.currentSettings.flash = newFlash;
        return true;
      }

      return false;
    } catch (error) {
      console.error('[CameraManager] Flash toggle failed:', error);
      return false;
    }
  }

  // Stop camera stream
  async stopCamera(): Promise<void> {
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      this.imageCapture = null;
    } catch (error) {
      console.error('[CameraManager] Error stopping camera:', error);
    }
  }

  // Get current capabilities
  getCapabilities(): CameraCapabilities | null {
    return this.capabilities;
  }

  // Get current settings
  getCurrentSettings(): PhotoSettings {
    return { ...this.currentSettings };
  }

  // Update settings
  async updateSettings(newSettings: Partial<PhotoSettings>): Promise<boolean> {
    try {
      this.currentSettings = { ...this.currentSettings, ...newSettings };

      // If camera is active, restart with new settings
      if (this.mediaStream && this.videoElement) {
        return await this.startCamera(this.videoElement, newSettings);
      }

      return true;
    } catch (error) {
      console.error('[CameraManager] Settings update failed:', error);
      return false;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.stopCamera();

    this.capabilities = null;
    this.isInitialized = false;

    if (this.canvas) {
      this.canvas = null;
      this.context = null;
    }
  }
}

// Singleton instance
export const cameraManager = new MobileCameraManager();
