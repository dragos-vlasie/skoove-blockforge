import { cn } from "./classNames";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <article
      className={cn(
        "rounded-[var(--site-radius,1rem)] border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
