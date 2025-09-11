'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Search,
  ArrowUpDown,
  Edit,
  BarChart3,
  FlaskConical,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  views: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
  category: string;
  weddingTypePerformance: Record<string, number>;
}

interface TemplatePerformanceTableProps {
  templates: Template[];
}

export default function TemplatePerformanceTable({
  templates = [],
}: TemplatePerformanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'revenue' | 'purchases' | 'conversion' | 'views'
  >('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortBy) {
      case 'revenue':
        aValue = a.revenue;
        bValue = b.revenue;
        break;
      case 'purchases':
        aValue = a.purchases;
        bValue = b.purchases;
        break;
      case 'conversion':
        aValue = a.conversionRate;
        bValue = b.conversionRate;
        break;
      case 'views':
        aValue = a.views;
        bValue = b.views;
        break;
      default:
        aValue = a.revenue;
        bValue = b.revenue;
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getPerformanceBadge = (conversionRate: number) => {
    if (conversionRate >= 0.05) {
      return <Badge variant="success">High</Badge>;
    } else if (conversionRate >= 0.02) {
      return <Badge variant="default">Good</Badge>;
    } else if (conversionRate >= 0.01) {
      return <Badge variant="warning">Average</Badge>;
    } else {
      return <Badge variant="destructive">Low</Badge>;
    }
  };

  const getBestWeddingType = (performance: Record<string, number>) => {
    if (!performance || Object.keys(performance).length === 0) {
      return { type: 'Unknown', percentage: 0 };
    }

    const entries = Object.entries(performance);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const best = entries.sort(([, a], [, b]) => b - a)[0];

    return {
      type: best[0].charAt(0).toUpperCase() + best[0].slice(1),
      percentage: total > 0 ? (best[1] / total) * 100 : 0,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>
              Detailed metrics for all your templates
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTemplates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No templates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Template</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('views')}
                      className="h-auto p-0 font-medium"
                    >
                      Views
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('purchases')}
                      className="h-auto p-0 font-medium"
                    >
                      Sales
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('revenue')}
                      className="h-auto p-0 font-medium"
                    >
                      Revenue
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('conversion')}
                      className="h-auto p-0 font-medium"
                    >
                      Conversion
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Best Audience</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.map((template) => {
                  const bestAudience = getBestWeddingType(
                    template.weddingTypePerformance,
                  );
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span>{template.views.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                          <span>{template.purchases}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(template.revenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          $
                          {(
                            template.revenue /
                            Math.max(template.purchases, 1) /
                            100
                          ).toFixed(2)}{' '}
                          avg
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatPercentage(template.conversionRate)}
                          </span>
                          {getPerformanceBadge(template.conversionRate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bestAudience.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {bestAudience.percentage.toFixed(0)}% of sales
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FlaskConical className="mr-2 h-4 w-4" />
                              Create A/B Test
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Performance Summary */}
        {sortedTemplates.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Views
                </p>
                <p className="text-2xl font-bold">
                  {sortedTemplates
                    .reduce((sum, t) => sum + t.views, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </p>
                <p className="text-2xl font-bold">
                  {sortedTemplates.reduce((sum, t) => sum + t.purchases, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    sortedTemplates.reduce((sum, t) => sum + t.revenue, 0),
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Conversion
                </p>
                <p className="text-2xl font-bold">
                  {formatPercentage(
                    sortedTemplates.reduce(
                      (sum, t) => sum + t.conversionRate,
                      0,
                    ) / sortedTemplates.length,
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
