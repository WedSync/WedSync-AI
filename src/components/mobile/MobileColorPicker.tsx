'use client';

import { useState, useRef, useEffect } from 'react';
import { usePinchZoom, useTouch, useHaptic } from '@/hooks/useTouch';

interface MobileColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  showHistory?: boolean;
}

export function MobileColorPicker({
  value = '#FF69B4',
  onChange,
  disabled = false,
  showHistory = true,
}: MobileColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [colorHistory, setColorHistory] = useState<string[]>([]);

  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { light: lightHaptic, success: successHaptic } = useHaptic();

  // Pinch-to-zoom for precise color selection
  const { scale, handlers: pinchHandlers } = usePinchZoom({
    minScale: 1,
    maxScale: 3,
    onPinch: (newScale) => {
      console.log('Pinch scale:', newScale);
    },
  });

  // Touch handling for color picker canvas
  const { handlers: touchHandlers } = useTouch();

  // Update HSL values when value prop changes
  useEffect(() => {
    const hsl = hexToHsl(value);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  }, [value]);

  // Draw color picker canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = (canvas.width = 300);
      const height = (canvas.height = 200);

      // Create saturation/lightness gradient
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const sat = (x / width) * 100;
          const light = 100 - (y / height) * 100;
          const color = `hsl(${hue}, ${sat}%, ${light}%)`;

          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw current selection indicator
      const currentX = (saturation / 100) * width;
      const currentY = ((100 - lightness) / 100) * height;

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }, [isOpen, hue, saturation, lightness]);

  const handleCanvasTouch = (e: React.TouchEvent) => {
    if (isOpen && canvasRef.current) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Convert touch position to color values
      const newSaturation = Math.min(100, Math.max(0, (x / rect.width) * 100));
      const newLightness = Math.min(
        100,
        Math.max(0, 100 - (y / rect.height) * 100),
      );

      setSaturation(newSaturation);
      setLightness(newLightness);

      const newColor = hslToHex(hue, newSaturation, newLightness);
      onChange(newColor);

      // Haptic feedback for color selection
      lightHaptic();
    }
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
    if (!colorHistory.includes(color)) {
      setColorHistory((prev) => [color, ...prev.slice(0, 9)]); // Keep last 10 colors
    }
    setIsOpen(false);
    successHaptic();
  };

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    onChange(hslToHex(newHue, saturation, lightness));
    lightHaptic();
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r:
          h = (g - b) / diff + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  return (
    <div className="mobile-color-picker">
      {/* Color Preview Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-12 rounded-lg border-2 border-gray-300 touch-manipulation active:scale-95 transition-transform"
        style={{ backgroundColor: value, touchAction: 'manipulation' }}
        aria-label={`Selected color: ${value}`}
      >
        <span className="sr-only">Color: {value}</span>
      </button>

      {/* Mobile Color Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose Color</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                ×
              </button>
            </div>

            {/* Hue Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueChange(parseInt(e.target.value))}
                className="w-full h-8 rounded-lg appearance-none touch-manipulation"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                    hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                    hsl(360, 100%, 50%))`,
                  touchAction: 'manipulation',
                }}
              />
            </div>

            {/* Color Canvas */}
            <div
              ref={pickerRef}
              className="mb-4 border rounded-lg overflow-hidden"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center',
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-48 cursor-crosshair touch-manipulation"
                onTouchStart={handleCanvasTouch}
                onTouchMove={handleCanvasTouch}
                {...pinchHandlers}
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Current Color Display */}
            <div className="flex items-center mb-4">
              <div
                className="w-12 h-12 rounded-lg border mr-3"
                style={{ backgroundColor: value }}
              />
              <div>
                <div className="font-mono text-sm">{value}</div>
                <div className="text-xs text-gray-500">
                  HSL({hue}, {saturation}%, {lightness}%)
                </div>
              </div>
            </div>

            {/* Color History */}
            {showHistory && colorHistory.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Recent Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorHistory.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => handleColorSelect(color)}
                      className="w-8 h-8 rounded border touch-manipulation active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
                      style={{
                        backgroundColor: color,
                        touchAction: 'manipulation',
                      }}
                      aria-label={`Recent color: ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-gray-50"
                style={{ touchAction: 'manipulation' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleColorSelect(value);
                }}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-blue-600"
                style={{ touchAction: 'manipulation' }}
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
