// Missing Module Declarations for TypeScript Compliance

// DND Kit modifiers (missing from current installation)
declare module '@dnd-kit/modifiers' {
  import { Modifier } from '@dnd-kit/core';

  export const restrictToFirstScrollableAncestor: Modifier;
  export const restrictToHorizontalAxis: Modifier;
  export const restrictToVerticalAxis: Modifier;
  export const restrictToWindowEdges: Modifier;
  export const snapCenterToCursor: Modifier;
  export const createSnapModifier: (snapToGrid: number) => Modifier;
}

// Additional DND Kit types that might be missing
declare module '@dnd-kit/utilities' {
  export const CSS: {
    Translate: {
      toString(transform: {
        x: number;
        y: number;
        scaleX?: number;
        scaleY?: number;
      }): string;
    };
    Transform: {
      toString(transform: {
        x: number;
        y: number;
        scaleX?: number;
        scaleY?: number;
      }): string;
    };
  };

  export function getEventCoordinates(
    event: Event,
  ): { x: number; y: number } | null;
}

// Supabase Auth Helpers (older version compatibility)
declare module '@supabase/auth-helpers-nextjs' {
  import { SupabaseClient } from '@supabase/supabase-js';
  import { Database } from '@/lib/supabase/types';

  export function createServerComponentClient<T = Database>(options?: {
    cookies?: () => any;
  }): SupabaseClient<T>;

  export function createClientComponentClient<
    T = Database,
  >(): SupabaseClient<T>;

  export function createRouteHandlerClient<T = Database>(options?: {
    cookies?: () => any;
  }): SupabaseClient<T>;

  export function createMiddlewareClient<T = Database>(options?: {
    req: any;
    res: any;
  }): SupabaseClient<T>;
}

// Radix UI components that might be missing types
declare module '@radix-ui/react-toast' {
  import * as React from 'react';

  export const Provider: React.FC<{
    children: React.ReactNode;
    swipeDirection?: 'up' | 'down' | 'left' | 'right';
  }>;
  export const Root: React.FC<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    duration?: number;
    children: React.ReactNode;
  }>;
  export const Title: React.FC<{
    children: React.ReactNode;
    className?: string;
  }>;
  export const Description: React.FC<{
    children: React.ReactNode;
    className?: string;
  }>;
  export const Action: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }>;
  export const Close: React.FC<{
    children: React.ReactNode;
    className?: string;
  }>;
  export const Viewport: React.FC<{ className?: string }>;
}

// Class Variance Authority
declare module 'class-variance-authority' {
  export type VariantProps<T extends (...args: any) => any> = Parameters<T>[0];

  export interface CVAConfig {
    variants?: Record<string, Record<string, string>>;
    compoundVariants?: Array<Record<string, any>>;
    defaultVariants?: Record<string, any>;
  }

  export function cva(
    base?: string,
    config?: CVAConfig,
  ): (...args: any[]) => string;
}

// Lucide React icons
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    strokeWidth?: string | number;
  }

  export const CheckCircle: FC<IconProps>;
  export const Download: FC<IconProps>;
  export const Mail: FC<IconProps>;
  export const Phone: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const MapPin: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const Minus: FC<IconProps>;
  export const Edit: FC<IconProps>;
  export const Trash: FC<IconProps>;
  export const Save: FC<IconProps>;
  export const Upload: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Filter: FC<IconProps>;
  export const Menu: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const User: FC<IconProps>;
  export const Lock: FC<IconProps>;
  export const Unlock: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const EyeOff: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const ChevronUp: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const ArrowLeft: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const Loading: FC<IconProps>;
  export const Loader: FC<IconProps>;
  export const Loader2: FC<IconProps>;
  export const AlertCircle: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const Info: FC<IconProps>;
  export const HelpCircle: FC<IconProps>;
}

// Next Themes
declare module 'next-themes' {
  import { ReactNode } from 'react';

  interface ThemeProviderProps {
    children: ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
    themes?: string[];
  }

  export const ThemeProvider: React.FC<ThemeProviderProps>;
  export function useTheme(): {
    theme: string | undefined;
    setTheme: (theme: string) => void;
    resolvedTheme: string | undefined;
    themes: string[];
    systemTheme: string | undefined;
  };
}

// TailwindCSS utilities
declare module 'tailwindcss/lib/util/flattenColorPalette' {
  export default function flattenColorPalette(
    colors: any,
  ): Record<string, string>;
}

declare module 'tailwindcss/plugin' {
  interface PluginAPI {
    addUtilities: (utilities: Record<string, any>) => void;
    addComponents: (components: Record<string, any>) => void;
    addBase: (base: Record<string, any>) => void;
    addVariant: (name: string, definition: string | string[]) => void;
    e: (selector: string) => string;
    prefix: (selector: string) => string;
    theme: (path: string) => any;
    variants: (path: string) => any;
    config: any;
    corePlugins: (path: string) => boolean;
    matchUtilities: (utilities: Record<string, any>, options?: any) => void;
  }

  export default function plugin(
    callback: (api: PluginAPI) => void,
    config?: any,
  ): any;
}

// File processing libraries
declare module 'pdf-lib' {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    static load(data: ArrayBuffer | Uint8Array): Promise<PDFDocument>;
    addPage(): any;
    getPages(): any[];
    save(): Promise<Uint8Array>;
    embedFont(font: any): Promise<any>;
    embedPdf(pdf: PDFDocument): Promise<any>;
  }

  export const StandardFonts: {
    Helvetica: string;
    HelveticaBold: string;
    TimesRoman: string;
    TimesRomanBold: string;
    Courier: string;
    CourierBold: string;
  };

  export function degrees(angle: number): number;
}

declare module 'tesseract.js' {
  export interface Worker {
    load(): Promise<void>;
    loadLanguage(lang: string): Promise<void>;
    initialize(lang: string): Promise<void>;
    recognize(
      image: any,
    ): Promise<{ data: { text: string; confidence: number } }>;
    terminate(): Promise<void>;
  }

  export function createWorker(): Worker;
  export function recognize(
    image: any,
    lang?: string,
  ): Promise<{ data: { text: string; confidence: number } }>;
}

// Crypto utilities
declare module 'crypto-js' {
  export namespace SHA256 {
    function create(): any;
    function update(message: string): any;
    function finalize(): string;
  }

  export function SHA256(message: string): { toString: () => string };

  export namespace AES {
    function encrypt(message: string, key: string): { toString: () => string };
    function decrypt(
      encrypted: string,
      key: string,
    ): { toString: (encoding: any) => string };
  }

  export const enc: {
    Utf8: any;
    Base64: any;
    Hex: any;
  };
}

// QR Code generation
declare module 'qrcode' {
  export interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
  }

  export function toDataURL(
    text: string,
    options?: QRCodeOptions,
  ): Promise<string>;
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions,
  ): Promise<void>;
  export function toString(
    text: string,
    options?: QRCodeOptions,
  ): Promise<string>;
}

// Chart.js for analytics
declare module 'chart.js' {
  export interface ChartData {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  }

  export interface ChartOptions {
    responsive?: boolean;
    plugins?: any;
    scales?: any;
  }

  export class Chart {
    constructor(
      ctx: HTMLCanvasElement | string,
      config: {
        type: string;
        data: ChartData;
        options?: ChartOptions;
      },
    );

    destroy(): void;
    update(): void;
    render(): void;
  }
}

// Date utilities
declare module 'date-fns' {
  export function format(date: Date | number, format: string): string;
  export function parse(
    dateString: string,
    format: string,
    referenceDate: Date,
  ): Date;
  export function isValid(date: any): boolean;
  export function addDays(date: Date | number, amount: number): Date;
  export function addMonths(date: Date | number, amount: number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function differenceInDays(
    dateLeft: Date | number,
    dateRight: Date | number,
  ): number;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
}

// Global declarations for environment
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      DATABASE_URL: string;
      OPENAI_API_KEY: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_PUBLISHABLE_KEY: string;
      WEBHOOK_SECRET: string;
      RESEND_API_KEY: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }

  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Enterprise SSO Integration modules
declare module 'ldapjs' {
  export interface Client {
    bind(dn: string, password: string, callback: (err: any) => void): void;
    search(
      base: string,
      options: any,
      callback: (err: any, res: any) => void,
    ): void;
    unbind(callback?: (err: any) => void): void;
    on(event: string, callback: Function): void;
    destroy(): void;
  }

  export function createClient(options: {
    url: string;
    timeout?: number;
    connectTimeout?: number;
    idleTimeout?: number;
    reconnect?: boolean;
  }): Client;
}

declare module 'auth0' {
  export interface User {
    user_id?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
    phone_number?: string;
    phone_verified?: boolean;
    created_at?: string;
    updated_at?: string;
    identities?: Array<{
      connection: string;
      user_id: string;
      provider: string;
      isSocial: boolean;
    }>;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    [key: string]: any;
  }

  // Auth0 user profile interface (matches the actual Auth0 user structure)
  export interface Auth0UserProfile extends User {
    user_id: string;
    email: string;
    name: string;
    nickname: string;
    picture: string;
    given_name: string;
    family_name: string;
    phone_number: string;
    email_verified: boolean;
    phone_verified?: boolean;
    created_at?: string;
    updated_at?: string;
    identities?: Array<{
      connection: string;
      user_id: string;
      provider: string;
      isSocial: boolean;
    }>;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    [key: string]: any;
  }

  export interface Role {
    id?: string;
    name?: string;
    description?: string;
    permissions?: Permission[];
  }

  export interface Permission {
    resource_server_identifier?: string;
    permission_name?: string;
  }

  export interface Organization {
    id?: string;
    name?: string;
    display_name?: string;
  }

  export class AuthenticationApi {
    constructor(options: any);
    oauth: {
      passwordGrant(options: any, callback: Function): void;
      authorizationCodeGrant(options: any, callback: Function): void;
    };
  }

  export class ManagementApi {
    constructor(options: any);
    users: {
      get(params: any, callback: Function): void;
      update(params: any, data: any, callback: Function): void;
      create(data: any, callback: Function): void;
      delete(params: any, callback: Function): void;
    };
    organizations: {
      create(data: any, callback: Function): void;
      get(params: any, callback: Function): void;
      addMembers(params: any, data: any, callback: Function): void;
    };
  }
}

declare module 'generic-pool' {
  export interface Pool<T> {
    acquire(): Promise<T>;
    release(resource: T): void;
    destroy(resource: T): void;
    clear(): void;
  }

  export function createPool<T>(factory: any, options?: any): Pool<T>;
}

declare module 'node-cron' {
  export interface ScheduledTask {
    destroy(): void;
  }

  export function schedule(
    cronExpression: string,
    task: Function,
    options?: any,
  ): ScheduledTask;
  export function destroy(task?: ScheduledTask): void;
}

// Azure AD and Microsoft Graph API types
declare module '@azure/msal-node' {
  export interface AzureUserProfile {
    id: string;
    userPrincipalName: string;
    displayName: string;
    givenName: string;
    surname: string;
    mail: string;
    userType: string;
    accountEnabled: boolean;
    employeeId: string;
    department: string;
    jobTitle: string;
    companyName: string;
    officeLocation: string;
    mobilePhone: string;
    businessPhones: string[];
    [key: string]: any;
  }

  export class Client {
    users: {
      get(params: any, callback: Function): void;
      update(params: any, data: any, callback: Function): void;
      create(data: any, callback: Function): void;
      delete(params: any, callback: Function): void;
    };
    groups: {
      get(params: any, callback: Function): void;
      list(params: any, callback: Function): void;
    };
    constructor(options: any);
  }

  export interface AuthenticationResult {
    accessToken: string;
    account: {
      username: string;
      localAccountId: string;
      name?: string;
    };
  }

  export interface DeviceCodeRequest {
    scopes: string[];
    deviceCodeCallback: (response: any) => void;
  }

  export class ConfidentialClientApplication {
    constructor(config: any);
    acquireTokenByDeviceCode(
      request: DeviceCodeRequest,
    ): Promise<AuthenticationResult>;
  }
}

export {};
