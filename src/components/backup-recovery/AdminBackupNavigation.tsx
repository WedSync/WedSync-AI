'use client';

import React, { useState } from 'react';
import {
  Shield,
  Database,
  AlertTriangle,
  Activity,
  Settings,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigation item types
interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: 'default' | 'success' | 'warning' | 'danger';
  children?: NavItem[];
  emergency?: boolean;
}

interface AdminBackupNavigationProps {
  currentUserRole?: 'admin' | 'super-admin' | 'operator';
  systemHealth?: 'healthy' | 'warning' | 'critical';
  criticalAlerts?: number;
  onEmergencyAccess?: () => void;
}

const AdminBackupNavigation: React.FC<AdminBackupNavigationProps> = ({
  currentUserRole = 'admin',
  systemHealth = 'healthy',
  criticalAlerts = 0,
  onEmergencyAccess,
}) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'backup-recovery',
  ]);

  const navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      href: '/admin',
      icon: BarChart3,
    },
    {
      id: 'backup-recovery',
      label: 'Backup & Recovery',
      icon: Shield,
      badge:
        systemHealth === 'critical'
          ? 'CRITICAL'
          : criticalAlerts > 0
            ? String(criticalAlerts)
            : undefined,
      badgeColor:
        systemHealth === 'critical'
          ? 'danger'
          : criticalAlerts > 0
            ? 'warning'
            : 'default',
      children: [
        {
          id: 'backup-dashboard',
          label: 'Backup Dashboard',
          href: '/admin/backup/dashboard',
          icon: Database,
          badge: systemHealth === 'warning' ? 'WARNING' : undefined,
          badgeColor: 'warning',
        },
        {
          id: 'emergency-recovery',
          label: 'Emergency Recovery',
          href: '/admin/backup/emergency',
          icon: AlertTriangle,
          emergency: true,
          badge: systemHealth === 'critical' ? 'ACTIVE' : undefined,
          badgeColor: 'danger',
        },
        {
          id: 'recovery-timeline',
          label: 'Recovery Timeline',
          href: '/admin/backup/timeline',
          icon: Activity,
        },
        {
          id: 'backup-monitoring',
          label: 'System Monitoring',
          href: '/admin/backup/monitoring',
          icon: Activity,
        },
        {
          id: 'backup-settings',
          label: 'Backup Settings',
          href: '/admin/backup/settings',
          icon: Settings,
        },
      ],
    },
    {
      id: 'system-health',
      label: 'System Health',
      icon: Activity,
      badge:
        systemHealth === 'critical'
          ? 'DOWN'
          : systemHealth === 'warning'
            ? 'WARN'
            : 'UP',
      badgeColor:
        systemHealth === 'critical'
          ? 'danger'
          : systemHealth === 'warning'
            ? 'warning'
            : 'success',
      children: [
        {
          id: 'performance-metrics',
          label: 'Performance Metrics',
          href: '/admin/health/performance',
          icon: BarChart3,
        },
        {
          id: 'wedding-monitoring',
          label: 'Wedding Monitoring',
          href: '/admin/health/weddings',
          icon: Calendar,
        },
        {
          id: 'user-activity',
          label: 'User Activity',
          href: '/admin/health/users',
          icon: Users,
        },
      ],
    },
    {
      id: 'reports',
      label: 'Reports & Logs',
      href: '/admin/reports',
      icon: FileText,
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const isActive = (href: string) => pathname === href;

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'success':
        return 'bg-success text-success-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'danger':
        return 'bg-danger text-danger-foreground';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth) {
      case 'critical':
        return 'text-danger';
      case 'warning':
        return 'text-warning';
      case 'healthy':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isExpanded = expandedSections.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActiveItem = item.href ? isActive(item.href) : false;

    return (
      <div key={item.id}>
        {/* Parent Item */}
        <div
          className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg transition-colors ${
            depth > 0 ? 'ml-4' : ''
          } ${
            isActiveItem
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-muted'
          } ${item.emergency ? 'border border-danger/20 bg-danger/5' : ''}`}
        >
          {item.href ? (
            <Link href={item.href} className="flex items-center gap-3 flex-1">
              <item.icon
                className={`h-5 w-5 ${item.emergency ? 'text-danger' : ''}`}
              />
              <span
                className={`font-medium ${item.emergency ? 'text-danger' : ''}`}
              >
                {item.label}
              </span>
              {item.badge && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(item.badgeColor || 'default')}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={() => hasChildren && toggleSection(item.id)}
              className="flex items-center gap-3 flex-1"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(item.badgeColor || 'default')}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )}

          {hasChildren && (
            <button
              onClick={() => toggleSection(item.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Children Items */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-lg shadow-lg"
        aria-label="Open admin navigation"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-80 bg-background border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:shadow-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Admin Control
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  systemHealth === 'healthy'
                    ? 'bg-success'
                    : systemHealth === 'warning'
                      ? 'bg-warning'
                      : 'bg-danger'
                }`}
              />
              <span className={`text-sm font-medium ${getSystemHealthColor()}`}>
                System {systemHealth}
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Emergency Access Button */}
        {(systemHealth === 'critical' || criticalAlerts > 0) &&
          onEmergencyAccess && (
            <div className="p-4 border-b border-border bg-danger/5">
              <button
                onClick={onEmergencyAccess}
                className="w-full flex items-center gap-3 px-4 py-3 bg-danger text-danger-foreground rounded-lg font-semibold hover:bg-danger/90 transition-colors"
              >
                <AlertTriangle className="h-5 w-5" />
                Emergency Recovery Access
              </button>
            </div>
          )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Role: {currentUserRole.toUpperCase()}</p>
            <p className="mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </aside>

      {/* Breadcrumb Navigation */}
      <div className="lg:hidden fixed top-16 left-4 right-4 z-30 bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          {pathname
            .split('/')
            .slice(2)
            .map((segment, index, array) => (
              <React.Fragment key={segment}>
                <span>/</span>
                <span
                  className={
                    index === array.length - 1
                      ? 'text-foreground font-medium'
                      : 'hover:text-foreground'
                  }
                >
                  {segment.charAt(0).toUpperCase() +
                    segment.slice(1).replace('-', ' ')}
                </span>
              </React.Fragment>
            ))}
        </div>
      </div>
    </>
  );
};

export default AdminBackupNavigation;
