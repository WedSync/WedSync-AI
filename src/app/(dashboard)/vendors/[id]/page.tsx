import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from '@/components/ui/description-list';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
  StarIcon,
  PhotoIcon,
  TagIcon,
  CurrencyPoundIcon,
  ClockIcon,
  UserGroupIcon,
  HeartIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  SparklesIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { format } from 'date-fns';
import { VendorPageProps, extractParams } from '@/types/next15-params';

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Extract async params - Next.js 15 requirement
  const resolvedParams = await extractParams(params);
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) return null;

  // Get vendor details
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select(
      `
      *,
      vendor_categories (
        name,
        slug
      )
    `,
    )
    .eq('id', resolvedParams.id)
    .eq('organization_id', profile.organization_id)
    .single();

  if (error || !vendor) {
    notFound();
  }

  // Get related clients
  const { data: clientRelationships } = await supabase
    .from('client_vendor_relationships')
    .select(
      `
      clients (
        id,
        first_name,
        last_name,
        partner_first_name,
        wedding_date,
        status
      )
    `,
    )
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get vendor stats
  const { count: totalClients } = await supabase
    .from('client_vendor_relationships')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id);

  const { count: activeBookings } = await supabase
    .from('client_vendor_relationships')
    .select(
      `
      client_id,
      clients!inner(status)
    `,
      { count: 'exact', head: true },
    )
    .eq('vendor_id', vendor.id)
    .eq('clients.status', 'booked');

  const categoryColors = {
    photographer: 'purple',
    videographer: 'blue',
    venue: 'green',
    florist: 'pink',
    catering: 'orange',
    music: 'red',
    beauty: 'rose',
    decor: 'amber',
    planning: 'indigo',
    other: 'zinc',
  } as const;

  const getCategoryColor = (slug?: string) => {
    if (!slug) return 'zinc';
    return categoryColors[slug as keyof typeof categoryColors] || 'zinc';
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      active: { color: 'green', label: 'Active' },
      inactive: { color: 'zinc', label: 'Inactive' },
      pending: { color: 'amber', label: 'Pending' },
      verified: { color: 'blue', label: 'Verified' },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.inactive;
    return <Badge color={config.color as any}>{config.label}</Badge>;
  };

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button href="/vendors" plain>
          <ArrowLeftIcon />
          Back to Vendors
        </Button>
      </div>

      <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {vendor.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={vendor.business_name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <BuildingStorefrontIcon className="h-10 w-10 text-zinc-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    {vendor.business_name}
                  </h1>
                  {vendor.is_marketplace_vendor && (
                    <Badge color="purple">
                      <CheckBadgeIcon className="h-3 w-3" />
                      Marketplace
                    </Badge>
                  )}
                  {getStatusBadge(vendor.status)}
                </div>
                {vendor.vendor_categories && (
                  <Badge
                    color={
                      getCategoryColor(vendor.vendor_categories.slug) as any
                    }
                    className="mt-2"
                  >
                    {vendor.vendor_categories.name}
                  </Badge>
                )}
                <p className="text-base text-gray-600">{vendor.description}</p>
                <div className="flex items-center gap-6 mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {vendor.location && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      {vendor.location}
                    </div>
                  )}
                  {vendor.price_range && (
                    <div className="flex items-center gap-1">
                      <CurrencyPoundIcon className="h-4 w-4" />
                      {vendor.price_range}
                    </div>
                  )}
                  {vendor.rating && (
                    <div className="flex items-center gap-1">
                      <StarIcon className="h-4 w-4 text-amber-500" />
                      {vendor.rating.toFixed(1)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4" />
                    {totalClients || 0} clients
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button href={`/vendors/${vendor.id}/edit`} outline>
                <PencilIcon />
                Edit
              </Button>
              <Button color="red" outline>
                <TrashIcon />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total Clients
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-1">
                {totalClients || 0}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Active Bookings
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-1">
                {activeBookings || 0}
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Avg Rating
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-1">
                {vendor.rating ? vendor.rating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Services
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-1">
                {vendor.services?.length || 0}
              </p>
            </div>
            <SparklesIcon className="h-8 w-8 text-pink-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-800">
                Contact Information
              </h2>
            </div>
            <div className="px-6 py-4">
              <DescriptionList>
                {vendor.contact_name && (
                  <>
                    <DescriptionTerm>Contact Person</DescriptionTerm>
                    <DescriptionDetails>
                      {vendor.contact_name}
                    </DescriptionDetails>
                  </>
                )}
                {vendor.email && (
                  <>
                    <DescriptionTerm>Email</DescriptionTerm>
                    <DescriptionDetails>
                      <a
                        href={`mailto:${vendor.email}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        {vendor.email}
                      </a>
                    </DescriptionDetails>
                  </>
                )}
                {vendor.phone && (
                  <>
                    <DescriptionTerm>Phone</DescriptionTerm>
                    <DescriptionDetails>
                      <a
                        href={`tel:${vendor.phone}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        {vendor.phone}
                      </a>
                    </DescriptionDetails>
                  </>
                )}
                {vendor.website && (
                  <>
                    <DescriptionTerm>Website</DescriptionTerm>
                    <DescriptionDetails>
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        {vendor.website}
                      </a>
                    </DescriptionDetails>
                  </>
                )}
                {vendor.address && (
                  <>
                    <DescriptionTerm>Address</DescriptionTerm>
                    <DescriptionDetails>{vendor.address}</DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </div>
          </div>

          {/* Services */}
          {vendor.services && vendor.services.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-semibold text-gray-800">
                  Services Offered
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {vendor.services.map((service: string, index: number) => (
                    <Badge key={index} color="zinc">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Portfolio */}
          {vendor.portfolio_urls && vendor.portfolio_urls.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-semibold text-gray-800">
                  Portfolio
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {vendor.portfolio_urls.map((url: string, index: number) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                    >
                      <PhotoIcon className="h-8 w-8 text-zinc-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {vendor.internal_notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <DocumentTextIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Internal Notes
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    {vendor.internal_notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connected Clients */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Connected Clients
                </h2>
                <Button href={`/vendors/${vendor.id}/clients`} plain size="sm">
                  View all
                </Button>
              </div>
            </div>
            <div className="px-6 py-4">
              {clientRelationships && clientRelationships.length > 0 ? (
                <div className="space-y-3">
                  {clientRelationships.map((rel) => {
                    const client = rel.clients;
                    if (!client) return null;
                    return (
                      <div
                        key={client.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-sm font-medium text-zinc-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            {client.first_name} {client.last_name}
                            {client.partner_first_name &&
                              ` & ${client.partner_first_name}`}
                          </Link>
                          {client.wedding_date && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {format(
                                new Date(client.wedding_date),
                                'MMM d, yyyy',
                              )}
                            </p>
                          )}
                        </div>
                        <Badge
                          color={client.status === 'booked' ? 'green' : 'zinc'}
                        >
                          {client.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserGroupIcon className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    No connected clients yet
                  </p>
                  <Button href="/clients" className="mt-3" size="sm">
                    Connect Clients
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-800">
                Quick Actions
              </h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <Button
                href={`/vendors/${vendor.id}/connect-client`}
                outline
                className="w-full justify-start"
              >
                <UserGroupIcon />
                Connect Client
              </Button>
              <Button
                href={`/vendors/${vendor.id}/documents`}
                outline
                className="w-full justify-start"
              >
                <DocumentTextIcon />
                View Documents
              </Button>
              <Button
                href={`/vendors/${vendor.id}/analytics`}
                outline
                className="w-full justify-start"
              >
                <ChartBarIcon />
                View Analytics
              </Button>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-800">Details</h2>
            </div>
            <div className="px-6 py-4">
              <DescriptionList>
                <DescriptionTerm>Added</DescriptionTerm>
                <DescriptionDetails>
                  {format(new Date(vendor.created_at), 'MMM d, yyyy')}
                </DescriptionDetails>

                {vendor.updated_at && (
                  <>
                    <DescriptionTerm>Last Updated</DescriptionTerm>
                    <DescriptionDetails>
                      {format(new Date(vendor.updated_at), 'MMM d, yyyy')}
                    </DescriptionDetails>
                  </>
                )}

                <DescriptionTerm>Vendor ID</DescriptionTerm>
                <DescriptionDetails className="font-mono text-xs">
                  {vendor.id}
                </DescriptionDetails>
              </DescriptionList>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
