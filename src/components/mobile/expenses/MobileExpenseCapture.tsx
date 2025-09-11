/**
 * WS-164: Mobile Expense Capture
 * Complete expense tracking with camera and voice integration
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/supabase-js';
import {
  Camera,
  Mic,
  MicOff,
  FlashOn,
  FlashOff,
  RotateCcw,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  Trash2,
  DollarSign,
  MapPin,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  RefreshCw,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  cameraManager,
  CapturedPhoto,
  ReceiptData,
} from '@/lib/mobile/camera-manager';
import {
  voiceManager,
  ParsedExpense,
  VoiceRecognitionResult,
} from '@/lib/mobile/voice-manager';
import { notificationManager } from '@/lib/mobile/notification-manager';

interface ExpenseData {
  id?: string;
  amount: number;
  vendor: string;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  receiptUrl?: string;
  location?: string;
  tags?: string[];
  createdBy: string;
  weddingId?: string;
}

interface MobileExpenseCaptureProps {
  userId: string;
  weddingId?: string;
  onExpenseCreated?: (expense: ExpenseData) => void;
  onCancel?: () => void;
}

export default function MobileExpenseCapture({
  userId,
  weddingId,
  onExpenseCreated,
  onCancel,
}: MobileExpenseCaptureProps) {
  const [captureMode, setCaptureMode] = useState<'camera' | 'voice' | 'manual'>(
    'camera',
  );
  const [currentStep, setCurrentStep] = useState<
    'capture' | 'review' | 'edit' | 'saving'
  >('capture');

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(
    null,
  );
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [processingReceipt, setProcessingReceipt] = useState(false);

  // Voice state
  const [voiceReady, setVoiceReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(
    null,
  );

  // Expense form state
  const [expenseData, setExpenseData] = useState<ExpenseData>({
    amount: 0,
    vendor: '',
    category: 'Miscellaneous',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Credit Card',
    createdBy: userId,
    weddingId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClientComponentClient();

  // Categories for wedding expenses
  const categories = [
    'Venue & Location',
    'Food & Catering',
    'Photography',
    'Music & Entertainment',
    'Attire',
    'Beauty',
    'Transportation',
    'Flowers & Decor',
    'Stationery',
    'Gifts',
    'Miscellaneous',
  ];

  const paymentMethods = [
    'Credit Card',
    'Debit Card',
    'Cash',
    'Check',
    'Venmo',
    'PayPal',
    'Apple Pay',
    'Google Pay',
    'Bank Transfer',
  ];

  // Initialize camera and voice systems
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        // Initialize camera
        const cameraInitialized = await cameraManager.initialize();
        setCameraReady(cameraInitialized);

        // Initialize voice
        const voiceInitialized = await voiceManager.initialize();
        setVoiceReady(voiceInitialized);

        // Set up voice callbacks
        voiceManager.setResultCallback(handleVoiceResult);
        voiceManager.setErrorCallback(handleVoiceError);
      } catch (error) {
        console.error('[ExpenseCapture] Initialization failed:', error);
      }
    };

    initializeSystems();

    return () => {
      // Cleanup
      cameraManager.cleanup();
      voiceManager.cleanup();
    };
  }, []);

  // Start camera when switching to camera mode
  useEffect(() => {
    if (captureMode === 'camera' && cameraReady && videoRef.current) {
      startCamera();
    }
  }, [captureMode, cameraReady]);

  // Start camera
  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const success = await cameraManager.startCamera(videoRef.current, {
        facingMode: 'environment',
        width: 1920,
        height: 1080,
      });

      if (!success) {
        console.error('Failed to start camera');
      }
    } catch (error) {
      console.error('[ExpenseCapture] Camera start failed:', error);
    }
  };

  // Handle camera photo capture
  const handleCameraCapture = async () => {
    try {
      setProcessingReceipt(true);

      const photo = await cameraManager.capturePhoto();
      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      setCapturedPhoto(photo);

      // Process receipt with OCR
      const receiptResult = await cameraManager.processReceipt(photo, userId);
      setReceiptData(receiptResult);

      // Pre-fill expense data with OCR results
      if (
        receiptResult.ocrResult.success &&
        receiptResult.ocrResult.detectedFields
      ) {
        const fields = receiptResult.ocrResult.detectedFields;
        setExpenseData((prev) => ({
          ...prev,
          amount: fields.amount || prev.amount,
          vendor: fields.vendor || prev.vendor,
          category: fields.category || prev.category,
          date: fields.date || prev.date,
          description:
            receiptResult.ocrResult.extractedText.substring(0, 100) ||
            prev.description,
        }));
      }

      setCurrentStep('review');
    } catch (error) {
      console.error('[ExpenseCapture] Photo capture failed:', error);
    } finally {
      setProcessingReceipt(false);
    }
  };

  // Handle voice recording
  const handleVoiceToggle = async () => {
    if (!voiceReady) return;

    try {
      if (isRecording) {
        // Stop recording
        const parsedResult = await voiceManager.stopRecording();
        setIsRecording(false);

        if (parsedResult) {
          setParsedExpense(parsedResult);

          // Pre-fill expense data with voice results
          setExpenseData((prev) => ({
            ...prev,
            amount: parsedResult.amount || prev.amount,
            vendor: parsedResult.vendor || prev.vendor,
            category: parsedResult.category || prev.category,
            description: parsedResult.description || prev.description,
            date: parsedResult.date || prev.date,
            paymentMethod: parsedResult.paymentMethod || prev.paymentMethod,
          }));

          setCurrentStep('review');
        }
      } else {
        // Start recording
        const sessionId = await voiceManager.startExpenseRecording(userId);
        if (sessionId) {
          setIsRecording(true);
          setVoiceTranscript('');
        }
      }
    } catch (error) {
      console.error('[ExpenseCapture] Voice recording failed:', error);
      setIsRecording(false);
    }
  };

  // Handle voice results
  const handleVoiceResult = useCallback((result: VoiceRecognitionResult) => {
    setVoiceTranscript((prev) => {
      if (result.isFinal) {
        return prev + result.transcript + ' ';
      } else {
        // Show interim results
        return prev + result.transcript;
      }
    });
  }, []);

  // Handle voice errors
  const handleVoiceError = useCallback((error: string) => {
    console.error('[ExpenseCapture] Voice error:', error);
    setIsRecording(false);
  }, []);

  // Toggle camera flash
  const handleFlashToggle = async () => {
    const success = await cameraManager.toggleFlash();
    if (success) {
      setFlashEnabled(!flashEnabled);
    }
  };

  // Switch camera
  const handleCameraSwitch = async () => {
    await cameraManager.toggleCamera();
  };

  // Validate expense data
  const validateExpenseData = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!expenseData.amount || expenseData.amount <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }

    if (!expenseData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    if (!expenseData.category) {
      newErrors.category = 'Category is required';
    }

    if (!expenseData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save expense
  const handleSaveExpense = async () => {
    if (!validateExpenseData()) return;

    try {
      setLoading(true);
      setCurrentStep('saving');

      let receiptUrl: string | undefined;

      // Upload receipt photo if available
      if (capturedPhoto) {
        const fileName = `receipts/${userId}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(fileName, capturedPhoto.blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('Receipt upload failed:', uploadError);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from('expense-receipts').getPublicUrl(fileName);
          receiptUrl = publicUrl;
        }
      }

      // Create expense record
      const expenseToSave = {
        ...expenseData,
        receipt_url: receiptUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: savedExpense, error: saveError } = await supabase
        .from('expenses')
        .insert([expenseToSave])
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Send success notification
      await notificationManager.sendExpenseNotification({
        userId,
        expenseId: savedExpense.id,
        amount: expenseData.amount,
        vendor: expenseData.vendor,
        category: expenseData.category,
        type: 'expense_captured',
        status: 'success',
      });

      // Callback to parent component
      if (onExpenseCreated) {
        onExpenseCreated({
          ...expenseData,
          id: savedExpense.id,
          receiptUrl,
        });
      }
    } catch (error) {
      console.error('[ExpenseCapture] Save failed:', error);

      // Send failure notification
      await notificationManager.sendExpenseNotification({
        userId,
        expenseId: 'temp',
        amount: expenseData.amount,
        vendor: expenseData.vendor,
        category: expenseData.category,
        type: 'expense_captured',
        status: 'error',
      });

      setCurrentStep('edit');
    } finally {
      setLoading(false);
    }
  };

  // Render capture interface
  const renderCaptureInterface = () => {
    if (captureMode === 'camera') {
      return (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {processingReceipt && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-gray-900">Processing receipt...</p>
              </div>
            </div>
          )}

          {/* Camera controls */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8">
            <button
              onClick={handleFlashToggle}
              className="p-3 bg-black bg-opacity-50 rounded-full text-white"
            >
              {flashEnabled ? (
                <FlashOn className="h-6 w-6" />
              ) : (
                <FlashOff className="h-6 w-6" />
              )}
            </button>

            <button
              onClick={handleCameraCapture}
              disabled={processingReceipt}
              className="p-4 bg-white rounded-full shadow-lg disabled:opacity-50"
            >
              <Camera className="h-8 w-8 text-gray-900" />
            </button>

            <button
              onClick={handleCameraSwitch}
              className="p-3 bg-black bg-opacity-50 rounded-full text-white"
            >
              <RotateCcw className="h-6 w-6" />
            </button>
          </div>
        </div>
      );
    }

    if (captureMode === 'voice') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${
                isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
              }`}
            >
              {isRecording ? (
                <MicOff className="h-16 w-16 text-red-600" />
              ) : (
                <Mic className="h-16 w-16 text-gray-600" />
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isRecording ? 'Listening...' : 'Voice Expense Entry'}
            </h3>

            <p className="text-gray-600 mb-6">
              {isRecording
                ? 'Speak clearly about your expense'
                : 'Tap the microphone to start recording'}
            </p>

            {voiceTranscript && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-800">{voiceTranscript}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleVoiceToggle}
            disabled={!voiceReady}
            className={`p-6 rounded-full shadow-lg transition-colors ${
              isRecording
                ? 'bg-red-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50`}
          >
            {isRecording ? (
              <Volume2 className="h-8 w-8" />
            ) : (
              <VolumeX className="h-8 w-8" />
            )}
          </button>
        </div>
      );
    }

    // Manual entry mode
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Manual Entry
          </h3>
          <p className="text-gray-600 mb-6">Enter expense details manually</p>

          <button
            onClick={() => setCurrentStep('edit')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  // Render review interface
  const renderReviewInterface = () => {
    return (
      <div className="flex-1 p-4 space-y-6">
        {/* Captured photo */}
        {capturedPhoto && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Receipt Photo</h3>
            <img
              src={capturedPhoto.dataUrl}
              alt="Receipt"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* OCR Results */}
        {receiptData?.ocrResult && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Detected Information
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  receiptData.ocrResult.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {Math.round(receiptData.ocrResult.confidence * 100)}% confidence
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {receiptData.ocrResult.detectedFields.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    ${receiptData.ocrResult.detectedFields.amount.toFixed(2)}
                  </span>
                </div>
              )}

              {receiptData.ocrResult.detectedFields.vendor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium">
                    {receiptData.ocrResult.detectedFields.vendor}
                  </span>
                </div>
              )}

              {receiptData.ocrResult.detectedFields.date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {receiptData.ocrResult.detectedFields.date}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Results */}
        {parsedExpense && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Voice Recognition</h3>
              <span
                className={`text-xs px-2 py-1 rounded bg-blue-100 text-blue-800`}
              >
                {Math.round(parsedExpense.confidence * 100)}% confidence
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Transcript:</span>
                <p className="text-gray-900 mt-1">
                  {parsedExpense.rawTranscript}
                </p>
              </div>

              {parsedExpense.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    ${parsedExpense.amount.toFixed(2)}
                  </span>
                </div>
              )}

              {parsedExpense.vendor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium">{parsedExpense.vendor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expense Summary */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Expense Summary</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">Amount</span>
              </div>
              <span className="font-semibold text-lg">
                ${expenseData.amount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600">Vendor</span>
              </div>
              <span className="font-medium">
                {expenseData.vendor || 'Not specified'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-purple-600" />
                <span className="text-gray-600">Category</span>
              </div>
              <span className="font-medium">{expenseData.category}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="text-gray-600">Date</span>
              </div>
              <span className="font-medium">
                {new Date(expenseData.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep('edit')}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200"
          >
            <Edit className="h-4 w-4 inline mr-2" />
            Edit Details
          </button>

          <button
            onClick={handleSaveExpense}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700"
          >
            <Save className="h-4 w-4 inline mr-2" />
            Save Expense
          </button>
        </div>
      </div>
    );
  };

  // Render edit interface
  const renderEditInterface = () => {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={expenseData.amount || ''}
                onChange={(e) =>
                  setExpenseData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <input
              type="text"
              value={expenseData.vendor}
              onChange={(e) =>
                setExpenseData((prev) => ({ ...prev, vendor: e.target.value }))
              }
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.vendor ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter vendor name"
            />
            {errors.vendor && (
              <p className="mt-1 text-sm text-red-600">{errors.vendor}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={expenseData.category}
              onChange={(e) =>
                setExpenseData((prev) => ({
                  ...prev,
                  category: e.target.value,
                }))
              }
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={expenseData.description}
              onChange={(e) =>
                setExpenseData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Enter description or notes"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={expenseData.date}
                onChange={(e) =>
                  setExpenseData((prev) => ({ ...prev, date: e.target.value }))
                }
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={expenseData.paymentMethod}
                onChange={(e) =>
                  setExpenseData((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={() => setCurrentStep('capture')}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200"
          >
            Back
          </button>

          <button
            onClick={handleSaveExpense}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 inline mr-2" />
                Save Expense
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render saving interface
  const renderSavingInterface = () => {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Saving Expense
          </h3>
          <p className="text-gray-600">
            Please wait while we save your expense...
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                Add Expense
              </h1>
            </div>

            {currentStep === 'capture' && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCaptureMode('camera')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    captureMode === 'camera'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  Camera
                </button>
                <button
                  onClick={() => setCaptureMode('voice')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    captureMode === 'voice'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  Voice
                </button>
                <button
                  onClick={() => setCaptureMode('manual')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    captureMode === 'manual'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  Manual
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentStep === 'capture' && renderCaptureInterface()}
      {currentStep === 'review' && renderReviewInterface()}
      {currentStep === 'edit' && renderEditInterface()}
      {currentStep === 'saving' && renderSavingInterface()}
    </div>
  );
}
