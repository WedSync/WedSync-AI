import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog8ToothIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  UserCircleIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  BellIcon,
  CalendarIcon,
  FolderIcon,
  MapIcon,
  HeartIcon,
  SparklesIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ShieldExclamationIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon,
} from '@heroicons/react/20/solid';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { ResponsiveChatWidget } from '@/components/chatbot/ChatWidget';
import {
  SidebarSection,
  SidebarLabel,
  SidebarItem,
} from '@/components/ui/sidebar';
import { Avatar } from '@/components/ui/avatar';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from '@/components/ui/dropdown';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <HeartIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">
                  WedSync
                </span>
                <span className="text-xs text-zinc-500">Supplier Platform</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <SidebarSection>
                <SidebarItem href="/">
                  <HomeIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Dashboard</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/clients">
                  <UsersIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Clients</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/vendors">
                  <BuildingStorefrontIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Vendor Directory</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/dashboard/forms">
                  <DocumentTextIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Forms</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/templates">
                  <FolderIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Templates</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/journeys">
                  <MapIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Customer Journeys</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/journey-monitor">
                  <CpuChipIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Journey Monitor</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/dashboard/music">
                  <MusicalNoteIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Music Database</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/channels">
                  <ChatBubbleLeftRightIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Channels</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/integrations/webhooks">
                  <LinkIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Webhooks</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/analytics">
                  <ChartBarIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Analytics</SidebarLabel>
                </SidebarItem>
                {(profile?.role === 'admin' ||
                  profile?.role === 'super_admin') && (
                  <>
                    <SidebarItem href="/admin/monitoring">
                      <ShieldCheckIcon className="mr-3 h-6 w-6" />
                      <SidebarLabel>System Monitoring</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/admin/audit-logs">
                      <ClipboardDocumentListIcon className="mr-3 h-6 w-6" />
                      <SidebarLabel>Audit Logs</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/admin/backups">
                      <ShieldExclamationIcon className="mr-3 h-6 w-6" />
                      <SidebarLabel>Backup Management</SidebarLabel>
                    </SidebarItem>
                  </>
                )}
                <SidebarItem href="/settings">
                  <Cog8ToothIcon className="mr-3 h-6 w-6" />
                  <SidebarLabel>Settings</SidebarLabel>
                </SidebarItem>
              </SidebarSection>
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Dropdown>
              <DropdownButton>
                <div className="flex items-center w-full">
                  <Avatar src={profile?.avatar_url} className="size-8" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {profile?.organization_name || 'Wedding Supplier'}
                    </p>
                  </div>
                </div>
              </DropdownButton>
              <DropdownMenu className="min-w-64">
                <DropdownItem href="/my-profile">
                  <UserCircleIcon className="mr-3 h-5 w-5" />
                  <DropdownLabel>My profile</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/settings">
                  <Cog8ToothIcon className="mr-3 h-5 w-5" />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/logout">
                  <ArrowRightStartOnRectangleIcon className="mr-3 h-5 w-5" />
                  <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1">{children}</main>
      </div>

      {/* PWA Components */}
      <InstallPrompt />
      <ServiceWorkerRegistration />

      {/* AI Chatbot Widget - floating assistant for wedding suppliers */}
      <ResponsiveChatWidget
        position="bottom-right"
        initialMessage="Hi! I'm your WedSync AI assistant. How can I help you manage your wedding business today?"
        contextHint="wedding business management"
        showSecurityIndicator={true}
        allowFileUploads={true}
        theme="light"
      />
    </div>
  );
}
