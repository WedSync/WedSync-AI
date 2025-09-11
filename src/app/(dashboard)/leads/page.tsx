import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from '@/components/ui/dropdown';
import { InputGroup } from '@/components/ui/input-group';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { format } from 'date-fns';
import { extractSearchParams } from '@/types/next15-params';

interface LeadWithScoring {
  id: string;
  first_name: string | null;
  last_name: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  lead_score: number;
  lead_grade: string;
  lead_priority: string;
  lifecycle_stage: string | null;
  wedding_date: string | null;
  estimated_value: number | null;
  probability_to_close: number | null;
  follow_up_date: string | null;
  created_at: string;
  last_touch_date: string | null;
  lead_scores?: {
    total_score: number;
    score_grade: string;
    score_trend: string;
    last_calculated_at: string;
  };
  lead_sources?: {
    source_name: string;
    source_category: string;
  };
  assigned_user?: {
    first_name: string;
    last_name: string;
  };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    grade?: string;
    search?: string;
    sort?: string;
  }>;
}) {
  const resolvedSearchParams = await extractSearchParams(searchParams);
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) return null;

  // Build leads query with enhanced data
  let query = supabase
    .from('clients')
    .select(
      `
      *,
      lead_scores (
        total_score,
        score_grade,
        score_trend,
        last_calculated_at
      ),
      lead_sources (
        source_name,
        source_category
      ),
      assigned_user:user_profiles!clients_assigned_to_fkey (
        first_name,
        last_name
      )
    `,
    )
    .eq('organization_id', profile.organization_id);

  // Apply filters
  if (resolvedSearchParams.status && resolvedSearchParams.status !== 'all') {
    query = query.eq('status', resolvedSearchParams.status);
  }

  if (
    resolvedSearchParams.priority &&
    resolvedSearchParams.priority !== 'all'
  ) {
    query = query.eq('lead_priority', resolvedSearchParams.priority);
  }

  if (resolvedSearchParams.grade && resolvedSearchParams.grade !== 'all') {
    query = query.eq('lead_grade', resolvedSearchParams.grade);
  }

  if (resolvedSearchParams.search) {
    query = query.or(`
      first_name.ilike.%${resolvedSearchParams.search}%,
      last_name.ilike.%${resolvedSearchParams.search}%,
      email.ilike.%${resolvedSearchParams.search}%,
      partner_first_name.ilike.%${resolvedSearchParams.search}%,
      partner_last_name.ilike.%${resolvedSearchParams.search}%
    `);
  }

  // Apply sorting
  const sortField = resolvedSearchParams.sort?.replace('-', '') || 'lead_score';
  const sortAscending = !resolvedSearchParams.sort?.startsWith('-');
  query = query.order(sortField, { ascending: sortAscending });

  const { data: leads = [] } = (await query) as { data: LeadWithScoring[] };

  // Get summary statistics
  const { data: summaryStats } = await supabase
    .from('clients')
    .select('status, lead_grade, lead_priority, lead_score, estimated_value')
    .eq('organization_id', profile.organization_id);

  const summary = {
    totalLeads: summaryStats?.length || 0,
    qualifiedLeads:
      summaryStats?.filter((l) => ['A+', 'A', 'B'].includes(l.lead_grade))
        .length || 0,
    highPriorityLeads:
      summaryStats?.filter((l) => ['high', 'urgent'].includes(l.lead_priority))
        .length || 0,
    totalPipelineValue:
      summaryStats?.reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0,
    averageScore: summaryStats?.length
      ? Math.round(
          summaryStats.reduce((sum, l) => sum + (l.lead_score || 0), 0) /
            summaryStats.length,
        )
      : 0,
  };

  const statusColors = {
    new: 'blue',
    contacted: 'yellow',
    qualified: 'green',
    quoted: 'purple',
    negotiating: 'orange',
    won: 'green',
    lost: 'red',
    archived: 'gray',
  } as const;

  const gradeColors = {
    'A+': 'green',
    A: 'green',
    B: 'blue',
    C: 'yellow',
    D: 'orange',
    F: 'red',
  } as const;

  const priorityColors = {
    low: 'gray',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
  } as const;

  const getLeadName = (lead: LeadWithScoring) => {
    const names = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
    const partnerNames = [lead.partner_first_name, lead.partner_last_name]
      .filter(Boolean)
      .join(' ');

    if (names && partnerNames) {
      return `${names} & ${partnerNames}`;
    }
    return names || partnerNames || 'Unnamed Lead';
  };

  const getScoreTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-3 w-3 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-3 w-3 text-red-500" />;
      case 'stable':
        return <MinusIcon className="h-3 w-3 text-gray-400" />;
      default:
        return <StarIcon className="h-3 w-3 text-blue-500" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Lead Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track and manage your sales leads with advanced scoring and
            analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ChartBarIcon className="h-4 w-4" />
            Analytics
          </Button>
          <Link href="/clients/new">
            <Button>
              <PlusIcon className="h-4 w-4" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Total Leads</div>
          <div className="text-2xl font-bold text-zinc-900">
            {summary.totalLeads}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Qualified</div>
          <div className="text-2xl font-bold text-green-600">
            {summary.qualifiedLeads}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">High Priority</div>
          <div className="text-2xl font-bold text-orange-600">
            {summary.highPriorityLeads}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Pipeline Value</div>
          <div className="text-2xl font-bold text-blue-600">
            £{summary.totalPipelineValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Avg. Score</div>
          <div className="text-2xl font-bold text-purple-600">
            {summary.averageScore}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <InputGroup>
            <MagnifyingGlassIcon />
            <Input
              name="search"
              placeholder="Search leads..."
              defaultValue={resolvedSearchParams.search}
            />
          </InputGroup>
        </div>
        <select
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="status"
          defaultValue={resolvedSearchParams.status || 'all'}
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="quoted">Quoted</option>
          <option value="negotiating">Negotiating</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <select
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="priority"
          defaultValue={resolvedSearchParams.priority || 'all'}
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="grade"
          defaultValue={resolvedSearchParams.grade || 'all'}
        >
          <option value="all">All Grades</option>
          <option value="A+">A+ Grade</option>
          <option value="A">A Grade</option>
          <option value="B">B Grade</option>
          <option value="C">C Grade</option>
          <option value="D">D Grade</option>
          <option value="F">F Grade</option>
        </select>
        <Button variant="outline">
          <FunnelIcon className="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>

      {/* Leads Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-950/10">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Lead</TableHeader>
              <TableHeader>Score</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Wedding Date</TableHeader>
              <TableHeader>Value</TableHeader>
              <TableHeader>Follow Up</TableHeader>
              <TableHeader>Source</TableHeader>
              <TableHeader className="relative w-0">
                <span className="sr-only">Actions</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <UserIcon className="size-8 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-900">No leads yet</p>
                      <p className="text-sm text-zinc-500 mt-1">
                        Start by adding your first lead
                      </p>
                    </div>
                    <Link href="/clients/new">
                      <Button size="sm">
                        <PlusIcon />
                        Add Lead
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const followUpOverdue =
                  lead.follow_up_date &&
                  new Date(lead.follow_up_date) < new Date();

                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-zinc-950">
                          {getLeadName(lead)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <EnvelopeIcon className="size-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="size-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                        {lead.assigned_user && (
                          <div className="text-xs text-zinc-400 mt-1">
                            Assigned: {lead.assigned_user.first_name}{' '}
                            {lead.assigned_user.last_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          color={
                            gradeColors[
                              lead.lead_grade as keyof typeof gradeColors
                            ] || 'gray'
                          }
                        >
                          {lead.lead_grade} ({lead.lead_score})
                        </Badge>
                        {lead.lead_scores?.score_trend &&
                          getScoreTrendIcon(lead.lead_scores.score_trend)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Last calc:{' '}
                        {lead.lead_scores?.last_calculated_at
                          ? format(
                              new Date(lead.lead_scores.last_calculated_at),
                              'MMM d',
                            )
                          : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={
                          statusColors[
                            lead.status as keyof typeof statusColors
                          ] || 'gray'
                        }
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={
                          priorityColors[
                            lead.lead_priority as keyof typeof priorityColors
                          ] || 'gray'
                        }
                      >
                        {lead.lead_priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.wedding_date ? (
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(lead.wedding_date), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {Math.ceil(
                              (new Date(lead.wedding_date).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24),
                            )}{' '}
                            days
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.estimated_value ? (
                        <div>
                          <div className="text-sm font-medium">
                            £{lead.estimated_value.toLocaleString()}
                          </div>
                          {lead.probability_to_close && (
                            <div className="text-xs text-zinc-500">
                              {lead.probability_to_close}% likely
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.follow_up_date ? (
                        <div
                          className={`text-sm ${followUpOverdue ? 'text-red-600 font-medium' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            {format(new Date(lead.follow_up_date), 'MMM d')}
                          </div>
                          {followUpOverdue && (
                            <div className="text-xs text-red-500">Overdue</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.lead_sources ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {lead.lead_sources.source_name}
                          </div>
                          <div className="text-xs text-zinc-500 capitalize">
                            {lead.lead_sources.source_category.replace(
                              '_',
                              ' ',
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Dropdown>
                          <DropdownButton
                            aria-label="More options"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <EllipsisHorizontalIcon />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            <DropdownItem href={`/clients/${lead.id}`}>
                              View Details
                            </DropdownItem>
                            <DropdownItem href={`/clients/${lead.id}/edit`}>
                              Edit Lead
                            </DropdownItem>
                            <DropdownItem href={`/leads/${lead.id}/status`}>
                              Update Status
                            </DropdownItem>
                            <DropdownItem href={`/leads/${lead.id}/scoring`}>
                              View Scoring
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {leads.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-zinc-500">
          <div>
            Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-4">
            <span>
              {leads.filter((l) => ['A+', 'A'].includes(l.lead_grade)).length}{' '}
              hot leads
            </span>
            <span>
              {leads.filter((l) => l.lead_priority === 'urgent').length} urgent
            </span>
            <span>
              {
                leads.filter(
                  (l) =>
                    l.follow_up_date && new Date(l.follow_up_date) < new Date(),
                ).length
              }{' '}
              overdue
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
