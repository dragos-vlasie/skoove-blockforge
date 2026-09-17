import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "./classNames";
import type { ReactNode } from "react";

export type AccordionItemData = {
  id?: string;
  title: ReactNode;
  content: ReactNode;
};

export function Accordion({
  items,
  defaultValue,
  className,
}: {
  items: AccordionItemData[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Root type="single" collapsible defaultValue={defaultValue} className={cn("w-full", className)}>
      {items.map((item, index) => {
        const value = item.id ?? `item-${index}`;

        return (
          <AccordionPrimitive.Item key={value} value={value} className="border-t border-slate-200">
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className="group flex w-full items-center gap-4 py-5 text-left text-base font-bold text-slate-950 outline-none transition hover:text-[var(--site-primary,#6d5dfc)] focus-visible:ring-2 focus-visible:ring-[var(--site-primary,#6d5dfc)]">
                <span className="min-w-0 flex-1">{item.title}</span>
                <span className="relative h-4 w-4 shrink-0 text-current">
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded-full bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 rounded-full bg-current transition group-data-[state=open]:rotate-90 group-data-[state=open]:opacity-0" />
                </span>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content className="overflow-hidden text-slate-700 data-[state=closed]:animate-none data-[state=open]:animate-none">
              <div className="pb-5 leading-relaxed">{item.content}</div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}
