import * as React from 'react';
import { cn } from '@/lib/utils';

export const Progress: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);
