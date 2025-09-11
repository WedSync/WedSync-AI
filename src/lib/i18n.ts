/**
 * WS-247 Multilingual Platform System - i18n Configuration
 *
 * React i18next configuration for WedSync multilingual support
 * Supports 20+ languages with RTL support and cultural adaptations
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-resources-to-backend';

// Translation resources
const resources = {
  en: {
    common: {
      welcome: 'Welcome to WedSync',
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      export: 'Export',
      import: 'Import',
      settings: 'Settings',
      help: 'Help',
      logout: 'Logout',
    },
    wedding: {
      planning: {
        title: 'Wedding Planning',
        timeline: 'Timeline',
        budget: 'Budget',
        guestList: 'Guest List',
        venues: 'Venues',
        vendors: 'Vendors',
        checklist: 'Checklist',
      },
      traditions: {
        western: {
          ceremony: {
            title: 'Western Ceremony',
            description: 'Traditional Western wedding ceremony',
          },
          reception: {
            title: 'Reception',
            description: 'Wedding reception celebration',
          },
        },
        islamic: {
          nikah: {
            title: 'Nikah Ceremony',
            description: 'Islamic marriage ceremony',
          },
          walima: {
            title: 'Walima Reception',
            description: 'Islamic wedding reception',
          },
        },
        jewish: {
          ceremony: {
            title: 'Jewish Wedding Ceremony',
            description: 'Traditional Jewish wedding ceremony',
          },
          reception: {
            title: 'Jewish Reception',
            description: 'Jewish wedding celebration',
          },
        },
        hindu: {
          ceremony: {
            title: 'Hindu Wedding Ceremony',
            description: 'Traditional Hindu wedding ceremony',
          },
          reception: {
            title: 'Hindu Reception',
            description: 'Hindu wedding celebration',
          },
        },
        chinese: {
          ceremony: {
            title: 'Chinese Wedding Ceremony',
            description: 'Traditional Chinese wedding ceremony',
          },
          reception: {
            title: 'Chinese Reception',
            description: 'Chinese wedding celebration',
          },
        },
      },
    },
    calendar: {
      gregorian: {
        title: 'Gregorian Calendar',
      },
      hijri: {
        title: 'Hijri Calendar',
      },
      hebrew: {
        title: 'Hebrew Calendar',
      },
      hindu: {
        title: 'Hindu Calendar',
      },
      chinese: {
        title: 'Chinese Calendar',
      },
      thai: {
        title: 'Thai Calendar',
      },
    },
    religious: {
      christian: {
        texts: {
          corinthians: {
            title: 'Corinthians 13:4-7',
            content: 'Love is patient, love is kind...',
          },
        },
      },
      islamic: {
        texts: {
          quran: {
            title: 'Quran 30:21',
            content: 'And among His signs is that He created for you mates...',
          },
        },
      },
      jewish: {
        texts: {
          torah: {
            title: 'Song of Songs 6:3',
            content: "I am my beloved's and my beloved is mine...",
          },
        },
      },
    },
    categories: {
      venue: 'Venue',
      catering: 'Catering',
      photography: 'Photography',
      music: 'Music',
      flowers: 'Flowers',
      decoration: 'Decoration',
      transportation: 'Transportation',
    },
    culture: {
      western: 'Western',
      arabic: 'Arabic',
      jewish: 'Jewish',
      hindu: 'Hindu',
      chinese: 'Chinese',
    },
    navigation: {
      dashboard: 'Dashboard',
      clients: 'Clients',
      bookings: 'Bookings',
      calendar: 'Calendar',
      gallery: 'Gallery',
      invoices: 'Invoices',
      reports: 'Reports',
    },
    forms: {
      validation: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid phone number',
      },
    },
  },
  es: {
    common: {
      welcome: 'Bienvenido a WedSync',
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      continue: 'Continuar',
      back: 'Atrás',
      next: 'Siguiente',
      previous: 'Anterior',
      submit: 'Enviar',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
      import: 'Importar',
      settings: 'Configuración',
      help: 'Ayuda',
      logout: 'Cerrar sesión',
    },
    wedding: {
      planning: {
        title: 'Planificación de Boda',
        timeline: 'Cronograma',
        budget: 'Presupuesto',
        guestList: 'Lista de Invitados',
        venues: 'Locales',
        vendors: 'Proveedores',
        checklist: 'Lista de Verificación',
      },
    },
  },
  fr: {
    common: {
      welcome: 'Bienvenue à WedSync',
      loading: 'Chargement...',
      save: 'Sauvegarder',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      continue: 'Continuer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      submit: 'Soumettre',
      search: 'Rechercher',
      filter: 'Filtrer',
      sort: 'Trier',
      export: 'Exporter',
      import: 'Importer',
      settings: 'Paramètres',
      help: 'Aide',
      logout: 'Se déconnecter',
    },
    wedding: {
      planning: {
        title: 'Planification de Mariage',
        timeline: 'Chronologie',
        budget: 'Budget',
        guestList: 'Liste des Invités',
        venues: 'Lieux',
        vendors: 'Fournisseurs',
        checklist: 'Liste de Contrôle',
      },
    },
  },
  ar: {
    common: {
      welcome: 'مرحبا بك في WedSync',
      loading: 'جاري التحميل...',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      continue: 'متابعة',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      search: 'بحث',
      filter: 'تصفية',
      sort: 'ترتيب',
      export: 'تصدير',
      import: 'استيراد',
      settings: 'الإعدادات',
      help: 'المساعدة',
      logout: 'تسجيل الخروج',
    },
    wedding: {
      planning: {
        title: 'تخطيط الزفاف',
        timeline: 'الجدول الزمني',
        budget: 'الميزانية',
        guestList: 'قائمة الضيوف',
        venues: 'الأماكن',
        vendors: 'الموردين',
        checklist: 'قائمة المراجعة',
      },
    },
  },
  zh: {
    common: {
      welcome: '欢迎使用 WedSync',
      loading: '加载中...',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      continue: '继续',
      back: '返回',
      next: '下一步',
      previous: '上一步',
      submit: '提交',
      search: '搜索',
      filter: '筛选',
      sort: '排序',
      export: '导出',
      import: '导入',
      settings: '设置',
      help: '帮助',
      logout: '退出',
    },
    wedding: {
      planning: {
        title: '婚礼策划',
        timeline: '时间线',
        budget: '预算',
        guestList: '宾客名单',
        venues: '场地',
        vendors: '供应商',
        checklist: '检查清单',
      },
    },
  },
};

// Initialize i18n
i18n
  .use(
    Backend(
      (language, namespace) =>
        import(`../locales/${language}/${namespace}.json`),
    ),
  )
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Debug mode
    debug: process.env.NODE_ENV === 'development',

    // Language settings
    lng: 'en', // Default language
    fallbackLng: 'en',
    supportedLngs: [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'ar',
      'he',
      'zh',
      'ja',
      'ko',
      'hi',
      'th',
      'vi',
      'tr',
      'pl',
      'nl',
      'sv',
      'da',
    ],

    // Namespace settings
    defaultNS: 'common',
    ns: ['common', 'wedding', 'calendar', 'religious', 'forms', 'navigation'],

    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
      prefix: '{{',
      suffix: '}}',
    },

    // Resource settings
    resources,

    // Loading settings
    load: 'languageOnly', // Don't load country-specific variants
    preload: ['en', 'es', 'fr', 'ar', 'zh'],

    // Backend settings
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Detection settings
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'],
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
    },

    // React settings
    react: {
      useSuspense: false, // Disable suspense for testing
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },

    // Keyseparator settings
    keySeparator: '.',
    nsSeparator: ':',

    // Plural settings
    pluralSeparator: '_',

    // Context settings
    contextSeparator: '_',

    // Performance settings
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler:
      process.env.NODE_ENV === 'development'
        ? (lng, ns, key) => console.warn(`Missing translation key: ${key}`)
        : undefined,

    // Wedding-specific settings
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,
    joinArrays: ' ',

    // Cultural settings for RTL support
    rtl: {
      languages: ['ar', 'he', 'fa', 'ur'],
      attribute: 'dir',
      value: 'rtl',
    },
  });

export default i18n;
