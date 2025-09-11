'use client';

import { useState, useEffect, memo } from 'react';
import {
  Menu,
  X,
  Home,
  FileText,
  Users,
  Calendar,
  Settings,
  LogOut,
  Camera,
  MapPin,
  Flower2,
  ChefHat,
  MessageSquare,
  Bell,
  Search,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  vendorType?: 'photographer' | 'venue' | 'florist' | 'caterer';
}

// B-MAD Enhanced: Wedding vendor optimized navigation with industry-specific shortcuts
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Forms', href: '/forms', icon: FileText, badge: 3 },
  { label: 'Clients', href: '/clients', icon: Users, badge: 12 },
  { label: 'Messages', href: '/communications', icon: MessageSquare, badge: 5 },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Wedding vendor specific quick actions
const vendorQuickActions = [
  {
    label: 'Photo Upload',
    href: '/photos/upload',
    icon: Camera,
    vendorType: 'photographer',
  },
  {
    label: 'Venue Setup',
    href: '/venue/setup',
    icon: MapPin,
    vendorType: 'venue',
  },
  {
    label: 'Arrangements',
    href: '/flowers/arrange',
    icon: Flower2,
    vendorType: 'florist',
  },
  {
    label: 'Menu Planning',
    href: '/catering/menu',
    icon: ChefHat,
    vendorType: 'caterer',
  },
];

export const MobileNav = memo(function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-gray-900" />
        ) : (
          <Menu className="h-6 w-6 text-gray-900" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-45 transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-purple-600">WedSync</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    // B-MAD Enhancement: Minimum 48x48px touch targets for mobile
                    'flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg transition-colors relative',
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
                  )}
                >
                  <Icon className="h-6 w-6 flex-shrink-0" />
                  <span className="font-medium text-base">{item.label}</span>
                  {/* B-MAD Enhancement: Notification badges for wedding vendor workflows */}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-[20px] flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* B-MAD Enhancement: Wedding vendor quick actions section */}
            <div className="pt-4 border-t border-gray-200 mt-4">
              <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/forms/builder"
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <Plus className="h-6 w-6 flex-shrink-0" />
                  <span className="font-medium text-base">New Form</span>
                </Link>
                <Link
                  href="/pdf/import"
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <FileText className="h-6 w-6 flex-shrink-0" />
                  <span className="font-medium text-base">Import PDF</span>
                </Link>
                {/* Show vendor-specific actions based on user type */}
                {vendorQuickActions.slice(0, 2).map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    <action.icon className="h-6 w-6 flex-shrink-0" />
                    <span className="font-medium text-base">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                // Handle logout
                console.log('Logout');
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

// B-MAD Enhanced Bottom Navigation for Wedding Vendor Mobile Workflows
export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();

  // Wedding vendor optimized bottom nav items
  const bottomNavItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Forms', href: '/forms', icon: FileText, badge: 3 },
    { label: 'Clients', href: '/clients', icon: Users, badge: 12 },
    {
      label: 'Messages',
      href: '/communications',
      icon: MessageSquare,
      badge: 5,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // B-MAD Enhancement: Minimum 48x48px touch targets with safe area
                'flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[48px] rounded-lg transition-all duration-200 relative active:scale-95',
                isActive
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100',
              )}
            >
              <div className="relative">
                <Icon
                  className={cn('h-6 w-6', isActive && 'text-purple-600')}
                />
                {/* B-MAD Enhancement: Badge notifications for wedding vendor workflows */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px]">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive && 'font-semibold',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* B-MAD Enhancement: Quick action floating button for mobile */}
      <Link
        href="/forms/builder"
        className="absolute -top-6 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform duration-200"
        aria-label="Create new form"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
});
