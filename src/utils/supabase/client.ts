/**
 * Supabase Browser Client for Client Components
 *
 * SECURITY: Guardian Protocol Compliance
 * - Uses official @supabase/ssr package (replaces deprecated auth-helpers)
 * - Next.js 15 compatible
 * - Browser-side authentication for Client Components
 *
 * @author Senior Code Reviewer Guardian
 * @version 2.0 - Modern SSR Pattern
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
