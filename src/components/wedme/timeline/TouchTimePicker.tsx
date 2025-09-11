'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useTouch';
import { Clock, Check, X } from 'lucide-react';

interface TouchTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onTimeSelect: (time: { hours: number; minutes: number }) => void;
  initialTime?: { hours: number; minutes: number };
  title?: string;
  className?: string;
}

interface TouchDurationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onDurationSelect: (minutes: number) => void;
  initialDuration?: number;
  title?: string;
  className?: string;
}

// Touch-friendly time picker component
export function TouchTimePicker({
  isOpen,
  onClose,
  onTimeSelect,
  initialTime = { hours: 12, minutes: 0 },
  title = 'Select Time',
  className,
}: TouchTimePickerProps) {
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [isAM, setIsAM] = useState(initialTime.hours < 12);
  const haptic = useHaptic();

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Convert 24h to 12h format for display
  const displayHours =
    selectedTime.hours === 0
      ? 12
      : selectedTime.hours > 12
        ? selectedTime.hours - 12
        : selectedTime.hours;

  const handleTimeChange = (hours: number, minutes: number) => {
    // Convert back to 24h format
    let finalHours = hours;
    if (!isAM && hours !== 12) finalHours += 12;
    if (isAM && hours === 12) finalHours = 0;

    setSelectedTime({ hours: finalHours, minutes });
    haptic.light();
  };

  const handleConfirm = () => {
    onTimeSelect(selectedTime);
    haptic.success();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          'w-full max-w-sm bg-white rounded-3xl shadow-xl mx-4',
          className,
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-2xl font-mono">
            <Clock className="w-5 h-5 text-gray-500" />
            {String(displayHours).padStart(2, '0')}:
            {String(selectedTime.minutes).padStart(2, '0')} {isAM ? 'AM' : 'PM'}
          </div>
        </div>

        {/* Time Picker */}
        <div className="p-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Hours */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Hour</div>
              <div
                ref={hoursRef}
                className="w-20 h-32 overflow-hidden relative bg-gray-50 rounded-xl"
              >
                <div className="absolute inset-x-0 top-1/2 h-12 -mt-6 border-y-2 border-purple-200 bg-purple-50/50" />
                <div className="flex flex-col items-center py-8 space-y-2">
                  {[...Array(12)].map((_, i) => {
                    const hour = i + 1;
                    const isSelected = hour === displayHours;

                    return (
                      <button
                        key={hour}
                        onClick={() =>
                          handleTimeChange(hour, selectedTime.minutes)
                        }
                        className={cn(
                          'w-12 h-12 rounded-lg flex items-center justify-center font-semibold transition-all',
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100',
                        )}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-300">:</div>

            {/* Minutes */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Minute</div>
              <div
                ref={minutesRef}
                className="w-20 h-32 overflow-hidden relative bg-gray-50 rounded-xl"
              >
                <div className="absolute inset-x-0 top-1/2 h-12 -mt-6 border-y-2 border-purple-200 bg-purple-50/50" />
                <div className="flex flex-col items-center py-8 space-y-2">
                  {[0, 15, 30, 45].map((minute) => {
                    const isSelected = minute === selectedTime.minutes;

                    return (
                      <button
                        key={minute}
                        onClick={() => handleTimeChange(displayHours, minute)}
                        className={cn(
                          'w-12 h-12 rounded-lg flex items-center justify-center font-semibold transition-all',
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100',
                        )}
                      >
                        {String(minute).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AM/PM */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Period</div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsAM(true);
                    haptic.light();
                  }}
                  className={cn(
                    'w-16 h-12 rounded-lg font-semibold transition-all',
                    isAM
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                  )}
                >
                  AM
                </button>
                <button
                  onClick={() => {
                    setIsAM(false);
                    haptic.light();
                  }}
                  className={cn(
                    'w-16 h-12 rounded-lg font-semibold transition-all',
                    !isAM
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Time Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: '9:00 AM', time: { hours: 9, minutes: 0 } },
              { label: '12:00 PM', time: { hours: 12, minutes: 0 } },
              { label: '6:00 PM', time: { hours: 18, minutes: 0 } },
              { label: '10:00 AM', time: { hours: 10, minutes: 0 } },
              { label: '3:00 PM', time: { hours: 15, minutes: 0 } },
              { label: '8:00 PM', time: { hours: 20, minutes: 0 } },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setSelectedTime(preset.time);
                  setIsAM(preset.time.hours < 12);
                  haptic.light();
                }}
                className="py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium min-h-[48px] flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium min-h-[48px] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Touch-friendly duration picker component
export function TouchDurationPicker({
  isOpen,
  onClose,
  onDurationSelect,
  initialDuration = 60,
  title = 'Select Duration',
  className,
}: TouchDurationPickerProps) {
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const haptic = useHaptic();

  const hours = Math.floor(selectedDuration / 60);
  const minutes = selectedDuration % 60;

  const handleDurationChange = (newHours: number, newMinutes: number) => {
    const totalMinutes = newHours * 60 + newMinutes;
    setSelectedDuration(totalMinutes);
    haptic.light();
  };

  const handleConfirm = () => {
    onDurationSelect(selectedDuration);
    haptic.success();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          'w-full max-w-sm bg-white rounded-3xl shadow-xl mx-4',
          className,
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-2xl font-mono">
            <Clock className="w-5 h-5 text-gray-500" />
            {hours > 0 && `${hours}h `}
            {minutes}m
          </div>
        </div>

        {/* Duration Picker */}
        <div className="p-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Hours */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-3">Hours</div>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map((hour) => {
                  const isSelected = hour === hours;

                  return (
                    <button
                      key={hour}
                      onClick={() => handleDurationChange(hour, minutes)}
                      className={cn(
                        'w-14 h-12 rounded-lg font-semibold transition-all',
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-3">Minutes</div>
              <div className="space-y-2">
                {[0, 15, 30, 45].map((minute) => {
                  const isSelected = minute === minutes;

                  return (
                    <button
                      key={minute}
                      onClick={() => handleDurationChange(hours, minute)}
                      className={cn(
                        'w-14 h-12 rounded-lg font-semibold transition-all',
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {String(minute).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: '30 min', duration: 30 },
              { label: '1 hour', duration: 60 },
              { label: '1.5 hours', duration: 90 },
              { label: '2 hours', duration: 120 },
              { label: '3 hours', duration: 180 },
              { label: '4 hours', duration: 240 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setSelectedDuration(preset.duration);
                  haptic.light();
                }}
                className={cn(
                  'py-2 px-3 text-sm rounded-lg transition-colors',
                  selectedDuration === preset.duration
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-2">
              Or enter custom duration:
            </div>
            <input
              type="number"
              placeholder="Minutes"
              value={selectedDuration}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setSelectedDuration(Math.max(5, Math.min(720, value))); // 5 min to 12 hours
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-mono"
              min="5"
              max="720"
              step="5"
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              Between 5 minutes and 12 hours
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium min-h-[48px] flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium min-h-[48px] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
