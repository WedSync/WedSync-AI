'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useCulturalAdaptations } from './MobileCulturalAdaptations';
import { useMobileKeyboard } from '../../../lib/services/mobile-i18n/MobileKeyboardSupport';
import { useOfflineTranslation } from '../../../lib/services/mobile-i18n/OfflineTranslationManager';
import { useRTL } from './MobileRTLLayout';

// Wedding form field types
export interface WeddingFormField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'date'
    | 'time'
    | 'select'
    | 'textarea'
    | 'number'
    | 'currency'
    | 'address';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: z.ZodSchema;
  options?: { value: string; label: string }[];
  culturalVariations?: {
    [cultureCode: string]: {
      label?: string;
      placeholder?: string;
      options?: { value: string; label: string }[];
      additionalValidation?: z.ZodSchema;
    };
  };
  weddingSpecific?: {
    ceremony?: boolean; // Field relates to ceremony details
    reception?: boolean; // Field relates to reception details
    cultural?: boolean; // Field has cultural significance
    family?: boolean; // Field involves family details
  };
}

export interface LocalizedWeddingForm {
  id: string;
  title: string;
  description?: string;
  fields: WeddingFormField[];
  culturalAdaptations: {
    [cultureCode: string]: {
      title?: string;
      description?: string;
      additionalFields?: WeddingFormField[];
      fieldOrder?: string[];
      validationRules?: Record<string, z.ZodSchema>;
    };
  };
}

// Wedding form templates
export const WEDDING_FORM_TEMPLATES: LocalizedWeddingForm[] = [
  {
    id: 'couple-details',
    title: 'Couple Information',
    description: 'Basic information about the couple',
    fields: [
      {
        id: 'bride_name',
        type: 'text',
        label: "Bride's Name",
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'اسم العروس' },
          'zh-CN': { label: '新娘姓名' },
          'hi-IN': { label: 'दुल्हन का नाम' },
          'es-ES': { label: 'Nombre de la Novia' },
        },
        weddingSpecific: { ceremony: true, family: true },
      },
      {
        id: 'groom_name',
        type: 'text',
        label: "Groom's Name",
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'اسم العريس' },
          'zh-CN': { label: '新郎姓名' },
          'hi-IN': { label: 'दूल्हे का नाम' },
          'es-ES': { label: 'Nombre del Novio' },
        },
        weddingSpecific: { ceremony: true, family: true },
      },
      {
        id: 'wedding_date',
        type: 'date',
        label: 'Wedding Date',
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'تاريخ الزفاف' },
          'zh-CN': { label: '婚礼日期' },
          'hi-IN': { label: 'विवाह की तारीख' },
          'es-ES': { label: 'Fecha de la Boda' },
        },
        weddingSpecific: { ceremony: true, cultural: true },
      },
      {
        id: 'contact_email',
        type: 'email',
        label: 'Contact Email',
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'البريد الإلكتروني' },
          'zh-CN': { label: '联系邮箱' },
          'hi-IN': { label: 'ईमेल पता' },
          'es-ES': { label: 'Correo Electrónico' },
        },
      },
      {
        id: 'contact_phone',
        type: 'phone',
        label: 'Contact Phone',
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'رقم الهاتف' },
          'zh-CN': { label: '联系电话' },
          'hi-IN': { label: 'फ़ोन नंबर' },
          'es-ES': { label: 'Teléfono' },
        },
      },
    ],
    culturalAdaptations: {
      'ar-SA': {
        additionalFields: [
          {
            id: 'wali_name',
            type: 'text',
            label: 'ولي الأمر',
            required: true,
            weddingSpecific: { ceremony: true, family: true, cultural: true },
          },
        ],
      },
      'hi-IN': {
        additionalFields: [
          {
            id: 'gotra',
            type: 'text',
            label: 'गोत्र',
            required: false,
            weddingSpecific: { ceremony: true, cultural: true },
          },
        ],
      },
      'zh-CN': {
        fieldOrder: [
          'groom_name',
          'bride_name',
          'wedding_date',
          'contact_email',
          'contact_phone',
        ], // Groom first in Chinese culture
      },
    },
  },
  {
    id: 'ceremony-preferences',
    title: 'Ceremony Preferences',
    description: 'Details about your wedding ceremony',
    fields: [
      {
        id: 'ceremony_type',
        type: 'select',
        label: 'Ceremony Type',
        required: true,
        options: [
          { value: 'religious', label: 'Religious' },
          { value: 'civil', label: 'Civil' },
          { value: 'spiritual', label: 'Spiritual' },
          { value: 'cultural', label: 'Cultural' },
        ],
        culturalVariations: {
          'ar-SA': {
            label: 'نوع الحفل',
            options: [
              { value: 'islamic', label: 'إسلامي' },
              { value: 'civil', label: 'مدني' },
            ],
          },
          'hi-IN': {
            label: 'समारोह का प्रकार',
            options: [
              { value: 'hindu', label: 'हिंदू' },
              { value: 'sikh', label: 'सिख' },
              { value: 'christian', label: 'ईसाई' },
              { value: 'civil', label: 'नागरिक' },
            ],
          },
          'zh-CN': {
            label: '婚礼类型',
            options: [
              { value: 'traditional', label: '传统中式' },
              { value: 'western', label: '西式' },
              { value: 'mixed', label: '中西合璧' },
            ],
          },
        },
        weddingSpecific: { ceremony: true, cultural: true },
      },
      {
        id: 'venue_type',
        type: 'select',
        label: 'Venue Type',
        required: true,
        options: [
          { value: 'indoor', label: 'Indoor' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'beach', label: 'Beach' },
          { value: 'garden', label: 'Garden' },
        ],
        culturalVariations: {
          'ar-SA': {
            label: 'نوع المكان',
            options: [
              { value: 'hall', label: 'صالة أفراح' },
              { value: 'hotel', label: 'فندق' },
              { value: 'home', label: 'المنزل' },
            ],
          },
          'hi-IN': {
            label: 'स्थान का प्रकार',
            options: [
              { value: 'banquet', label: 'बैंक्वेट हॉल' },
              { value: 'temple', label: 'मंदिर' },
              { value: 'garden', label: 'बगीचा' },
              { value: 'farmhouse', label: 'फार्म हाउस' },
            ],
          },
        },
        weddingSpecific: { ceremony: true, reception: true },
      },
      {
        id: 'guest_count',
        type: 'number',
        label: 'Expected Guest Count',
        required: true,
        culturalVariations: {
          'ar-SA': { label: 'عدد الضيوف المتوقع' },
          'zh-CN': { label: '预计宾客人数' },
          'hi-IN': { label: 'अतिथियों की संख्या' },
          'es-ES': { label: 'Número de Invitados' },
        },
        weddingSpecific: { ceremony: true, reception: true },
      },
      {
        id: 'budget_range',
        type: 'currency',
        label: 'Budget Range',
        required: false,
        culturalVariations: {
          'ar-SA': { label: 'الميزانية' },
          'zh-CN': { label: '预算范围' },
          'hi-IN': { label: 'बजट' },
          'es-ES': { label: 'Presupuesto' },
        },
        weddingSpecific: { ceremony: true, reception: true },
      },
    ],
    culturalAdaptations: {
      'ar-SA': {
        additionalFields: [
          {
            id: 'gender_separation',
            type: 'select',
            label: 'فصل الرجال والنساء',
            required: true,
            options: [
              { value: 'separate', label: 'منفصل' },
              { value: 'mixed', label: 'مختلط' },
            ],
            weddingSpecific: {
              ceremony: true,
              reception: true,
              cultural: true,
            },
          },
        ],
      },
      'hi-IN': {
        additionalFields: [
          {
            id: 'muhurat',
            type: 'time',
            label: 'शुभ मुहूर्त',
            required: false,
            weddingSpecific: { ceremony: true, cultural: true },
          },
        ],
      },
    },
  },
];

interface MobileWeddingFormsLocalizerProps {
  formTemplate: LocalizedWeddingForm;
  onSubmit: (data: any) => void;
  onSave?: (data: any) => void;
  className?: string;
  autoSave?: boolean;
  showProgress?: boolean;
}

export const MobileWeddingFormsLocalizer: React.FC<
  MobileWeddingFormsLocalizerProps
> = ({
  formTemplate,
  onSubmit,
  onSave,
  className = '',
  autoSave = true,
  showProgress = true,
}) => {
  const { preferences, weddingNorms } = useCulturalAdaptations();
  const { getInputAttributes, formatValue, validateInput } = useMobileKeyboard(
    preferences.language,
  );
  const { t } = useOfflineTranslation();
  const { rtlClass } = useRTL();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get culturally adapted form
  const getAdaptedForm = useCallback((): LocalizedWeddingForm => {
    const cultureCode = `${preferences.language}-${preferences.region}`;
    const adaptation = formTemplate.culturalAdaptations[cultureCode] || {};

    let adaptedFields = [...formTemplate.fields];

    // Add cultural fields
    if (adaptation.additionalFields) {
      adaptedFields = [...adaptedFields, ...adaptation.additionalFields];
    }

    // Apply cultural field variations
    adaptedFields = adaptedFields.map((field) => {
      const variation = field.culturalVariations?.[cultureCode];
      if (variation) {
        return {
          ...field,
          label: variation.label || field.label,
          placeholder: variation.placeholder || field.placeholder,
          options: variation.options || field.options,
        };
      }
      return field;
    });

    // Apply field order if specified
    if (adaptation.fieldOrder) {
      const orderedFields: WeddingFormField[] = [];
      adaptation.fieldOrder.forEach((fieldId) => {
        const field = adaptedFields.find((f) => f.id === fieldId);
        if (field) orderedFields.push(field);
      });
      // Add remaining fields not in order
      adaptedFields.forEach((field) => {
        if (!orderedFields.find((f) => f.id === field.id)) {
          orderedFields.push(field);
        }
      });
      adaptedFields = orderedFields;
    }

    return {
      ...formTemplate,
      title: adaptation.title || formTemplate.title,
      description: adaptation.description || formTemplate.description,
      fields: adaptedFields,
    };
  }, [formTemplate, preferences]);

  const adaptedForm = getAdaptedForm();

  // Create dynamic Zod schema based on form fields
  const createValidationSchema = useCallback(() => {
    const schemaFields: Record<string, z.ZodSchema> = {};

    adaptedForm.fields.forEach((field) => {
      let fieldSchema: z.ZodSchema = z.any();

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Invalid email address');
          break;
        case 'phone':
          fieldSchema = z.string().min(10, 'Phone number too short');
          break;
        case 'date':
          fieldSchema = z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), 'Invalid date');
          break;
        case 'number':
          fieldSchema = z
            .number()
            .or(z.string().transform((val) => parseInt(val)));
          break;
        case 'currency':
          fieldSchema = z
            .number()
            .or(z.string().transform((val) => parseFloat(val)));
          break;
        default:
          fieldSchema = z.string();
      }

      if (field.required) {
        fieldSchema = fieldSchema.refine(
          (val) => val !== '' && val !== null && val !== undefined,
          'This field is required',
        );
      }

      schemaFields[field.id] = fieldSchema;
    });

    return z.object(schemaFields);
  }, [adaptedForm]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(createValidationSchema()),
    defaultValues: formData,
  });

  // Auto-save functionality
  const watchedValues = watch();
  useEffect(() => {
    if (autoSave && onSave) {
      const timer = setTimeout(() => {
        onSave(watchedValues);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [watchedValues, autoSave, onSave]);

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: WeddingFormField) => {
    const inputAttributes = getInputAttributes(field.type);

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label
          htmlFor={field.id}
          className={rtlClass(
            `block text-sm font-medium text-gray-700 dark:text-gray-300 ${preferences.rtl ? 'text-right' : 'text-left'}`,
          )}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value, onBlur } }) => {
            switch (field.type) {
              case 'select':
                return (
                  <select
                    id={field.id}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={rtlClass(`
                      w-full px-4 py-3 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${preferences.rtl ? 'text-right' : 'text-left'}
                    `)}
                    {...inputAttributes}
                  >
                    <option value="">
                      {t('select_option', preferences.language) ||
                        'Select an option...'}
                    </option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                );

              case 'textarea':
                return (
                  <textarea
                    id={field.id}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={field.placeholder}
                    rows={4}
                    className={rtlClass(`
                      w-full px-4 py-3 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      resize-vertical
                    `)}
                    {...inputAttributes}
                  />
                );

              default:
                return (
                  <input
                    id={field.id}
                    type={
                      field.type === 'currency' || field.type === 'number'
                        ? 'number'
                        : field.type
                    }
                    value={value || ''}
                    onChange={(e) => {
                      const formattedValue = formatValue(
                        e.target.value,
                        field.type,
                      );
                      onChange(formattedValue);
                    }}
                    onBlur={onBlur}
                    placeholder={field.placeholder}
                    className={rtlClass(`
                      w-full px-4 py-3 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    `)}
                    {...inputAttributes}
                  />
                );
            }
          }}
        />

        {errors[field.id] && (
          <p
            className={rtlClass(
              `text-sm text-red-600 dark:text-red-400 ${preferences.rtl ? 'text-right' : 'text-left'}`,
            )}
          >
            {errors[field.id]?.message as string}
          </p>
        )}

        {/* Cultural hints */}
        {field.weddingSpecific?.cultural &&
          weddingNorms.familyInvolvementLevel === 'high' && (
            <p
              className={rtlClass(
                `text-xs text-blue-600 dark:text-blue-400 ${preferences.rtl ? 'text-right' : 'text-left'}`,
              )}
            >
              {t('cultural_field_hint', preferences.language) ||
                'This field may require family consultation'}
            </p>
          )}
      </motion.div>
    );
  };

  return (
    <div
      className={`${className} max-w-lg mx-auto`}
      dir={preferences.rtl ? 'rtl' : 'ltr'}
    >
      {/* Form Header */}
      <div
        className={rtlClass(
          `mb-6 text-center ${preferences.rtl ? 'text-right' : 'text-left'}`,
        )}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {adaptedForm.title}
        </h1>
        {adaptedForm.description && (
          <p className="text-gray-600 dark:text-gray-400">
            {adaptedForm.description}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / Math.ceil(adaptedForm.fields.length / 3)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Render fields in groups of 3 for better mobile UX */}
        {adaptedForm.fields
          .slice(currentStep * 3, (currentStep + 1) * 3)
          .map(renderField)}

        {/* Navigation Buttons */}
        <div
          className={rtlClass(
            `flex justify-between items-center space-x-4 ${preferences.rtl ? 'space-x-reverse' : ''}`,
          )}
        >
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className={rtlClass(`
                px-6 py-3 bg-gray-100 text-gray-700 rounded-lg 
                hover:bg-gray-200 transition-colors
                ${preferences.rtl ? 'ml-4' : 'mr-4'}
              `)}
            >
              {t('back', preferences.language) || 'Back'}
            </button>
          )}

          <div className="flex-1" />

          {currentStep < Math.ceil(adaptedForm.fields.length / 3) - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('next', preferences.language) || 'Next'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`
                px-6 py-3 bg-green-500 text-white rounded-lg 
                hover:bg-green-600 disabled:bg-gray-400 
                transition-colors flex items-center space-x-2
              `}
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              <span>{t('submit', preferences.language) || 'Submit'}</span>
            </button>
          )}
        </div>
      </form>

      {/* Cultural Information Panel */}
      {weddingNorms.familyInvolvementLevel === 'high' && (
        <div
          className={rtlClass(
            `mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg ${preferences.rtl ? 'text-right' : 'text-left'}`,
          )}
        >
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('cultural_note', preferences.language) || 'Cultural Note'}
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {preferences.language === 'ar'
              ? 'قد تتطلب بعض القرارات موافقة العائلة'
              : preferences.language === 'zh'
                ? '某些决定可能需要家人同意'
                : preferences.language === 'hi'
                  ? 'कुछ निर्णयों के लिए परिवार की सहमति आवश्यक हो सकती है'
                  : 'Some decisions may require family approval according to cultural traditions.'}
          </p>
        </div>
      )}
    </div>
  );
};

// Hook for using wedding form templates
export const useWeddingFormTemplates = () => {
  const { preferences } = useCulturalAdaptations();

  const getTemplateById = (id: string): LocalizedWeddingForm | undefined => {
    return WEDDING_FORM_TEMPLATES.find((template) => template.id === id);
  };

  const getAvailableTemplates = (): LocalizedWeddingForm[] => {
    return WEDDING_FORM_TEMPLATES;
  };

  const createCustomField = (
    id: string,
    type: WeddingFormField['type'],
    label: string,
    required: boolean = false,
  ): WeddingFormField => {
    return {
      id,
      type,
      label,
      required,
      culturalVariations: {},
      weddingSpecific: {},
    };
  };

  return {
    getTemplateById,
    getAvailableTemplates,
    createCustomField,
    templates: WEDDING_FORM_TEMPLATES,
  };
};

export default MobileWeddingFormsLocalizer;
