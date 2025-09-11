'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog } from '@/lib/posthog'
import posthog from 'posthog-js'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize PostHog on component mount
    initPostHog()
  }, [])

  useEffect(() => {
    // Track pageviews when route changes
    if (posthog.__loaded && pathname) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      
      posthog.capture('$pageview', {
        $current_url: url,
        page: pathname,
        // Wedding-specific page categorization
        page_category: getPageCategory(pathname),
        is_wedding_day: isWeddingDay(),
      })
    }
  }, [pathname, searchParams])

  return <>{children}</>
}

// Categorize pages for better analytics
function getPageCategory(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/forms')) return 'form_builder'
  if (pathname.startsWith('/journeys')) return 'journey_builder'
  if (pathname.startsWith('/clients')) return 'client_management'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/billing')) return 'billing'
  if (pathname.startsWith('/integrations')) return 'integrations'
  if (pathname.startsWith('/analytics')) return 'analytics'
  if (pathname === '/') return 'landing'
  if (pathname === '/pricing') return 'pricing'
  if (pathname === '/login' || pathname === '/signup') return 'auth'
  return 'other'
}

// Check if it's a Saturday (wedding day)
function isWeddingDay(): boolean {
  return new Date().getDay() === 6 // Saturday
}