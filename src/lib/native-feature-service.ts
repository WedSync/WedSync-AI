// Native device features integration
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

export class NativeFeatureService {
  async initializeNativeFeatures(): Promise<void> {
    // Initialize push notifications
    await this.setupPushNotifications();

    // Request camera permissions
    await this.requestCameraPermissions();

    // Setup deep linking
    await this.setupDeepLinking();
  }

  async captureWeddingPhoto(
    context: 'timeline' | 'gallery' | 'notes',
  ): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true,
      });

      // Get current location for geotagging
      const location = await this.getCurrentLocation();

      // Upload with context
      const uploadResult = await this.uploadPhotoWithContext(image.webPath!, {
        context,
        location,
        timestamp: new Date().toISOString(),
      });

      return uploadResult.url;
    } catch (error) {
      console.error('Photo capture failed:', error);
      return null;
    }
  }

  async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
      };
    } catch (error) {
      console.error('Location access failed:', error);
      return null;
    }
  }

  private async setupPushNotifications(): Promise<void> {
    try {
      // Request permissions
      let permissionStatus = await PushNotifications.requestPermissions();

      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Handle registration
        PushNotifications.addListener('registration', (token) => {
          this.sendTokenToServer(token.value);
        });

        // Handle incoming notifications
        PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            this.handlePushNotification(notification);
          },
        );
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  private async setupDeepLinking(): Promise<void> {
    // Handle app launch from deep link
    document.addEventListener('DOMContentLoaded', () => {
      // Check for launch parameters
      const urlParams = new URLSearchParams(window.location.search);
      const deepLink = urlParams.get('deeplink');

      if (deepLink) {
        this.handleDeepLink(deepLink);
      }
    });

    // Handle deep links while app is running
    window.addEventListener('appurlopen', (event: any) => {
      this.handleDeepLink(event.url);
    });
  }

  private handleDeepLink(url: string): void {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;

      // Route based on deep link path
      if (path.includes('/client/')) {
        const clientId = path.split('/client/')[1].split('/')[0];
        this.navigateToClient(clientId);
      } else if (path.includes('/timeline/')) {
        const timelineId = path.split('/timeline/')[1];
        this.navigateToTimeline(timelineId);
      } else if (path.includes('/forms/')) {
        const formId = path.split('/forms/')[1];
        this.navigateToForm(formId);
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
    }
  }

  async shareWeddingContent(content: {
    title: string;
    text: string;
    url?: string;
    files?: string[];
  }): Promise<void> {
    try {
      await Share.share({
        title: content.title,
        text: content.text,
        url: content.url,
        dialogTitle: 'Share Wedding Details',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }

  private async requestCameraPermissions(): Promise<void> {
    try {
      // Camera permissions are handled by Capacitor automatically
      // when first using the camera API
      console.log('Camera permissions will be requested on first use');
    } catch (error) {
      console.error('Camera permission request failed:', error);
    }
  }

  private async uploadPhotoWithContext(
    imagePath: string,
    context: { context: string; location: any; timestamp: string },
  ): Promise<{ url: string }> {
    try {
      // TODO: Implement actual upload logic with Supabase Storage
      // For now, return a mock URL
      const mockUrl = `https://wedsync.supabase.co/storage/v1/object/public/photos/${Date.now()}.jpg`;

      // In a real implementation, this would:
      // 1. Convert image to blob/file
      // 2. Upload to Supabase Storage
      // 3. Save metadata to database with context
      // 4. Return the public URL

      console.log('Photo uploaded with context:', context);
      return { url: mockUrl };
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw error;
    }
  }

  private sendTokenToServer(token: string): void {
    try {
      // TODO: Send push notification token to backend
      console.log('Push notification token received:', token);

      // In a real implementation, this would send the token to the backend
      // to store for the user so they can receive push notifications
      fetch('/api/push-notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Failed to send token to server:', error);
    }
  }

  private handlePushNotification(notification: any): void {
    try {
      console.log('Push notification received:', notification);

      // Handle different notification types
      if (notification.data?.type === 'timeline_update') {
        // Navigate to timeline if app is in foreground
        this.navigateToTimeline(notification.data.timelineId);
      } else if (notification.data?.type === 'client_message') {
        // Navigate to client communications
        this.navigateToClient(notification.data.clientId);
      }

      // Show toast notification
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast({
          title: notification.title,
          message: notification.body,
          type: 'info',
        });
      }
    } catch (error) {
      console.error('Push notification handling failed:', error);
    }
  }

  private navigateToClient(clientId: string): void {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = `/dashboard/clients/${clientId}`;
    }
  }

  private navigateToTimeline(timelineId: string): void {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = `/dashboard/timeline/${timelineId}`;
    }
  }

  private navigateToForm(formId: string): void {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = `/dashboard/forms/${formId}`;
    }
  }

  // Utility method to check if running in native app
  isNativeApp(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform()
    );
  }

  // Utility method to get platform
  getPlatform(): string {
    if (typeof window !== 'undefined' && window.Capacitor) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }
}
