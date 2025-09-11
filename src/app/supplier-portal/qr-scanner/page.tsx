'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  QrCode,
  FlashlightIcon as Flashlight,
  RotateCcw,
  X,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function QRScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment',
  );
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check camera permissions and capabilities
  useEffect(() => {
    checkCameraSupport();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const checkCameraSupport = async () => {
    try {
      if (
        !('mediaDevices' in navigator) ||
        !('getUserMedia' in navigator.mediaDevices)
      ) {
        setError('Camera not supported on this device');
        setHasPermission(false);
        return;
      }

      const permissions = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });
      if (permissions.state === 'denied') {
        setError('Camera permission denied');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);
    } catch (err) {
      console.error('Error checking camera support:', err);
      setError('Unable to access camera');
      setHasPermission(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setCameraActive(true);
      }

      // Start QR code detection
      startQRDetection();
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Unable to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setScanning(false);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
    await startCamera();
  };

  const toggleFlashlight = async () => {
    if (!stream) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if ('torch' in capabilities) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashlightOn } as any],
        });
        setFlashlightOn(!flashlightOn);
      }
    } catch (err) {
      console.error('Error toggling flashlight:', err);
    }
  };

  const startQRDetection = () => {
    // In a real implementation, you would use a QR code detection library like jsqr
    // For demonstration, we'll simulate QR code detection
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Here you would use a QR detection library
      // For now, we'll simulate detection after a delay
      setTimeout(() => {
        if (Math.random() > 0.7 && !scanResult) {
          const mockQRCode = 'wedsync://event/123456/confirm';
          handleQRCodeDetected(mockQRCode);
        }
      }, 2000);
    };

    // Run detection every 500ms
    const interval = setInterval(detectQR, 500);

    // Clean up interval when component unmounts or scanning stops
    return () => clearInterval(interval);
  };

  const handleQRCodeDetected = async (qrData: string) => {
    setScanResult(qrData);
    setScanning(false);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Process the QR code data
    await processQRCode(qrData);
  };

  const processQRCode = async (qrData: string) => {
    try {
      // Parse WedSync QR codes
      if (qrData.startsWith('wedsync://')) {
        const url = new URL(qrData);
        const path = url.pathname;

        if (path.includes('/event/')) {
          // Event confirmation QR code
          const eventId = path.split('/')[2];
          const action = path.split('/')[3];

          if (action === 'confirm') {
            router.push(`/supplier-portal/schedule/events/${eventId}/confirm`);
            return;
          }
        }

        if (path.includes('/venue/')) {
          // Venue check-in QR code
          const venueId = path.split('/')[2];
          router.push(`/supplier-portal/checkin/${venueId}`);
          return;
        }
      }

      // Handle other QR code formats
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        // Web URL - open in browser or process if WedSync URL
        window.open(qrData, '_blank');
        return;
      }

      // Show raw QR data
      alert(`QR Code Scanned: ${qrData}`);
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError('Invalid QR code format');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create image element to process the uploaded image
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);

          // Here you would process the image for QR codes
          // For demo, simulate finding a QR code
          setTimeout(() => {
            const mockQRCode = 'wedsync://event/uploaded/confirm';
            handleQRCodeDetected(mockQRCode);
          }, 1000);
        }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setScanning(false);
    if (!cameraActive) {
      startCamera();
    }
  };

  if (hasPermission === false) {
    return (
      <div className="space-y-4 py-4">
        <Card className="p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Camera Access Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please allow camera access to scan QR codes.
          </p>
          <div className="space-y-2">
            <Button onClick={checkCameraSupport}>Retry Camera Access</Button>
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload QR Code Image
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (scanResult) {
    return (
      <div className="space-y-4 py-4">
        <Card className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            QR Code Scanned!
          </h2>
          <div className="bg-gray-100 p-4 rounded-lg mb-4 font-mono text-sm break-all">
            {scanResult}
          </div>
          <div className="space-y-2">
            <Button onClick={() => processQRCode(scanResult)}>
              Process QR Code
            </Button>
            <Button variant="outline" onClick={resetScanner}>
              Scan Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">QR Scanner</h1>
            <p className="text-sm text-gray-600">
              Scan event QR codes for quick access
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/supplier-portal')}
            className="h-10 w-10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </Card>

      {/* Camera View */}
      <Card className="p-4">
        <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <QrCode className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-center mb-4">
                {scanning ? 'Starting camera...' : 'Ready to scan QR codes'}
              </p>
              {!scanning && (
                <Button onClick={startCamera}>
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            className={cn(
              'w-full h-full object-cover',
              !cameraActive && 'hidden',
            )}
            playsInline
            muted
          />

          {/* Scanning overlay */}
          {cameraActive && (
            <div className="absolute inset-0">
              {/* Scanning frame */}
              <div className="absolute inset-8 border-2 border-white rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pink-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pink-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pink-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pink-500 rounded-br-lg" />

                {/* Scanning line */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-pink-500 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full inline-block">
                  {scanning
                    ? 'Scanning for QR codes...'
                    : 'Position QR code in frame'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        {cameraActive && (
          <div className="flex justify-center space-x-4 mt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFlashlight}
              className={cn(
                'h-12 w-12',
                flashlightOn && 'bg-yellow-100 border-yellow-300',
              )}
            >
              <Flashlight
                className={cn(
                  'w-5 h-5',
                  flashlightOn ? 'text-yellow-600' : 'text-gray-600',
                )}
              />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={switchCamera}
              className="h-12 w-12"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              onClick={stopCamera}
              className="h-12 px-6"
            >
              Stop Camera
            </Button>
          </div>
        )}

        {/* Alternative upload option */}
        <div className="mt-4 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="text-pink-600"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Upload QR Code Image
          </Button>
        </div>
      </Card>

      {/* Hidden canvas for QR detection */}
      <canvas ref={canvasRef} className="hidden" width="640" height="480" />

      {/* Instructions */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 mb-2">How to use:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Point your camera at a QR code</li>
          <li>• Keep the code within the scanning frame</li>
          <li>• Hold steady until the code is detected</li>
          <li>• Upload an image if camera doesn't work</li>
        </ul>
      </Card>
    </div>
  );
}
