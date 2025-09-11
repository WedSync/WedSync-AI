'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initBugsnag } from '@/lib/bugsnag'
import Bugsnag from '@bugsnag/js'

export function BugsnagProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Initialize Bugsnag on component mount
    initBugsnag()
    
    // Set up global error handler for unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (Bugsnag.isStarted()) {
          Bugsnag.notify(event.reason, (bugsnagEvent) => {
            bugsnagEvent.addMetadata('unhandled_promise', {
              type: 'unhandledrejection',
              pathname: window.location.pathname,
              timestamp: new Date().toISOString()
            })
          })
        }
      })
    }
  }, [])

  useEffect(() => {
    // Update navigation context for better error tracking
    if (Bugsnag.isStarted() && pathname) {
      Bugsnag.addMetadata('navigation', {
        current_path: pathname,
        page_category: getPageCategory(pathname),
        timestamp: new Date().toISOString()
      })
      
      // Set breadcrumb for navigation
      Bugsnag.leaveBreadcrumb('Navigation', {
        to: pathname,
        category: getPageCategory(pathname)
      })
    }
  }, [pathname])

  return <>{children}</>
}

// Categorize pages for better error context
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