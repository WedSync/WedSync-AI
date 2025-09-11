import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/supplier-portal', '/client/dashboard', '/admin/dashboard', '/(dashboard)']
  const adminRoutes = ['/admin']
  const supplierRoutes = ['/supplier-portal', '/(dashboard)', '/dashboard']
  const clientRoutes = ['/client']

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => {
    if (route.includes('(')) {
      // Handle route groups
      return pathname.startsWith(route.replace(/[()]/g, ''))
    }
    return pathname.startsWith(route)
  })

  // If accessing protected route without authentication, redirect to appropriate login
  if (isProtectedRoute && !user) {
    // Determine which login page to redirect to based on the route
    if (pathname.startsWith('/supplier-portal') || pathname.startsWith('/dashboard')) {
      // Supplier routes → WedSync login
      return NextResponse.redirect(new URL('/wedsync/login', request.url))
    } else if (pathname.startsWith('/client')) {
      // Client routes → WedMe.app login
      return NextResponse.redirect(new URL('/wedme/login', request.url))
    } else if (pathname.startsWith('/admin')) {
      // Admin routes → Admin login (to be created)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    } else {
      // Default to WedSync login for any other protected routes
      return NextResponse.redirect(new URL('/wedsync/login', request.url))
    }
  }

  // If user is authenticated, check role-based access
  if (user && isProtectedRoute) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, user_type')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role || profile?.user_type

      // Check admin access
      if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (!['admin', 'super_admin'].includes(userRole)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // Check supplier access
      if (supplierRoutes.some(route => {
        if (route.includes('(')) {
          return pathname.startsWith(route.replace(/[()]/g, ''))
        }
        return pathname.startsWith(route)
      })) {
        if (!['vendor', 'supplier'].includes(userRole)) {
          // If not a supplier, redirect based on their role
          if (['couple', 'client'].includes(userRole)) {
            return NextResponse.redirect(new URL('/client/dashboard', request.url))
          } else if (['admin', 'super_admin'].includes(userRole)) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url))
          }
        }
      }

      // Check client access
      if (clientRoutes.some(route => pathname.startsWith(route))) {
        if (!['couple', 'client'].includes(userRole)) {
          // If not a client, redirect based on their role
          if (['vendor', 'supplier'].includes(userRole)) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
          } else if (['admin', 'super_admin'].includes(userRole)) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url))
          }
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js).*)',
  ],
};
