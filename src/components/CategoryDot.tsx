import { categoryColor } from "@/lib/meta";

export function CategoryDot({ name, className = "h-2 w-2" }: { name: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: categoryColor(name) }} aria-hidden />;
}
