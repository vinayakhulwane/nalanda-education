import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}
