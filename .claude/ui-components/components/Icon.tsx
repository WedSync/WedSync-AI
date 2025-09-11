import * as React from 'react';
import * as lucide from 'lucide-react';
export function Icon({ name, size=20, ...props }: { name: keyof typeof lucide; size?: number } & React.SVGProps<SVGSVGElement>) {
  const LucideIcon = (lucide as any)[name];
  if (!LucideIcon) return null;
  return <LucideIcon width={size} height={size} {...props} />;
}
