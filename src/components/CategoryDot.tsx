export function CategoryDot({ color, className = "h-2 w-2" }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: color }} aria-hidden />;
}
