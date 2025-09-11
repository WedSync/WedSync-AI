import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  StarIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
  CameraIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  CakeIcon,
  TruckIcon,
  HeartIcon,
  PaintBrushIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
} from '@heroicons/react/20/solid';
import { extractSearchParams } from '@/types/next15-params';

const categoryIcons: Record<string, any> = {
  photography: CameraIcon,
  videography: VideoCameraIcon,
  venue: BuildingOffice2Icon,
  catering: CakeIcon,
  florist: SparklesIcon,
  music: MusicalNoteIcon,
  beauty: SparklesIcon,
  planning: ClipboardDocumentListIcon,
  transport: TruckIcon,
  cake: CakeIcon,
  stationery: EnvelopeIcon,
  decor: PaintBrushIcon,
  jewellery: HeartIcon,
  favors: GiftIcon,
  attire: HeartIcon,
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    search?: string;
    location?: string;
    verified?: string;
  }>;
}) {
  // Extract async searchParams - Next.js 15 requirement
  const resolvedSearchParams = await extractSearchParams(searchParams);
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('vendor_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  let query = supabase.from('suppliers').select('*').eq('is_published', true);

  if (
    resolvedSearchParams.category &&
    resolvedSearchParams.category !== 'all'
  ) {
    query = query.eq('primary_category', resolvedSearchParams.category);
  }

  if (resolvedSearchParams.search) {
    query = query.or(`
      business_name.ilike.%${resolvedSearchParams.search}%,
      description.ilike.%${resolvedSearchParams.search}%,
      city.ilike.%${resolvedSearchParams.search}%
    `);
  }

  if (resolvedSearchParams.location) {
    query = query.or(`
      city.ilike.%${resolvedSearchParams.location}%,
      county.ilike.%${resolvedSearchParams.location}%
    `);
  }

  if (resolvedSearchParams.verified === 'true') {
    query = query.eq('is_verified', true);
  }

  const { data: suppliers = [] } = await query.order('average_rating', {
    ascending: false,
  });

  const getPriceRangeDisplay = (range: string | null) => {
    if (!range) return null;
    return range;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Vendor Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Discover and connect with wedding suppliers in your area
          </p>
        </div>
        <Button href="/vendors/register">
          <PlusIcon />
          Add Your Business
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <InputGroup>
            <MagnifyingGlassIcon />
            <Input
              name="search"
              placeholder="Search vendors..."
              defaultValue={resolvedSearchParams.search}
            />
          </InputGroup>
        </div>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="category"
          defaultValue={resolvedSearchParams.category || 'all'}
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.display_name}
            </option>
          ))}
        </select>
        <InputGroup>
          <MapPinIcon />
          <Input
            name="location"
            placeholder="Location"
            defaultValue={resolvedSearchParams.location}
          />
        </InputGroup>
        <Button outline>
          <FunnelIcon />
          Filters
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-16">
          <BuildingStorefrontIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium">No vendors found</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => {
            const CategoryIcon =
              categoryIcons[supplier.primary_category] ||
              BuildingStorefrontIcon;

            return (
              <div
                key={supplier.id}
                className="group relative rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <a href={`/vendors/${supplier.slug}`} className="block">
                  {supplier.featured_image ? (
                    <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={supplier.featured_image}
                        alt={supplier.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                      <CategoryIcon className="size-12 text-zinc-400 dark:text-zinc-600" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {supplier.business_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="zinc" className="text-xs">
                            <CategoryIcon className="size-3" />
                            {
                              categories?.find(
                                (c) => c.slug === supplier.primary_category,
                              )?.display_name
                            }
                          </Badge>
                          {supplier.is_verified && (
                            <CheckBadgeIcon className="size-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                      {supplier.average_rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <StarIcon className="size-4 text-amber-400" />
                          <span className="font-medium">
                            {supplier.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {supplier.city && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                        <MapPinIcon className="size-3" />
                        {supplier.city}
                        {supplier.county && `, ${supplier.county}`}
                      </div>
                    )}

                    {supplier.description && (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {supplier.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {supplier.starting_price && (
                        <span className="text-sm font-medium">
                          From £{supplier.starting_price.toLocaleString()}
                        </span>
                      )}
                      {supplier.price_range && (
                        <span className="text-sm text-zinc-500">
                          {getPriceRangeDisplay(supplier.price_range)}
                        </span>
                      )}
                    </div>

                    {supplier.is_marketplace_vendor && (
                      <Badge color="purple" className="mt-3 text-xs">
                        Marketplace Vendor
                      </Badge>
                    )}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="mt-8 flex items-center justify-between text-sm text-zinc-500">
          <div>
            Showing {suppliers.length} vendor{suppliers.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-4">
            <span>
              {suppliers.filter((s) => s.is_verified).length} verified
            </span>
            <span>
              {suppliers.filter((s) => s.is_marketplace_vendor).length}{' '}
              marketplace
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
