'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  onGenerated?: (dataUrl: string) => void;
  'data-testid'?: string;
}

export function QRCodeDisplay({
  value,
  size = 128,
  className,
  onGenerated,
  'data-testid': testId,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const generateQRCode = async () => {
      if (!canvasRef.current || !value) return;

      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import of QR code library
        const QRCode = await import('qrcode');

        if (!mounted) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas size
        canvas.width = size;
        canvas.height = size;

        // Generate QR code
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#101828', // Using gray-900 from design system
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });

        // Generate data URL for download
        if (onGenerated) {
          const dataUrl = canvas.toDataURL('image/png');
          onGenerated(dataUrl);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('QR Code generation failed:', err);
        if (mounted) {
          setError('Failed to generate QR code');
          setIsLoading(false);
        }
      }
    };

    generateQRCode();

    return () => {
      mounted = false;
    };
  }, [value, size, onGenerated]);

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 border-2 border-red-200 rounded-lg text-red-600 text-sm',
          className,
        )}
        style={{ width: size, height: size }}
        data-testid={testId}
      >
        <div className="text-center">
          <div className="text-xs">QR Error</div>
          <div className="text-xs opacity-70">Try again</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 border-2 border-gray-200 rounded-lg animate-pulse',
          className,
        )}
        style={{ width: size, height: size }}
        data-testid={testId}
      >
        <div className="text-gray-400 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto mb-2"></div>
          <div className="text-xs">Generating QR</div>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('border-0 rounded-lg', className)}
      data-testid={testId}
      aria-label={`QR code for ${value}`}
      role="img"
    />
  );
}
