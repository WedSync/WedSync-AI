// K6 Load Test: Wedding Photo Upload
// Tests photo upload and media management under heavy load

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { baseConfig, endpoints, generateWeddingData, authenticate, headers } from './k6-config.js';

// Custom metrics
const photoUploadTime = new Trend('photo_upload_time');
const bulkUploadTime = new Trend('bulk_upload_time');
const photoProcessingTime = new Trend('photo_processing_time');
const galleryLoadTime = new Trend('gallery_load_time');
const errorRate = new Rate('photo_upload_errors');

export let options = {
  ...baseConfig,
  tags: { test: 'wedding-photo-upload' },
  // Extended thresholds for file uploads
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 5 second timeout for uploads
    http_req_failed: ['rate<0.03'],    // 3% error rate acceptable for uploads
    photo_upload_time: ['p(95)<3000'], // 95% of uploads under 3 seconds
    bulk_upload_time: ['p(95)<10000'], // Bulk uploads under 10 seconds
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Generate test photo data (simulated binary data)
function generatePhotoData(size = 'medium') {
  const sizes = {
    small: 1024 * 100,    // 100KB
    medium: 1024 * 500,   // 500KB  
    large: 1024 * 2048,   // 2MB
    xlarge: 1024 * 5120,  // 5MB
  };
  
  const photoSize = sizes[size] || sizes.medium;
  return {
    filename: `wedding_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
    size: photoSize,
    data: 'x'.repeat(photoSize), // Simulated binary data
    mimeType: 'image/jpeg',
  };
}

export function setup() {
  console.log('Setting up wedding photo upload load test...');
  return {
    token: authenticate(http),
    weddings: Array.from({ length: 10 }, () => generateWeddingData()),
  };
}

export default function(data) {
  const { token, weddings } = data;
  const wedding = weddings[Math.floor(Math.random() * weddings.length)];
  
  const authHeaders = {
    ...headers,
    'Authorization': `Bearer ${token}`,
  };

  group('Single Photo Upload', () => {
    const photoSizes = ['small', 'medium', 'large'];
    const size = photoSizes[Math.floor(Math.random() * photoSizes.length)];
    const photo = generatePhotoData(size);
    
    group(`Upload ${size} photo`, () => {
      const formData = {
        weddingId: wedding.weddingId.toString(),
        category: ['ceremony', 'reception', 'preparation', 'candid'][Math.floor(Math.random() * 4)],
        description: 'Beautiful wedding moment',
        photographer: 'Wedding Photographer',
        file: http.file(photo.data, photo.filename, photo.mimeType),
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}${endpoints.photos}`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${token}` 
          },
          timeout: '30s',
        }
      );
      
      const uploadTime = Date.now() - startTime;
      photoUploadTime.add(uploadTime);
      
      const success = check(response, {
        'photo uploaded successfully': (r) => r.status === 201 || r.status === 200,
        [`${size} photo upload time acceptable`]: (r) => {
          const limits = { small: 2000, medium: 4000, large: 8000 };
          return r.timings.duration < limits[size];
        },
        'photo ID returned': (r) => {
          try {
            const data = r.json();
            return data.photoId || data.id;
          } catch (e) {
            return false;
          }
        },
        'photo metadata stored': (r) => {
          try {
            const data = r.json();
            return data.filename && data.size;
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });
  });

  group('Bulk Photo Upload', () => {
    // Simulate photographer uploading multiple photos after wedding
    group('Multiple Photo Upload', () => {
      const photoCount = Math.floor(Math.random() * 10) + 5; // 5-15 photos
      const photos = Array.from({ length: photoCount }, () => generatePhotoData('medium'));
      
      const formData = {
        weddingId: wedding.weddingId.toString(),
        category: 'reception',
        batch: 'true',
      };
      
      // Add each photo to form data
      photos.forEach((photo, index) => {
        formData[`file_${index}`] = http.file(photo.data, photo.filename, photo.mimeType);
      });
      
      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}${endpoints.photos}/bulk`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${token}` 
          },
          timeout: '60s',
        }
      );
      
      const bulkTime = Date.now() - startTime;
      bulkUploadTime.add(bulkTime);
      
      const success = check(response, {
        'bulk upload successful': (r) => r.status === 201 || r.status === 200,
        'bulk upload time reasonable': (r) => r.timings.duration < 30000, // 30 seconds
        'all photos processed': (r) => {
          try {
            const data = r.json();
            return data.uploaded >= photoCount * 0.9; // Allow 10% failure
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });
  });

  group('Photo Processing & Gallery', () => {
    // Photo gallery loading
    group('Gallery Load', () => {
      const startTime = Date.now();
      const response = http.get(
        `${BASE_URL}${endpoints.photos}/gallery/${wedding.weddingId}?page=1&limit=50`,
        { headers: authHeaders }
      );
      
      const loadTime = Date.now() - startTime;
      galleryLoadTime.add(loadTime);
      
      const success = check(response, {
        'gallery loaded successfully': (r) => r.status === 200,
        'gallery load time < 1000ms': (r) => r.timings.duration < 1000,
        'photos returned': (r) => {
          try {
            const data = r.json();
            return Array.isArray(data.photos);
          } catch (e) {
            return false;
          }
        },
        'thumbnails generated': (r) => {
          try {
            const data = r.json();
            return data.photos.some(p => p.thumbnail);
          } catch (e) {
            return false;
          }
        },
      });
      
      if (!success) errorRate.add(1);
      else errorRate.add(0);
    });

    // Photo processing status
    group('Photo Processing Status', () => {
      const response = http.get(
        `${BASE_URL}${endpoints.photos}/processing-status/${wedding.weddingId}`,
        { headers: authHeaders }
      );
      
      const processingTime = response.timings.duration;
      photoProcessingTime.add(processingTime);
      
      check(response, {
        'processing status retrieved': (r) => r.status === 200,
        'processing status time < 200ms': (r) => r.timings.duration < 200,
        'status includes progress': (r) => {
          try {
            const data = r.json();
            return typeof data.processed === 'number' && typeof data.total === 'number';
          } catch (e) {
            return false;
          }
        },
      });
    });

    // Photo tagging and metadata
    group('Photo Tagging', () => {
      const photoId = Math.floor(Math.random() * 1000) + 1;
      const tagData = {
        tags: ['bride', 'groom', 'ceremony', 'beautiful'],
        people: ['John Doe', 'Jane Smith'],
        location: 'Main altar',
        timestamp: wedding.date,
      };
      
      const response = http.put(
        `${BASE_URL}${endpoints.photos}/${photoId}/tags`,
        JSON.stringify(tagData),
        { headers: authHeaders }
      );
      
      check(response, {
        'photo tagged successfully': (r) => r.status === 200,
        'tagging time < 300ms': (r) => r.timings.duration < 300,
        'tags saved': (r) => r.status < 400,
      });
    });
  });

  group('Photo Sharing & Access', () => {
    // Generate sharing link
    group('Photo Sharing', () => {
      const shareData = {
        weddingId: wedding.weddingId,
        accessLevel: 'public',
        expiresIn: '7d',
        allowDownload: true,
      };
      
      const response = http.post(
        `${BASE_URL}${endpoints.photos}/share`,
        JSON.stringify(shareData),
        { headers: authHeaders }
      );
      
      check(response, {
        'sharing link created': (r) => r.status === 201 || r.status === 200,
        'sharing time < 200ms': (r) => r.timings.duration < 200,
        'share URL returned': (r) => {
          try {
            const data = r.json();
            return data.shareUrl && data.shareUrl.startsWith('http');
          } catch (e) {
            return false;
          }
        },
      });
    });

    // Guest photo access
    group('Guest Photo Access', () => {
      const guestToken = 'guest-access-token-' + Math.random().toString(36).substr(2, 9);
      const response = http.get(
        `${BASE_URL}${endpoints.photos}/guest-access/${wedding.weddingId}?token=${guestToken}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      check(response, {
        'guest access checked': (r) => r.status === 200 || r.status === 403,
        'access check time < 150ms': (r) => r.timings.duration < 150,
      });
    });
  });

  // Realistic photo upload patterns
  sleep(Math.random() * 5 + 2); // 2-7 second pause (photo uploads take time)
}

export function teardown(data) {
  console.log('Wedding photo upload load test completed');
  console.log(`Average single photo upload time: ${photoUploadTime.avg}ms`);
  console.log(`Average bulk upload time: ${bulkUploadTime.avg}ms`);
  console.log(`Average photo processing time: ${photoProcessingTime.avg}ms`);
  console.log(`Average gallery load time: ${galleryLoadTime.avg}ms`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}