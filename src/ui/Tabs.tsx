import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./classNames";
import type { ReactNode } from "react";

export type TabItem = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsPrimitive.List className="inline-flex rounded-xl bg-slate-100 p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 outline-none transition hover:text-slate-950 data-[state=active]:bg-white data-[state=active]:text-[var(--site-primary,#6d5dfc)] data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--site-primary,#6d5dfc)]"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className={cn("mt-4 outline-none")}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
