import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OverviewCardsSkeleton() {
  return (
    <div
      data-testid="skeleton"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[120px] mb-2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-[60px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card data-testid="skeleton">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px] mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex items-center justify-center">
          <div className="space-y-4 w-full">
            <Skeleton className="h-[300px] w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card data-testid="skeleton">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-6 w-[100px]" />
        </div>
        <Skeleton className="h-4 w-[250px] mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          {/* Table header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>

          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b">
              <Skeleton className="h-8 w-[100px]" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2 w-[120px]" />
                <Skeleton className="h-3 w-[60px]" />
              </div>
              <Skeleton className="h-6 w-[60px]" />
              <Skeleton className="h-4 w-[70px]" />
              <Skeleton className="h-4 w-[40px] ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
