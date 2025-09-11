import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  CameraIcon,
  CalendarIcon,
  UsersIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">WedSync</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Suppliers</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/wedsync/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
                  🎭 Demo Mode
                </Button>
              </Link>
              <Link href="/wedsync/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Wedding Business
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              {' '}Management
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your wedding business with client management, booking coordination,
            and automated workflows. Everything you need to grow your wedding services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login?redirect=supplier-portal">
              <Button size="lg" className="text-lg px-8">
                Start Your Business Journey
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8">
                🎭 Try Demo Mode
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Wedding Professionals
            </h2>
            <p className="text-lg text-gray-600">
              Manage your wedding business with tools designed specifically for suppliers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Client Management</h3>
              <p className="text-gray-600">
                Organize couples, track communications, and manage relationships
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Coordination</h3>
              <p className="text-gray-600">
                Schedule events, manage availability, and coordinate with venues
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CameraIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Portfolio Showcase</h3>
              <p className="text-gray-600">
                Display your work, manage galleries, and attract new clients
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Analytics</h3>
              <p className="text-gray-600">
                Track revenue, monitor performance, and grow your business
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Wedding Business?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of wedding professionals who trust WedSync
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login?redirect=supplier-portal">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Get Started Today
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 text-white border-white hover:bg-white hover:text-indigo-600">
                🎭 Explore Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <SparklesIcon className="h-6 w-6 text-indigo-400" />
                <span className="text-xl font-bold">WedSync</span>
              </div>
              <p className="text-gray-400">
                The complete wedding business management platform for suppliers.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For Suppliers</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/login?redirect=supplier-portal" className="hover:text-white">Supplier Portal</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo Mode</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For Couples</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://wedme.app" className="hover:text-white">WedMe.app</a></li>
                <li><Link href="/signup?type=couple" className="hover:text-white">Couple Signup</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 WedSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}