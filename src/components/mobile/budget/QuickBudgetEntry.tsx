'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  percentage: number;
}

interface BudgetEntry {
  id?: string;
  amount: number;
  category: string;
  description: string;
  vendor?: string;
  date: string;
  notes?: string;
  receipt?: File;
}

interface QuickBudgetEntryProps {
  categories: BudgetCategory[];
  weddingId: string;
  organizationId: string;
  onEntryAdded: (entry: BudgetEntry) => void;
}

interface FormStep {
  step: 'amount' | 'category' | 'details' | 'confirmation';
  title: string;
  description: string;
}

const formSteps: FormStep[] = [
  { step: 'amount', title: 'Amount', description: 'How much did you spend?' },
  {
    step: 'category',
    title: 'Category',
    description: 'What category is this expense?',
  },
  {
    step: 'details',
    title: 'Details',
    description: 'Add a description and vendor',
  },
  {
    step: 'confirmation',
    title: 'Review',
    description: 'Review and save your expense',
  },
];

export function QuickBudgetEntry({
  categories,
  weddingId,
  organizationId,
  onEntryAdded,
}: QuickBudgetEntryProps) {
  const [currentStep, setCurrentStep] = useState<FormStep['step']>('amount');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [entry, setEntry] = useState<BudgetEntry>({
    amount: 0,
    category: '',
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Receipt capture
  const [capturedReceipt, setCapturedReceipt] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-GB';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
        triggerHaptic('heavy');
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
      setSpeechSupported(true);
    }
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!('vibrate' in navigator)) return;

      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      };
      navigator.vibrate(patterns[type]);
    },
    [],
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  // Handle voice input
  const handleVoiceInput = useCallback(
    (transcript: string) => {
      const lowerTranscript = transcript.toLowerCase();

      if (currentStep === 'amount') {
        // Extract number from transcript
        const numberMatch = transcript.match(/\d+(?:\.\d{2})?/);
        if (numberMatch) {
          const amount = Math.round(parseFloat(numberMatch[0]) * 100); // Convert to pence
          setEntry((prev) => ({ ...prev, amount }));
          triggerHaptic('light');
        }
      } else if (currentStep === 'details') {
        // Use transcript as description
        setEntry((prev) => ({ ...prev, description: transcript }));
        triggerHaptic('light');
      }
    },
    [currentStep, triggerHaptic],
  );

  // Start voice recognition
  const startVoiceInput = useCallback(() => {
    if (!recognition || isListening) return;

    setIsListening(true);
    triggerHaptic('light');
    recognition.start();
  }, [recognition, isListening, triggerHaptic]);

  // Handle camera access for receipt capture
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  }, []);

  // Capture receipt photo
  const captureReceipt = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          setCapturedReceipt(file);
          setEntry((prev) => ({ ...prev, receipt: file }));
          triggerHaptic('medium');
        }
      },
      'image/jpeg',
      0.8,
    );

    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setShowCamera(false);
  }, [triggerHaptic]);

  // Navigation helpers
  const goToNextStep = useCallback(() => {
    const currentIndex = formSteps.findIndex((s) => s.step === currentStep);
    if (currentIndex < formSteps.length - 1) {
      setCurrentStep(formSteps[currentIndex + 1].step);
      triggerHaptic('light');
    }
  }, [currentStep, triggerHaptic]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = formSteps.findIndex((s) => s.step === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(formSteps[currentIndex - 1].step);
      triggerHaptic('light');
    }
  }, [currentStep, triggerHaptic]);

  // Quick amount buttons
  const quickAmounts = [500, 1000, 2500, 5000, 10000, 25000]; // in pence

  // Submit entry
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const finalEntry: BudgetEntry = {
        ...entry,
        id: Date.now().toString(), // Temporary ID
      };

      onEntryAdded(finalEntry);
      setShowSuccess(true);

      // Reset form after success
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentStep('amount');
        setEntry({
          amount: 0,
          category: '',
          description: '',
          vendor: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setCapturedReceipt(null);
      }, 2000);
    } catch (error) {
      console.error('Error submitting entry:', error);
      triggerHaptic('heavy');
    } finally {
      setIsSubmitting(false);
    }
  }, [entry, onEntryAdded, triggerHaptic]);

  // Get current step info
  const currentStepInfo = formSteps.find((s) => s.step === currentStep)!;
  const stepIndex = formSteps.findIndex((s) => s.step === currentStep);
  const progress = ((stepIndex + 1) / formSteps.length) * 100;

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center text-white"
            >
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold mb-2">Expense Added!</h2>
              <p className="text-green-100">
                {formatCurrency(entry.amount)} added to {entry.category}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black z-40"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach((track) => track.stop());
                  setShowCamera(false);
                }}
                className="px-6 py-3 bg-red-500 text-white rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={captureReceipt}
                className="px-8 py-3 bg-white text-black rounded-full font-medium"
              >
                Capture Receipt
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Quick Add Expense</h1>
          <button
            onClick={() => setCurrentStep('amount')}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              Step {stepIndex + 1} of {formSteps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Info */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {currentStepInfo.title}
          </h2>
          <p className="text-sm text-gray-600">{currentStepInfo.description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Amount Step */}
            {currentStep === 'amount' && (
              <div className="space-y-6">
                {/* Current Amount Display */}
                <div className="text-center bg-white rounded-xl p-8 shadow-sm">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {formatCurrency(entry.amount)}
                  </div>
                  <p className="text-sm text-gray-500">Expense Amount</p>
                </div>

                {/* Number Input */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Amount (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                      £
                    </span>
                    <input
                      type="number"
                      value={
                        entry.amount > 0 ? (entry.amount / 100).toFixed(2) : ''
                      }
                      onChange={(e) => {
                        const amount = Math.round(
                          parseFloat(e.target.value || '0') * 100,
                        );
                        setEntry((prev) => ({ ...prev, amount }));
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-12 py-4 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                    />
                    {speechSupported && (
                      <button
                        onClick={startVoiceInput}
                        className={cn(
                          'absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full',
                          isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        🎤
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Quick Amounts
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setEntry((prev) => ({ ...prev, amount }));
                          triggerHaptic('light');
                        }}
                        className="py-3 px-4 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg font-medium transition-colors"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Category Step */}
            {currentStep === 'category' && (
              <div className="space-y-4">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => {
                      setEntry((prev) => ({
                        ...prev,
                        category: category.name,
                      }));
                      triggerHaptic('light');
                    }}
                    className={cn(
                      'w-full p-4 bg-white rounded-xl shadow-sm border-2 transition-all',
                      'flex items-center justify-between',
                      entry.category === category.name
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200',
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(category.spent)} /{' '}
                          {formatCurrency(category.allocated)} spent
                        </p>
                      </div>
                    </div>
                    {entry.category === category.name && (
                      <div className="text-blue-500 text-xl">✓</div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Details Step */}
            {currentStep === 'details' && (
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) =>
                        setEntry((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="What did you buy?"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {speechSupported && (
                      <button
                        onClick={startVoiceInput}
                        className={cn(
                          'absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full',
                          isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        🎤
                      </button>
                    )}
                  </div>
                </div>

                {/* Vendor */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor / Supplier
                  </label>
                  <input
                    type="text"
                    value={entry.vendor}
                    onChange={(e) =>
                      setEntry((prev) => ({ ...prev, vendor: e.target.value }))
                    }
                    placeholder="Where did you buy this?"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Purchase
                  </label>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) =>
                      setEntry((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Receipt Capture */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt (Optional)
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={startCamera}
                      className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      📷 Take Photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      📁 Choose File
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCapturedReceipt(file);
                        setEntry((prev) => ({ ...prev, receipt: file }));
                      }
                    }}
                    className="hidden"
                  />
                  {capturedReceipt && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm text-green-800">
                        📄 Receipt captured: {capturedReceipt.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirmation' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Review Your Expense
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Amount</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Category</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: categories.find(
                              (c) => c.name === entry.category,
                            )?.color,
                          }}
                        />
                        <span className="font-medium text-gray-900">
                          {entry.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Description</span>
                      <span className="font-medium text-gray-900 text-right max-w-40">
                        {entry.description}
                      </span>
                    </div>

                    {entry.vendor && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Vendor</span>
                        <span className="font-medium text-gray-900">
                          {entry.vendor}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium text-gray-900">
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </span>
                    </div>

                    {capturedReceipt && (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-gray-600">Receipt</span>
                        <span className="text-green-600 font-medium">
                          ✓ Attached
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t px-4 py-4 safe-area-bottom">
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={goToPreviousStep}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Back
            </button>
          )}

          <button
            onClick={
              currentStep === 'confirmation' ? handleSubmit : goToNextStep
            }
            disabled={
              (currentStep === 'amount' && entry.amount === 0) ||
              (currentStep === 'category' && !entry.category) ||
              (currentStep === 'details' && !entry.description) ||
              isSubmitting
            }
            className={cn(
              'flex-1 py-3 px-6 rounded-lg font-medium transition-all',
              'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed',
              currentStep === 'confirmation'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white',
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : currentStep === 'confirmation' ? (
              'Add Expense'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
