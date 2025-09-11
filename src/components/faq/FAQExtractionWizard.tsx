'use client';

import { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  CpuChipIcon,
  EyeIcon,
  TagIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// TypeScript interfaces
interface ExtractedFAQ {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  sourceUrl: string;
  category?: string;
}

interface FAQCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface DiscoveredPage {
  url: string;
  title: string;
  description?: string;
  faqCount: number;
  selected: boolean;
}

interface ExtractionState {
  currentStep: number;
  websiteUrl: string;
  discoveredPages: DiscoveredPage[];
  selectedPages: string[];
  extractedFAQs: ExtractedFAQ[];
  categories: FAQCategory[];
  isProcessing: boolean;
  error: string | null;
  progress: number;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Website URL',
    description: 'Enter website to extract from',
    icon: GlobeAltIcon,
  },
  {
    id: 2,
    title: 'Page Discovery',
    description: 'Select pages to analyze',
    icon: DocumentTextIcon,
  },
  {
    id: 3,
    title: 'Processing',
    description: 'Extracting FAQ content',
    icon: CpuChipIcon,
  },
  {
    id: 4,
    title: 'Review FAQs',
    description: 'Review extracted content',
    icon: EyeIcon,
  },
  {
    id: 5,
    title: 'Categorize',
    description: 'Assign categories',
    icon: TagIcon,
  },
  {
    id: 6,
    title: 'Complete',
    description: 'Extraction complete',
    icon: CheckCircleIcon,
  },
];

const DEFAULT_CATEGORIES: FAQCategory[] = [
  {
    id: 'general',
    name: 'General',
    color: 'bg-blue-100 text-blue-800',
    count: 0,
  },
  {
    id: 'pricing',
    name: 'Pricing',
    color: 'bg-green-100 text-green-800',
    count: 0,
  },
  {
    id: 'services',
    name: 'Services',
    color: 'bg-purple-100 text-purple-800',
    count: 0,
  },
  {
    id: 'booking',
    name: 'Booking',
    color: 'bg-amber-100 text-amber-800',
    count: 0,
  },
  {
    id: 'technical',
    name: 'Technical',
    color: 'bg-gray-100 text-gray-800',
    count: 0,
  },
];

export default function FAQExtractionWizard() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ExtractionState>({
    currentStep: 1,
    websiteUrl: '',
    discoveredPages: [],
    selectedPages: [],
    extractedFAQs: [],
    categories: DEFAULT_CATEGORIES,
    isProcessing: false,
    error: null,
    progress: 0,
  });

  // Step 1: URL Entry
  const handleUrlSubmit = useCallback(async (url: string) => {
    setState((prev) => ({ ...prev, websiteUrl: url, error: null }));

    startTransition(async () => {
      try {
        setState((prev) => ({ ...prev, isProcessing: true }));

        // Simulate page discovery
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockPages: DiscoveredPage[] = [
          {
            url: `${url}/faq`,
            title: 'FAQ Page',
            faqCount: 12,
            selected: true,
          },
          {
            url: `${url}/help`,
            title: 'Help Center',
            faqCount: 8,
            selected: true,
          },
          {
            url: `${url}/support`,
            title: 'Support',
            faqCount: 6,
            selected: false,
          },
          {
            url: `${url}/pricing`,
            title: 'Pricing Information',
            faqCount: 4,
            selected: true,
          },
        ];

        setState((prev) => ({
          ...prev,
          discoveredPages: mockPages,
          selectedPages: mockPages.filter((p) => p.selected).map((p) => p.url),
          currentStep: 2,
          isProcessing: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            'Failed to discover pages. Please check the URL and try again.',
          isProcessing: false,
        }));
      }
    });
  }, []);

  // Step 2: Page Selection
  const handlePageSelection = useCallback(
    (pageUrl: string, selected: boolean) => {
      setState((prev) => ({
        ...prev,
        discoveredPages: prev.discoveredPages.map((page) =>
          page.url === pageUrl ? { ...page, selected } : page,
        ),
        selectedPages: selected
          ? [...prev.selectedPages, pageUrl]
          : prev.selectedPages.filter((url) => url !== pageUrl),
      }));
    },
    [],
  );

  // Step 3: Start Processing
  const handleStartExtraction = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      currentStep: 3,
      isProcessing: true,
      progress: 0,
    }));

    startTransition(async () => {
      try {
        // Simulate extraction progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          setState((prev) => ({ ...prev, progress: i }));
        }

        // Mock extracted FAQs
        const mockFAQs: ExtractedFAQ[] = [
          {
            id: '1',
            question: 'What services do you offer?',
            answer:
              'We offer comprehensive wedding photography and videography services including engagement sessions, wedding day coverage, and post-production editing.',
            confidence: 95,
            sourceUrl: `${state.websiteUrl}/faq`,
          },
          {
            id: '2',
            question: 'How much do your packages cost?',
            answer:
              'Our wedding packages start from £1,200 and go up to £3,500 depending on coverage hours and deliverables included.',
            confidence: 88,
            sourceUrl: `${state.websiteUrl}/pricing`,
          },
          {
            id: '3',
            question: 'Do you travel for weddings?',
            answer:
              'Yes, we travel throughout the UK for weddings. Travel fees may apply for locations over 50 miles from our base.',
            confidence: 92,
            sourceUrl: `${state.websiteUrl}/faq`,
          },
        ];

        setState((prev) => ({
          ...prev,
          extractedFAQs: mockFAQs,
          currentStep: 4,
          isProcessing: false,
          progress: 100,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to extract FAQs. Please try again.',
          isProcessing: false,
        }));
      }
    });
  }, [state.websiteUrl]);

  // Step 4: FAQ Review
  const handleFAQEdit = useCallback(
    (faqId: string, field: keyof ExtractedFAQ, value: string) => {
      setState((prev) => ({
        ...prev,
        extractedFAQs: prev.extractedFAQs.map((faq) =>
          faq.id === faqId ? { ...faq, [field]: value } : faq,
        ),
      }));
    },
    [],
  );

  const handleFAQRemove = useCallback((faqId: string) => {
    setState((prev) => ({
      ...prev,
      extractedFAQs: prev.extractedFAQs.filter((faq) => faq.id !== faqId),
    }));
  }, []);

  // Step 5: Categorization
  const handleCategoryAssignment = useCallback(
    (faqId: string, categoryId: string) => {
      setState((prev) => ({
        ...prev,
        extractedFAQs: prev.extractedFAQs.map((faq) =>
          faq.id === faqId ? { ...faq, category: categoryId } : faq,
        ),
        categories: prev.categories.map((cat) => ({
          ...cat,
          count: prev.extractedFAQs.filter((faq) => faq.category === cat.id)
            .length,
        })),
      }));
    },
    [],
  );

  // Navigation
  const handleNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(6, prev.currentStep + 1) as WizardStep,
    }));
  }, []);

  const handlePrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1) as WizardStep,
    }));
  }, []);

  const handleFinish = useCallback(() => {
    // Handle completion - save FAQs to database
    console.log('Extraction complete:', state.extractedFAQs);
  }, [state.extractedFAQs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            FAQ Extraction Wizard
          </h1>
          <p className="text-lg text-gray-600">
            Extract and organize FAQ content from any website
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, stepIdx) => (
                <li key={step.id} className="flex items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      state.currentStep > step.id
                        ? 'border-primary-600 bg-primary-600'
                        : state.currentStep === step.id
                          ? 'border-primary-600 bg-white'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {state.currentStep > step.id ? (
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    ) : (
                      <step.icon
                        className={`h-6 w-6 ${
                          state.currentStep === step.id
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  {stepIdx < WIZARD_STEPS.length - 1 && (
                    <div
                      className={`ml-4 h-0.5 w-full ${
                        state.currentStep > step.id
                          ? 'bg-primary-600'
                          : 'bg-gray-300'
                      } hidden sm:block`}
                    />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {/* Step 1: URL Entry */}
              {state.currentStep === 1 && (
                <URLEntryStep
                  url={state.websiteUrl}
                  onSubmit={handleUrlSubmit}
                  isProcessing={state.isProcessing}
                  error={state.error}
                />
              )}

              {/* Step 2: Page Discovery */}
              {state.currentStep === 2 && (
                <PageDiscoveryStep
                  pages={state.discoveredPages}
                  onPageSelection={handlePageSelection}
                  onNext={handleStartExtraction}
                  selectedCount={state.selectedPages.length}
                />
              )}

              {/* Step 3: Processing */}
              {state.currentStep === 3 && (
                <ProcessingStep
                  progress={state.progress}
                  selectedPages={state.selectedPages}
                />
              )}

              {/* Step 4: Review FAQs */}
              {state.currentStep === 4 && (
                <ReviewFAQsStep
                  faqs={state.extractedFAQs}
                  onEdit={handleFAQEdit}
                  onRemove={handleFAQRemove}
                  onNext={handleNext}
                />
              )}

              {/* Step 5: Categorize */}
              {state.currentStep === 5 && (
                <CategorizeStep
                  faqs={state.extractedFAQs}
                  categories={state.categories}
                  onCategoryAssignment={handleCategoryAssignment}
                  onNext={handleNext}
                />
              )}

              {/* Step 6: Complete */}
              {state.currentStep === 6 && (
                <CompleteStep
                  faqCount={state.extractedFAQs.length}
                  categories={state.categories}
                  onFinish={handleFinish}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {state.currentStep > 1 && state.currentStep < 6 && (
            <div className="flex justify-between px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={state.currentStep === 1 || state.isProcessing}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4 mr-2" />
                Previous
              </button>

              <div className="text-sm text-gray-500">
                Step {state.currentStep} of {WIZARD_STEPS.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
interface URLEntryStepProps {
  url: string;
  onSubmit: (url: string) => void;
  isProcessing: boolean;
  error: string | null;
}

function URLEntryStep({
  url,
  onSubmit,
  isProcessing,
  error,
}: URLEntryStepProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!inputUrl.trim()) {
      setValidationError('Please enter a website URL');
      return;
    }

    if (!validateUrl(inputUrl)) {
      setValidationError(
        'Please enter a valid URL (e.g., https://example.com)',
      );
      return;
    }

    onSubmit(inputUrl);
  };

  return (
    <div className="text-center">
      <GlobeAltIcon className="mx-auto h-16 w-16 text-primary-600 mb-6" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Enter Website URL
      </h2>
      <p className="text-gray-600 mb-8 max-w-lg mx-auto">
        Enter the website URL you'd like to extract FAQ content from. We'll
        discover all relevant pages automatically.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="mb-6">
          <label htmlFor="website-url" className="sr-only">
            Website URL
          </label>
          <div className="relative">
            <input
              type="url"
              id="website-url"
              placeholder="https://example.com"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 px-4 py-3 text-lg"
              disabled={isProcessing}
              autoFocus
            />
            {isProcessing && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          {(validationError || error) && (
            <div className="mt-2 flex items-center text-sm text-red-600">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              {validationError || error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isProcessing || !inputUrl.trim()}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Discovering Pages...
            </>
          ) : (
            <>
              Discover Pages
              <ChevronRightIcon className="ml-2 h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">What we'll do:</p>
            <ul className="text-left space-y-1">
              <li>• Scan your website for FAQ and help pages</li>
              <li>• Extract question and answer pairs</li>
              <li>• Organize content into categories</li>
              <li>• Allow you to review and edit before saving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PageDiscoveryStepProps {
  pages: DiscoveredPage[];
  onPageSelection: (pageUrl: string, selected: boolean) => void;
  onNext: () => void;
  selectedCount: number;
}

function PageDiscoveryStep({
  pages,
  onPageSelection,
  onNext,
  selectedCount,
}: PageDiscoveryStepProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <DocumentTextIcon className="mx-auto h-16 w-16 text-primary-600 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Select Pages to Analyze
        </h2>
        <p className="text-gray-600">
          We found {pages.length} pages that might contain FAQ content. Select
          which ones to analyze.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {pages.map((page) => (
          <div
            key={page.url}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              page.selected
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onPageSelection(page.url, !page.selected)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={page.selected}
                  onChange={(e) => onPageSelection(page.url, e.target.checked)}
                  className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-600"
                />
                <div className="ml-4">
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{page.url}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  ~{page.faqCount} FAQs
                </span>
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {selectedCount} of {pages.length} pages selected
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={selectedCount === 0}
          className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Extraction
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ProcessingStepProps {
  progress: number;
  selectedPages: string[];
}

function ProcessingStep({ progress, selectedPages }: ProcessingStepProps) {
  return (
    <div className="text-center">
      <CpuChipIcon className="mx-auto h-16 w-16 text-primary-600 mb-6" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Extracting FAQ Content
      </h2>
      <p className="text-gray-600 mb-8">
        Analyzing {selectedPages.length} pages and extracting question-answer
        pairs...
      </p>

      <div className="max-w-md mx-auto mb-8">
        <div className="bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-primary-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Processing Steps:</h3>
        <div className="space-y-2 text-sm">
          <div
            className={`flex items-center ${progress > 0 ? 'text-green-600' : 'text-gray-400'}`}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Fetching page content
          </div>
          <div
            className={`flex items-center ${progress > 30 ? 'text-green-600' : 'text-gray-400'}`}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Analyzing content structure
          </div>
          <div
            className={`flex items-center ${progress > 60 ? 'text-green-600' : 'text-gray-400'}`}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Extracting question-answer pairs
          </div>
          <div
            className={`flex items-center ${progress === 100 ? 'text-green-600' : 'text-gray-400'}`}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Finalizing results
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReviewFAQsStepProps {
  faqs: ExtractedFAQ[];
  onEdit: (faqId: string, field: keyof ExtractedFAQ, value: string) => void;
  onRemove: (faqId: string) => void;
  onNext: () => void;
}

function ReviewFAQsStep({
  faqs,
  onEdit,
  onRemove,
  onNext,
}: ReviewFAQsStepProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <EyeIcon className="mx-auto h-16 w-16 text-primary-600 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Review Extracted FAQs
        </h2>
        <p className="text-gray-600">
          We found {faqs.length} FAQ pairs. Review and edit them as needed.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {faqs.map((faq, index) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-gray-200 rounded-lg p-6 bg-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500 mr-3">
                  FAQ #{index + 1}
                </span>
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-2">
                    Confidence:
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      faq.confidence >= 90
                        ? 'bg-green-100 text-green-800'
                        : faq.confidence >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {faq.confidence}%
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(faq.id)}
                className="text-gray-400 hover:text-red-600 p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <textarea
                  value={faq.question}
                  onChange={(e) => onEdit(faq.id, 'question', e.target.value)}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer
                </label>
                <textarea
                  value={faq.answer}
                  onChange={(e) => onEdit(faq.id, 'answer', e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-600 focus:ring-primary-600 resize-none"
                />
              </div>

              <div className="text-xs text-gray-500">
                Source: {faq.sourceUrl}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
        >
          Continue to Categorization
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface CategorizeStepProps {
  faqs: ExtractedFAQ[];
  categories: FAQCategory[];
  onCategoryAssignment: (faqId: string, categoryId: string) => void;
  onNext: () => void;
}

function CategorizeStep({
  faqs,
  categories,
  onCategoryAssignment,
  onNext,
}: CategorizeStepProps) {
  const uncategorizedFAQs = faqs.filter((faq) => !faq.category);

  return (
    <div>
      <div className="text-center mb-8">
        <TagIcon className="mx-auto h-16 w-16 text-primary-600 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Categorize FAQs
        </h2>
        <p className="text-gray-600">
          Assign categories to organize your FAQs better.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Categories */}
        <div className="lg:col-span-1">
          <h3 className="font-medium text-gray-900 mb-4">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`px-3 py-2 rounded-md text-sm font-medium ${category.color}`}
              >
                {category.name} ({category.count})
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="lg:col-span-2">
          <h3 className="font-medium text-gray-900 mb-4">
            FAQs{' '}
            {uncategorizedFAQs.length > 0 && (
              <span className="text-amber-600">
                ({uncategorizedFAQs.length} uncategorized)
              </span>
            )}
          </h3>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {faq.question}
                  </h4>
                  <select
                    value={faq.category || ''}
                    onChange={(e) =>
                      onCategoryAssignment(faq.id, e.target.value)
                    }
                    className="ml-4 text-sm border-gray-300 rounded-md focus:border-primary-600 focus:ring-primary-600"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
        >
          Complete Extraction
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface CompleteStepProps {
  faqCount: number;
  categories: FAQCategory[];
  onFinish: () => void;
}

function CompleteStep({ faqCount, categories, onFinish }: CompleteStepProps) {
  return (
    <div className="text-center">
      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-6" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Extraction Complete!
      </h2>
      <p className="text-gray-600 mb-8">
        Successfully extracted and organized {faqCount} FAQ pairs.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total FAQs:</span>
            <span className="font-medium ml-2">{faqCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Categories:</span>
            <span className="font-medium ml-2">
              {categories.filter((c) => c.count > 0).length}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories
            .filter((c) => c.count > 0)
            .map((category) => (
              <span
                key={category.id}
                className={`px-2 py-1 rounded-md text-xs font-medium ${category.color}`}
              >
                {category.name} ({category.count})
              </span>
            ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="px-8 py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
      >
        Save FAQs to Library
      </button>
    </div>
  );
}
