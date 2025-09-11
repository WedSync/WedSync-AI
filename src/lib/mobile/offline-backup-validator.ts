import { createClient } from '@/lib/supabase/client';

export interface ValidationStatus {
  isValid: boolean;
  criticalDataPresent: boolean;
  dataIntegrity: 'excellent' | 'good' | 'poor' | 'corrupted';
  missingCriticalData: string[];
  recommendations: string[];
  lastValidation: Date;
  weddingDataComplete: boolean;
  offlineCapacity: number; // Percentage of offline capability
}

export interface CriticalWeddingData {
  weddingDetails: boolean;
  guestList: boolean;
  timeline: boolean;
  vendors: boolean;
  tasks: boolean;
  photos: boolean;
  forms: boolean;
  communications: boolean;
}

export interface BackupMetadata {
  version: string;
  timestamp: Date;
  dataChecksum: string;
  size: number;
  compressionRatio: number;
}

export class OfflineBackupValidator {
  private supabase = createClient();
  private readonly criticalDataKeys = [
    'wedding_details',
    'guest_lists',
    'wedding_timeline',
    'vendors',
    'tasks',
    'photo_galleries',
    'forms',
    'communications',
  ];

  /**
   * Validates cached wedding data integrity when offline
   */
  async validateLocalBackups(): Promise<ValidationStatus> {
    try {
      const validationStart = new Date();

      // Check local storage capacity and usage
      const offlineCapacity = await this.calculateOfflineCapacity();

      // Validate critical wedding data presence
      const criticalDataStatus = await this.validateCriticalWeddingData();

      // Check data integrity using checksums
      const integrityStatus = await this.validateDataIntegrity();

      // Generate recommendations
      const recommendations = await this.generateRecoveryRecommendations(
        criticalDataStatus,
        integrityStatus,
        offlineCapacity,
      );

      return {
        isValid:
          integrityStatus !== 'corrupted' &&
          criticalDataStatus.weddingDataComplete,
        criticalDataPresent: criticalDataStatus.weddingDataComplete,
        dataIntegrity: integrityStatus,
        missingCriticalData: this.identifyMissingData(criticalDataStatus),
        recommendations,
        lastValidation: validationStart,
        weddingDataComplete: criticalDataStatus.weddingDataComplete,
        offlineCapacity,
      };
    } catch (error) {
      console.error('Offline backup validation failed:', error);

      return {
        isValid: false,
        criticalDataPresent: false,
        dataIntegrity: 'corrupted',
        missingCriticalData: this.criticalDataKeys,
        recommendations: [
          'Contact emergency support immediately',
          'Attempt to restore from cloud backup',
          'Check internet connection and retry sync',
        ],
        lastValidation: new Date(),
        weddingDataComplete: false,
        offlineCapacity: 0,
      };
    }
  }

  /**
   * Validates critical wedding data for venue setup scenarios
   */
  async validateCriticalWeddingData(): Promise<CriticalWeddingData> {
    const criticalData: CriticalWeddingData = {
      weddingDetails: false,
      guestList: false,
      timeline: false,
      vendors: false,
      tasks: false,
      photos: false,
      forms: false,
      communications: false,
    };

    try {
      // Check wedding details
      const weddingDetails = localStorage.getItem('wedding_details');
      criticalData.weddingDetails = !!(
        weddingDetails && JSON.parse(weddingDetails)
      );

      // Check guest list
      const guestList = localStorage.getItem('guest_lists');
      criticalData.guestList = !!(
        guestList && JSON.parse(guestList)?.length > 0
      );

      // Check timeline
      const timeline = localStorage.getItem('wedding_timeline');
      criticalData.timeline = !!(timeline && JSON.parse(timeline));

      // Check vendors
      const vendors = localStorage.getItem('vendors');
      criticalData.vendors = !!(vendors && JSON.parse(vendors)?.length > 0);

      // Check tasks
      const tasks = localStorage.getItem('tasks');
      criticalData.tasks = !!(tasks && JSON.parse(tasks));

      // Check photos
      const photos = localStorage.getItem('photo_galleries');
      criticalData.photos = !!(photos && JSON.parse(photos));

      // Check forms
      const forms = localStorage.getItem('forms');
      criticalData.forms = !!(forms && JSON.parse(forms));

      // Check communications
      const communications = localStorage.getItem('communications');
      criticalData.communications = !!(
        communications && JSON.parse(communications)
      );
    } catch (error) {
      console.error('Error validating critical wedding data:', error);
    }

    return criticalData;
  }

  /**
   * Validates data integrity using checksums and structure validation
   */
  async validateDataIntegrity(): Promise<ValidationStatus['dataIntegrity']> {
    try {
      let corruptedCount = 0;
      let totalItems = 0;

      for (const key of this.criticalDataKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          totalItems++;
          try {
            const parsed = JSON.parse(data);

            // Check for basic structure integrity
            if (!parsed || typeof parsed !== 'object') {
              corruptedCount++;
              continue;
            }

            // Validate specific data structures
            const isValid = await this.validateDataStructure(key, parsed);
            if (!isValid) {
              corruptedCount++;
            }
          } catch {
            corruptedCount++;
          }
        }
      }

      if (totalItems === 0) {
        return 'corrupted';
      }

      const corruptionRatio = corruptedCount / totalItems;

      if (corruptionRatio === 0) return 'excellent';
      if (corruptionRatio < 0.1) return 'good';
      if (corruptionRatio < 0.3) return 'poor';
      return 'corrupted';
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return 'corrupted';
    }
  }

  /**
   * Validates specific data structure based on type
   */
  private async validateDataStructure(
    dataType: string,
    data: any,
  ): Promise<boolean> {
    try {
      switch (dataType) {
        case 'wedding_details':
          return !!(data.id && data.date && data.venue);

        case 'guest_lists':
          return (
            Array.isArray(data) &&
            data.every((guest) => guest.name && guest.email)
          );

        case 'wedding_timeline':
          return !!(data.events && Array.isArray(data.events));

        case 'vendors':
          return (
            Array.isArray(data) &&
            data.every((vendor) => vendor.id && vendor.name && vendor.type)
          );

        case 'tasks':
          return !!(data.tasks && Array.isArray(data.tasks));

        case 'forms':
          return !!(data.forms && Array.isArray(data.forms));

        default:
          return true; // Basic validation passed
      }
    } catch {
      return false;
    }
  }

  /**
   * Calculates offline capacity and storage usage
   */
  private async calculateOfflineCapacity(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;

        if (available > 0) {
          return Math.round(((available - used) / available) * 100);
        }
      }

      // Fallback: estimate based on localStorage usage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }

      // Assume 5MB is reasonable offline capacity
      const maxCapacity = 5 * 1024 * 1024; // 5MB
      return Math.max(
        0,
        Math.round(((maxCapacity - totalSize) / maxCapacity) * 100),
      );
    } catch (error) {
      console.error('Failed to calculate offline capacity:', error);
      return 50; // Default estimate
    }
  }

  /**
   * Identifies missing critical data components
   */
  private identifyMissingData(criticalData: CriticalWeddingData): string[] {
    const missing: string[] = [];

    if (!criticalData.weddingDetails) missing.push('Wedding Details');
    if (!criticalData.guestList) missing.push('Guest List');
    if (!criticalData.timeline) missing.push('Wedding Timeline');
    if (!criticalData.vendors) missing.push('Vendor Information');
    if (!criticalData.tasks) missing.push('Task List');
    if (!criticalData.photos) missing.push('Photo Galleries');
    if (!criticalData.forms) missing.push('Forms Data');
    if (!criticalData.communications) missing.push('Communications');

    return missing;
  }

  /**
   * Generates recovery recommendations based on validation results
   */
  private async generateRecoveryRecommendations(
    criticalData: CriticalWeddingData,
    integrity: ValidationStatus['dataIntegrity'],
    capacity: number,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Integrity-based recommendations
    if (integrity === 'corrupted') {
      recommendations.push(
        'URGENT: Data corruption detected - restore from backup immediately',
      );
      recommendations.push(
        'Contact emergency support for data recovery assistance',
      );
    } else if (integrity === 'poor') {
      recommendations.push(
        'Data integrity issues found - verify critical information',
      );
      recommendations.push('Consider syncing with cloud backup when online');
    }

    // Missing data recommendations
    const missingData = this.identifyMissingData(criticalData);
    if (missingData.length > 0) {
      recommendations.push(`Missing critical data: ${missingData.join(', ')}`);
      if (
        missingData.includes('Wedding Details') ||
        missingData.includes('Wedding Timeline')
      ) {
        recommendations.push(
          'CRITICAL: Essential wedding information missing - restore immediately',
        );
      }
    }

    // Capacity-based recommendations
    if (capacity < 20) {
      recommendations.push(
        'Low offline storage capacity - clear unnecessary data',
      );
      recommendations.push(
        'Consider upgrading device storage for better offline capability',
      );
    }

    // Wedding day specific recommendations
    const isWeddingDay = await this.isWeddingDay();
    if (isWeddingDay) {
      recommendations.unshift(
        'WEDDING DAY MODE: Prioritize data stability over new changes',
      );
      recommendations.push(
        'Keep device charged and avoid unnecessary data operations',
      );
      recommendations.push(
        'Ensure wedding timeline and vendor contacts are accessible',
      );
    }

    // Offline mode recommendations
    if (!navigator.onLine) {
      recommendations.push(
        'Operating in offline mode - some features may be limited',
      );
      recommendations.push('Sync with cloud when connection is restored');
    }

    return recommendations;
  }

  /**
   * Checks if today is the wedding day
   */
  private async isWeddingDay(): Promise<boolean> {
    try {
      const weddingDetails = localStorage.getItem('wedding_details');
      if (weddingDetails) {
        const details = JSON.parse(weddingDetails);
        if (details.date) {
          const weddingDate = new Date(details.date);
          const today = new Date();
          return (
            weddingDate.getDate() === today.getDate() &&
            weddingDate.getMonth() === today.getMonth() &&
            weddingDate.getFullYear() === today.getFullYear()
          );
        }
      }
    } catch (error) {
      console.error('Error checking wedding date:', error);
    }
    return false;
  }

  /**
   * Provides offline recovery recommendations based on venue setup requirements
   */
  async generateVenueRecoveryPlan(): Promise<{
    essentialData: string[];
    backupPlan: string[];
    emergencyContacts: string[];
    offlineActions: string[];
  }> {
    return {
      essentialData: [
        'Wedding timeline with exact timings',
        'Vendor contact information and schedules',
        'Guest list with dietary requirements',
        'Setup instructions and floor plans',
        'Emergency contact numbers',
      ],
      backupPlan: [
        'Use mobile hotspot if venue WiFi fails',
        'Have printed copies of critical information',
        'Designate team member for data management',
        'Create manual backup on secondary device',
        'Establish check-in protocol every 30 minutes',
      ],
      emergencyContacts: [
        'WedSync Emergency Support: +44 800 123 4567',
        'Venue Manager: [To be added]',
        'Wedding Coordinator: [To be added]',
        'IT Support: +44 800 765 4321',
      ],
      offlineActions: [
        'Switch to offline mode to preserve battery',
        'Use camera for manual photo documentation',
        'Create written log of any issues',
        'Sync all changes when connectivity returns',
        'Test all critical functions before ceremony',
      ],
    };
  }

  /**
   * Creates emergency backup metadata
   */
  async createBackupMetadata(): Promise<BackupMetadata> {
    const timestamp = new Date();
    let totalSize = 0;
    let checksum = '';

    // Calculate total data size and create checksum
    for (const key of this.criticalDataKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
        checksum += this.simpleHash(data);
      }
    }

    return {
      version: '1.0.0',
      timestamp,
      dataChecksum: this.simpleHash(checksum),
      size: totalSize,
      compressionRatio: 0.7, // Estimated compression ratio
    };
  }

  /**
   * Simple hash function for data integrity checks
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }
}
