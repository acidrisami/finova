'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Reusable empty state component with visual feedback
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed bg-muted/20 ${className || ''}`}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mb-4">{description}</p>
        {action && (
          <Button onClick={action.onClick} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyListProps {
  icon: LucideIcon;
  message: string;
  submessage?: string;
  children?: ReactNode;
}

/**
 * Compact empty state for lists and tables
 */
export function EmptyList({ icon: Icon, message, submessage, children }: EmptyListProps) {
  return (
    <div className="p-8 text-center">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="text-muted-foreground font-medium">{message}</p>
      {submessage && <p className="text-muted-foreground text-sm mt-1">{submessage}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * Empty state specifically for search/filter results
 */
export function EmptySearchResults({
  searchTerm,
  onClear,
}: {
  searchTerm: string;
  onClear: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">
        No results found for &quot;<span className="font-medium">{searchTerm}</span>&quot;
      </p>
      <Button variant="ghost" size="sm" onClick={onClear} className="mt-2">
        Clear search
      </Button>
    </div>
  );
}
