import { BookHeart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BookHeart className="h-8 w-8 text-primary" />
      <span className="text-2xl font-bold font-headline tracking-tighter">
        Nalanda
      </span>
    </div>
  );
}
