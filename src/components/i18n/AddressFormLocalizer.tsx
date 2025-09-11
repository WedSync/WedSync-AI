'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type AddressFormatType,
  type TextDirection,
  type AddressField,
} from '@/types/i18n';

// =============================================================================
// ADDRESS FORMAT CONFIGURATIONS
// =============================================================================

const ADDRESS_FORMATS: Record<
  AddressFormatType,
  {
    name: string;
    description: string;
    fields: AddressField[];
    fieldOrder: AddressField[];
    labels: Record<
      AddressField,
      Record<WeddingMarketLocale | 'default', string>
    >;
    placeholders: Record<
      AddressField,
      Record<WeddingMarketLocale | 'default', string>
    >;
    validation: Record<
      AddressField,
      {
        required: boolean;
        pattern?: RegExp;
        maxLength?: number;
        minLength?: number;
      }
    >;
    postalCodePattern: RegExp;
    phonePattern: RegExp;
    displayFormat: (address: Record<AddressField, string>) => string;
    countries: WeddingMarketLocale[];
  }
> = {
  us: {
    name: 'US Format',
    description: 'United States address format',
    fields: ['street', 'street2', 'city', 'state', 'zipcode', 'country'],
    fieldOrder: ['street', 'street2', 'city', 'state', 'zipcode', 'country'],
    labels: {
      street: { default: 'Street Address', 'en-US': 'Street Address' },
      street2: { default: 'Apt/Suite/Unit', 'en-US': 'Apt, suite, unit, etc.' },
      city: { default: 'City', 'en-US': 'City' },
      state: { default: 'State', 'en-US': 'State' },
      province: { default: 'Province', 'en-US': 'State' },
      county: { default: 'County', 'en-US': 'County' },
      zipcode: { default: 'ZIP Code', 'en-US': 'ZIP Code' },
      postcode: { default: 'ZIP Code', 'en-US': 'ZIP Code' },
      country: { default: 'Country', 'en-US': 'Country' },
      region: { default: 'Region', 'en-US': 'Region' },
      prefecture: { default: 'Prefecture', 'en-US': 'State' },
      emirate: { default: 'Emirate', 'en-US': 'State' },
    },
    placeholders: {
      street: { default: '123 Main Street', 'en-US': '123 Main Street' },
      street2: { default: 'Apt 4B', 'en-US': 'Apt 4B' },
      city: { default: 'New York', 'en-US': 'New York' },
      state: { default: 'NY', 'en-US': 'NY' },
      province: { default: 'NY', 'en-US': 'NY' },
      county: { default: 'Queens County', 'en-US': 'Queens County' },
      zipcode: { default: '10001', 'en-US': '10001' },
      postcode: { default: '10001', 'en-US': '10001' },
      country: { default: 'United States', 'en-US': 'United States' },
      region: { default: 'Northeast', 'en-US': 'Northeast' },
      prefecture: { default: 'NY', 'en-US': 'NY' },
      emirate: { default: 'NY', 'en-US': 'NY' },
    },
    validation: {
      street: { required: true, minLength: 3, maxLength: 100 },
      street2: { required: false, maxLength: 50 },
      city: { required: true, minLength: 2, maxLength: 50 },
      state: { required: true, pattern: /^[A-Z]{2}$/ },
      province: { required: false },
      county: { required: false, maxLength: 50 },
      zipcode: { required: true, pattern: /^\d{5}(-\d{4})?$/ },
      postcode: { required: true, pattern: /^\d{5}(-\d{4})?$/ },
      country: { required: true },
      region: { required: false },
      prefecture: { required: false },
      emirate: { required: false },
    },
    postalCodePattern: /^\d{5}(-\d{4})?$/,
    phonePattern: /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
    displayFormat: (addr) =>
      `${addr.street}${addr.street2 ? ', ' + addr.street2 : ''}, ${addr.city}, ${addr.state} ${addr.zipcode}`,
    countries: ['en-US'],
  },
  uk: {
    name: 'UK Format',
    description: 'United Kingdom address format',
    fields: ['street', 'street2', 'city', 'county', 'postcode', 'country'],
    fieldOrder: ['street', 'street2', 'city', 'county', 'postcode', 'country'],
    labels: {
      street: { default: 'Address Line 1', 'en-GB': 'Address Line 1' },
      street2: {
        default: 'Address Line 2',
        'en-GB': 'Address Line 2 (optional)',
      },
      city: { default: 'Town/City', 'en-GB': 'Town or City' },
      state: { default: 'County', 'en-GB': 'County' },
      province: { default: 'County', 'en-GB': 'County' },
      county: { default: 'County', 'en-GB': 'County' },
      zipcode: { default: 'Postcode', 'en-GB': 'Postcode' },
      postcode: { default: 'Postcode', 'en-GB': 'Postcode' },
      country: { default: 'Country', 'en-GB': 'Country' },
      region: { default: 'Region', 'en-GB': 'Region' },
      prefecture: { default: 'County', 'en-GB': 'County' },
      emirate: { default: 'County', 'en-GB': 'County' },
    },
    placeholders: {
      street: { default: '123 High Street', 'en-GB': '123 High Street' },
      street2: { default: 'Flat 4B', 'en-GB': 'Flat 4B' },
      city: { default: 'London', 'en-GB': 'London' },
      state: { default: 'Greater London', 'en-GB': 'Greater London' },
      province: { default: 'Greater London', 'en-GB': 'Greater London' },
      county: { default: 'Greater London', 'en-GB': 'Greater London' },
      zipcode: { default: 'SW1A 1AA', 'en-GB': 'SW1A 1AA' },
      postcode: { default: 'SW1A 1AA', 'en-GB': 'SW1A 1AA' },
      country: { default: 'United Kingdom', 'en-GB': 'United Kingdom' },
      region: { default: 'England', 'en-GB': 'England' },
      prefecture: { default: 'Greater London', 'en-GB': 'Greater London' },
      emirate: { default: 'Greater London', 'en-GB': 'Greater London' },
    },
    validation: {
      street: { required: true, minLength: 3, maxLength: 100 },
      street2: { required: false, maxLength: 50 },
      city: { required: true, minLength: 2, maxLength: 50 },
      state: { required: false, maxLength: 50 },
      province: { required: false, maxLength: 50 },
      county: { required: false, maxLength: 50 },
      zipcode: {
        required: true,
        pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/,
      },
      postcode: {
        required: true,
        pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/,
      },
      country: { required: true },
      region: { required: false },
      prefecture: { required: false },
      emirate: { required: false },
    },
    postalCodePattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/,
    phonePattern: /^\+?44[-.\s]?[0-9]{4}[-.\s]?[0-9]{6}$/,
    displayFormat: (addr) =>
      `${addr.street}${addr.street2 ? ', ' + addr.street2 : ''}, ${addr.city}${addr.county ? ', ' + addr.county : ''} ${addr.postcode}`,
    countries: ['en-GB'],
  },
  eu: {
    name: 'European Format',
    description: 'Standard European address format',
    fields: ['street', 'street2', 'postcode', 'city', 'country'],
    fieldOrder: ['street', 'street2', 'postcode', 'city', 'country'],
    labels: {
      street: {
        default: 'Street Address',
        'de-DE': 'Straße',
        'fr-FR': 'Adresse',
      },
      street2: { default: 'Additional Address', 'de-DE': 'Adresszusatz' },
      city: { default: 'City', 'de-DE': 'Stadt', 'fr-FR': 'Ville' },
      state: { default: 'State', 'de-DE': 'Land', 'fr-FR': 'État' },
      province: { default: 'Province', 'de-DE': 'Land', 'fr-FR': 'Province' },
      county: { default: 'County', 'de-DE': 'Landkreis' },
      zipcode: { default: 'Postal Code', 'de-DE': 'PLZ' },
      postcode: {
        default: 'Postal Code',
        'de-DE': 'Postleitzahl',
        'fr-FR': 'Code postal',
      },
      country: { default: 'Country', 'de-DE': 'Land', 'fr-FR': 'Pays' },
      region: { default: 'Region', 'de-DE': 'Region' },
      prefecture: { default: 'Prefecture', 'de-DE': 'Region' },
      emirate: { default: 'Emirate', 'de-DE': 'Region' },
    },
    placeholders: {
      street: {
        default: 'Hauptstraße 123',
        'de-DE': 'Hauptstraße 123',
        'fr-FR': '123 Rue Principale',
      },
      street2: { default: 'Apt. 4B', 'de-DE': 'Wohnung 4B' },
      city: { default: 'Berlin', 'de-DE': 'Berlin', 'fr-FR': 'Paris' },
      state: { default: 'Berlin', 'de-DE': 'Berlin' },
      province: { default: 'Berlin', 'de-DE': 'Berlin' },
      county: { default: 'Berlin', 'de-DE': 'Berlin' },
      zipcode: { default: '10115', 'de-DE': '10115' },
      postcode: { default: '10115', 'de-DE': '10115', 'fr-FR': '75001' },
      country: {
        default: 'Deutschland',
        'de-DE': 'Deutschland',
        'fr-FR': 'France',
      },
      region: { default: 'Berlin', 'de-DE': 'Berlin' },
      prefecture: { default: 'Berlin', 'de-DE': 'Berlin' },
      emirate: { default: 'Berlin', 'de-DE': 'Berlin' },
    },
    validation: {
      street: { required: true, minLength: 3, maxLength: 100 },
      street2: { required: false, maxLength: 50 },
      city: { required: true, minLength: 2, maxLength: 50 },
      state: { required: false, maxLength: 50 },
      province: { required: false, maxLength: 50 },
      county: { required: false, maxLength: 50 },
      zipcode: { required: true, pattern: /^\d{4,5}$/ },
      postcode: { required: true, pattern: /^\d{4,5}$/ },
      country: { required: true },
      region: { required: false },
      prefecture: { required: false },
      emirate: { required: false },
    },
    postalCodePattern: /^\d{4,5}$/,
    phonePattern: /^\+?[1-9]\d{1,14}$/,
    displayFormat: (addr) =>
      `${addr.street}${addr.street2 ? ', ' + addr.street2 : ''}, ${addr.postcode} ${addr.city}`,
    countries: ['de-DE', 'fr-FR', 'es-ES', 'it-IT'],
  },
  arabic: {
    name: 'Arabic Format',
    description: 'Middle East and Arabic countries format',
    fields: ['street', 'street2', 'city', 'emirate', 'postcode', 'country'],
    fieldOrder: ['street', 'street2', 'city', 'emirate', 'postcode', 'country'],
    labels: {
      street: { default: 'Street Address', 'ar-AE': 'عنوان الشارع' },
      street2: { default: 'Building/Apartment', 'ar-AE': 'المبنى/الشقة' },
      city: { default: 'City', 'ar-AE': 'المدينة' },
      state: { default: 'State', 'ar-AE': 'الإمارة' },
      province: { default: 'Province', 'ar-AE': 'الإمارة' },
      county: { default: 'Area', 'ar-AE': 'المنطقة' },
      zipcode: { default: 'Postal Code', 'ar-AE': 'الرمز البريدي' },
      postcode: { default: 'Postal Code', 'ar-AE': 'الرمز البريدي' },
      country: { default: 'Country', 'ar-AE': 'الدولة' },
      region: { default: 'Region', 'ar-AE': 'المنطقة' },
      prefecture: { default: 'Region', 'ar-AE': 'المنطقة' },
      emirate: { default: 'Emirate', 'ar-AE': 'الإمارة' },
    },
    placeholders: {
      street: { default: 'Sheikh Zayed Road', 'ar-AE': 'شارع الشيخ زايد' },
      street2: { default: 'Building 123', 'ar-AE': 'المبنى ١٢٣' },
      city: { default: 'Dubai', 'ar-AE': 'دبي' },
      state: { default: 'Dubai', 'ar-AE': 'دبي' },
      province: { default: 'Dubai', 'ar-AE': 'دبي' },
      county: { default: 'Dubai', 'ar-AE': 'دبي' },
      zipcode: { default: '12345', 'ar-AE': '١٢٣٤٥' },
      postcode: { default: '12345', 'ar-AE': '١٢٣٤٥' },
      country: {
        default: 'United Arab Emirates',
        'ar-AE': 'دولة الإمارات العربية المتحدة',
      },
      region: { default: 'Gulf', 'ar-AE': 'الخليج' },
      prefecture: { default: 'Dubai', 'ar-AE': 'دبي' },
      emirate: { default: 'Dubai', 'ar-AE': 'دبي' },
    },
    validation: {
      street: { required: true, minLength: 3, maxLength: 100 },
      street2: { required: false, maxLength: 50 },
      city: { required: true, minLength: 2, maxLength: 50 },
      state: { required: false, maxLength: 50 },
      province: { required: false, maxLength: 50 },
      county: { required: false, maxLength: 50 },
      zipcode: { required: false, pattern: /^\d{4,6}$/ },
      postcode: { required: false, pattern: /^\d{4,6}$/ },
      country: { required: true },
      region: { required: false },
      prefecture: { required: false },
      emirate: { required: true, maxLength: 50 },
    },
    postalCodePattern: /^\d{4,6}$/,
    phonePattern: /^\+?971[-.\s]?[0-9]{1}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
    displayFormat: (addr) =>
      `${addr.street}${addr.street2 ? ', ' + addr.street2 : ''}, ${addr.city}, ${addr.emirate}`,
    countries: ['ar-AE', 'ar-SA'],
  },
  asian: {
    name: 'Asian Format',
    description: 'East Asian address format',
    fields: ['country', 'prefecture', 'city', 'street', 'street2'],
    fieldOrder: ['country', 'prefecture', 'city', 'street', 'street2'],
    labels: {
      street: { default: 'Street Address', 'zh-CN': '街道地址' },
      street2: { default: 'Building/Room', 'zh-CN': '建筑物/房间' },
      city: { default: 'City', 'zh-CN': '城市' },
      state: { default: 'State', 'zh-CN': '省' },
      province: { default: 'Province', 'zh-CN': '省' },
      county: { default: 'County', 'zh-CN': '县' },
      zipcode: { default: 'Postal Code', 'zh-CN': '邮政编码' },
      postcode: { default: 'Postal Code', 'zh-CN': '邮政编码' },
      country: { default: 'Country', 'zh-CN': '国家' },
      region: { default: 'Region', 'zh-CN': '地区' },
      prefecture: { default: 'Prefecture/Province', 'zh-CN': '省/市' },
      emirate: { default: 'Region', 'zh-CN': '地区' },
    },
    placeholders: {
      street: { default: '1-2-3 Shibuya', 'zh-CN': '北京路123号' },
      street2: { default: 'Building A', 'zh-CN': 'A座' },
      city: { default: 'Tokyo', 'zh-CN': '上海市' },
      state: { default: 'Tokyo', 'zh-CN': '上海' },
      province: { default: 'Tokyo', 'zh-CN': '上海' },
      county: { default: 'Shibuya', 'zh-CN': '浦东新区' },
      zipcode: { default: '100-0001', 'zh-CN': '200000' },
      postcode: { default: '100-0001', 'zh-CN': '200000' },
      country: { default: 'Japan', 'zh-CN': '中国' },
      region: { default: 'Kanto', 'zh-CN': '华东' },
      prefecture: { default: 'Tokyo', 'zh-CN': '上海市' },
      emirate: { default: 'Tokyo', 'zh-CN': '上海' },
    },
    validation: {
      street: { required: true, minLength: 3, maxLength: 100 },
      street2: { required: false, maxLength: 50 },
      city: { required: true, minLength: 2, maxLength: 50 },
      state: { required: false, maxLength: 50 },
      province: { required: false, maxLength: 50 },
      county: { required: false, maxLength: 50 },
      zipcode: { required: true, pattern: /^\d{6}$|^\d{3}-\d{4}$/ },
      postcode: { required: true, pattern: /^\d{6}$|^\d{3}-\d{4}$/ },
      country: { required: true },
      region: { required: false },
      prefecture: { required: true, maxLength: 50 },
      emirate: { required: false },
    },
    postalCodePattern: /^\d{6}$|^\d{3}-\d{4}$/,
    phonePattern: /^\+?86[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}[-.\s]?[0-9]{4}$/,
    displayFormat: (addr) =>
      `${addr.country} ${addr.prefecture} ${addr.city} ${addr.street}${addr.street2 ? ' ' + addr.street2 : ''}`,
    countries: ['zh-CN', 'ja-JP'],
  },
};

// Get address format from locale
const getAddressFormatFromLocale = (
  locale: WeddingMarketLocale,
): AddressFormatType => {
  if (locale.startsWith('en-US')) return 'us';
  if (locale.startsWith('en-GB')) return 'uk';
  if (['de-DE', 'fr-FR', 'es-ES', 'it-IT'].some((l) => locale.startsWith(l)))
    return 'eu';
  if (locale.startsWith('ar-')) return 'arabic';
  if (['zh-CN', 'ja-JP'].some((l) => locale.startsWith(l))) return 'asian';
  return 'us';
};

// Component interfaces
export interface AddressFormLocalizerProps {
  locale: WeddingMarketLocale;
  direction?: TextDirection;
  addressType?:
    | 'venue'
    | 'supplier'
    | 'client'
    | 'shipping'
    | 'billing'
    | 'general';
  values?: Partial<Record<AddressField, string>>;
  onChange?: (values: Record<AddressField, string>) => void;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<AddressField, string>,
  ) => void;
  className?: string;
  showFormatSelector?: boolean;
  requiredFields?: AddressField[];
  disabled?: boolean;
  weddingContext?: {
    venueAddress?: boolean;
    internationalGuests?: boolean;
    destinationWedding?: boolean;
  };
}

// Main component
export const AddressFormLocalizer: React.FC<AddressFormLocalizerProps> = ({
  locale,
  direction = 'ltr',
  addressType = 'general',
  values = {},
  onChange,
  onValidationChange,
  className = '',
  showFormatSelector = false,
  requiredFields,
  disabled = false,
  weddingContext = {},
}) => {
  const [selectedFormat, setSelectedFormat] = useState<AddressFormatType>(() =>
    getAddressFormatFromLocale(locale),
  );
  const [formValues, setFormValues] = useState<Record<AddressField, string>>(
    values as Record<AddressField, string>,
  );
  const [errors, setErrors] = useState<Record<AddressField, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<AddressField>>(
    new Set(),
  );

  const formatConfig = ADDRESS_FORMATS[selectedFormat];
  const isRTL = direction === 'rtl';

  // Update format when locale changes
  useEffect(() => {
    const newFormat = getAddressFormatFromLocale(locale);
    setSelectedFormat(newFormat);
  }, [locale]);

  // Determine which fields are required
  const getRequiredFields = useMemo(() => {
    if (requiredFields) return requiredFields;

    const baseRequired: AddressField[] = ['street', 'city'];

    if (addressType === 'venue' || weddingContext.venueAddress) {
      return [...baseRequired, 'country'];
    }

    if (
      weddingContext.internationalGuests ||
      weddingContext.destinationWedding
    ) {
      return [
        ...baseRequired,
        'country',
        selectedFormat === 'us' ? 'zipcode' : 'postcode',
      ];
    }

    return formatConfig.fields.filter(
      (field) => formatConfig.validation[field].required,
    );
  }, [
    requiredFields,
    addressType,
    weddingContext,
    selectedFormat,
    formatConfig,
  ]);

  // Validation function
  const validateField = (field: AddressField, value: string): string | null => {
    const config = formatConfig.validation[field];
    if (!config) return null;

    if (getRequiredFields.includes(field) && !value.trim()) {
      return `${formatConfig.labels[field][locale] || formatConfig.labels[field].default} is required`;
    }

    if (!value.trim()) return null;

    if (config.pattern && !config.pattern.test(value)) {
      return `Invalid ${formatConfig.labels[field][locale] || formatConfig.labels[field].default} format`;
    }

    if (config.minLength && value.length < config.minLength) {
      return `${formatConfig.labels[field][locale] || formatConfig.labels[field].default} must be at least ${config.minLength} characters`;
    }

    if (config.maxLength && value.length > config.maxLength) {
      return `${formatConfig.labels[field][locale] || formatConfig.labels[field].default} must be no more than ${config.maxLength} characters`;
    }

    return null;
  };

  // Handle field change
  const handleFieldChange = (field: AddressField, value: string) => {
    const newValues = { ...formValues, [field]: value };
    setFormValues(newValues);

    const error = validateField(field, value);
    const newErrors = { ...errors, [field]: error || '' };
    setErrors(newErrors);

    onChange?.(newValues);

    const isValid = Object.values(newErrors).every((err) => !err);
    onValidationChange?.(isValid, newErrors);
  };

  // Handle field blur
  const handleFieldBlur = (field: AddressField) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  };

  // Render field input
  const renderField = (field: AddressField) => {
    const label =
      formatConfig.labels[field][locale] || formatConfig.labels[field].default;
    const placeholder =
      formatConfig.placeholders[field][locale] ||
      formatConfig.placeholders[field].default;
    const isRequired = getRequiredFields.includes(field);
    const hasError = errors[field] && touchedFields.has(field);
    const value = formValues[field] || '';

    return (
      <div key={field} className="space-y-1">
        <label
          htmlFor={`address-${field}`}
          className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}
            ${isRequired ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}`}
        >
          {label}
        </label>

        <input
          id={`address-${field}`}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          onBlur={() => handleFieldBlur(field)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            transition-colors duration-200
            ${
              hasError
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
            ${isRTL ? 'text-right' : 'text-left'}
          `}
          dir={direction}
        />

        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-red-600"
          >
            <AlertCircleIcon className="w-4 h-4" />
            <span>{errors[field]}</span>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 ${isRTL ? 'text-right' : 'text-left'}`}
      >
        <MapPinIcon className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">
          {addressType === 'venue'
            ? 'Venue Address'
            : addressType === 'supplier'
              ? 'Business Address'
              : addressType === 'client'
                ? 'Client Address'
                : addressType === 'shipping'
                  ? 'Shipping Address'
                  : addressType === 'billing'
                    ? 'Billing Address'
                    : 'Address Information'}
        </h3>
      </div>

      {/* Format Selector */}
      {showFormatSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) =>
              setSelectedFormat(e.target.value as AddressFormatType)
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={disabled}
          >
            {Object.entries(ADDRESS_FORMATS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name} - {config.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Wedding Context Info */}
      {(weddingContext.internationalGuests ||
        weddingContext.destinationWedding) && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                International Wedding Considerations:
              </p>
              <ul className="space-y-1">
                {weddingContext.internationalGuests && (
                  <li>• Include complete address for international guests</li>
                )}
                {weddingContext.destinationWedding && (
                  <li>
                    • Destination wedding - ensure all location details are
                    accurate
                  </li>
                )}
                <li>
                  • Consider adding landmark references for better navigation
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Address Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        {formatConfig.fieldOrder.map((field) => renderField(field))}
      </div>

      {/* Address Preview */}
      {Object.keys(formValues).length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Address Preview:</h4>
          <div
            className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {formatConfig.displayFormat(formValues)}
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-2">
                Please correct the following errors:
              </p>
              <ul className="space-y-1">
                {Object.entries(errors)
                  .filter(([_, error]) => error)
                  .map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {Object.keys(errors).length === 0 &&
        Object.keys(formValues).length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-800">
                Address information is valid and complete
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

export default AddressFormLocalizer;
