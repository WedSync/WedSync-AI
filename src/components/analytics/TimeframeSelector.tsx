'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export function TimeframeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTimeframe = searchParams.get('timeframe') || '30d';

  const handleTimeframeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('timeframe', value);
    router.push(`/analytics?${params.toString()}`);
  };

  return (
    <Select value={currentTimeframe} onValueChange={handleTimeframeChange}>
      <SelectTrigger className="w-[180px]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <SelectValue placeholder="Select timeframe" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
