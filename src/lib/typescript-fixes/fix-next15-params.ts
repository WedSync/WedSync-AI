/**
 * TypeScript Fix Script for Next.js 15 Promise-based Params
 * This script contains patterns and utilities to systematically fix all param-related issues
 */

// Common pattern replacements for pages
export const PAGE_PARAM_FIXES = {
  // Single dynamic param (id)
  ID_PAGE_PATTERN: {
    oldInterface: `{
  params: { id: string };
}`,
    newInterface: `{
  params: Promise<{ id: string }>;
}`,
    oldUsage: 'params.id',
    newUsage: 'const { id } = await params;',
  },

  // Slug param pattern
  SLUG_PAGE_PATTERN: {
    oldInterface: `{
  params: { slug: string };
}`,
    newInterface: `{
  params: Promise<{ slug: string }>;
}`,
    oldUsage: 'params.slug',
    newUsage: 'const { slug } = await params;',
  },

  // Page with search params
  PAGE_WITH_SEARCH_PATTERN: {
    oldInterface: `{
  params: { slug: string };
  searchParams: { session?: string };
}`,
    newInterface: `{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}`,
    oldUsage: ['params.slug', 'searchParams.session'],
    newUsage: [
      'const { slug } = await params;',
      'const { session } = await searchParams;',
    ],
  },
};

// API Route handler fixes
export const API_ROUTE_FIXES = {
  // Dynamic API route context
  DYNAMIC_CONTEXT_PATTERN: {
    oldInterface: `{
  params: { id: string };
}`,
    newInterface: `{
  params: Promise<{ id: string }>;
}`,
    oldUsage: 'context.params.id',
    newUsage: 'const { id } = await context.params;',
  },
};

// Metadata generation fixes
export const METADATA_FIXES = {
  GENERATE_METADATA_PATTERN: {
    oldInterface: `{
  params: { slug: string };
}`,
    newInterface: `{
  params: Promise<{ slug: string }>;
}`,
    oldUsage: 'params.slug',
    newUsage: 'const { slug } = await params;',
  },
};

// Common TypeScript interface templates for Next.js 15
export const NEXT15_INTERFACES = {
  CLIENT_PAGE: `interface ClientPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}`,

  VENDOR_PAGE: `interface VendorPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}`,

  FORM_SLUG_PAGE: `interface FormPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}`,

  FORM_RECEIPT_PAGE: `interface FormReceiptPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string; [key: string]: string | string[] | undefined }>;
}`,

  API_ROUTE_CONTEXT: `interface ApiRouteContext {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}`,

  CLIENT_API_CONTEXT: `interface ClientApiContext {
  params: Promise<{ id: string }>;
}`,

  GENERATE_METADATA_PROPS: `interface GenerateMetadataProps {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}`,
};

// Utility functions for systematic fixes
export const createParamExtraction = (paramName: string) =>
  `const { ${paramName} } = await params;`;

export const createSearchParamExtraction = (paramNames: string[]) =>
  `const { ${paramNames.join(', ')} } = await searchParams;`;

export const createApiHandlerSignature = (contextInterface: string) => `
export async function GET(
  request: NextRequest,
  context: ${contextInterface}
): Promise<NextResponse> {
  const params = await context.params;
  // Handler logic here
}`;

// File patterns to fix
export const FILES_TO_FIX = [
  // Page files
  'src/app/**/page.tsx',
  'src/app/**/page.ts',

  // API routes
  'src/app/api/**/route.ts',

  // Layout files
  'src/app/**/layout.tsx',

  // Loading/error pages
  'src/app/**/loading.tsx',
  'src/app/**/error.tsx',
];

// Error patterns to match against TypeScript errors
export const ERROR_PATTERNS = {
  MISSING_PROMISE_PROPS:
    /Type.*does not satisfy the constraint.*PageProps.*Promise/,
  PARAM_ACCESS_ERROR: /Property.*does not exist on type.*Promise/,
  API_ROUTE_CONTEXT_ERROR: /ParamCheck.*RouteContext.*Promise/,
  METADATA_GENERATION_ERROR: /generateMetadata.*params.*Promise/,
};

// Systematic fix functions
export const fixPageComponent = (
  content: string,
  paramNames: string[],
  searchParamNames: string[] = [],
) => {
  let fixedContent = content;

  // Replace parameter destructuring
  paramNames.forEach((param) => {
    fixedContent = fixedContent.replace(
      new RegExp(`params\\.${param}`, 'g'),
      param,
    );
  });

  searchParamNames.forEach((param) => {
    fixedContent = fixedContent.replace(
      new RegExp(`searchParams\\.${param}`, 'g'),
      param,
    );
  });

  return fixedContent;
};

export const fixApiRoute = (content: string, paramNames: string[]) => {
  let fixedContent = content;

  // Add param extraction at the beginning of handlers
  const extractionCode =
    paramNames.length > 0
      ? `  const { ${paramNames.join(', ')} } = await context.params;\n`
      : '';

  // Insert extraction after context parameter
  fixedContent = fixedContent.replace(
    /(context: .*\) {[\s\S]*?)(\n  try|\n  const|\n  \/\/|\n  return)/,
    `$1\n${extractionCode}$2`,
  );

  return fixedContent;
};

// Validation functions
export const validateNext15Compliance = (content: string): boolean => {
  // Check if params are properly awaited
  const hasDirectParamAccess = /params\.[a-zA-Z_][a-zA-Z0-9_]*/.test(content);
  const hasDirectSearchParamAccess =
    /searchParams\.[a-zA-Z_][a-zA-Z0-9_]*/.test(content);

  return !hasDirectParamAccess && !hasDirectSearchParamAccess;
};

// Summary of changes needed
export const SYSTEMATIC_FIXES_NEEDED = `
NEXT.JS 15 TYPESCRIPT FIXES REQUIRED:

1. PAGE COMPONENTS (20+ files):
   - Update interface to use Promise<params>
   - Add await params extraction
   - Fix all param.field usages
   
2. API ROUTE HANDLERS (15+ files):
   - Update context interface to Promise<params>
   - Add param extraction at start of handlers
   - Fix all context.params.field usages
   
3. METADATA GENERATION (5+ files):
   - Update generateMetadata params to Promise
   - Add await params extraction
   
4. LAYOUT COMPONENTS (3+ files):
   - Update layout params to Promise
   - Handle children prop correctly

PRIORITY ORDER:
1. Pages with most errors (client/vendor edit pages)
2. API routes causing compilation blocks
3. Form-related pages and APIs
4. Utility and layout files

ESTIMATED COMPLETION: 2-3 hours with systematic approach
`;

export default {
  PAGE_PARAM_FIXES,
  API_ROUTE_FIXES,
  METADATA_FIXES,
  NEXT15_INTERFACES,
  createParamExtraction,
  createSearchParamExtraction,
  createApiHandlerSignature,
  FILES_TO_FIX,
  ERROR_PATTERNS,
  fixPageComponent,
  fixApiRoute,
  validateNext15Compliance,
  SYSTEMATIC_FIXES_NEEDED,
};
