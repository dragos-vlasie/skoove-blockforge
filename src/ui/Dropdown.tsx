import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export type DropdownItem = {
  label: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
};

export function Dropdown({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {items.map((item, index) => (
            <DropdownPrimitive.Item
              key={index}
              onSelect={item.onSelect}
              className={`cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-semibold outline-none data-[highlighted]:bg-slate-100 ${
                item.destructive ? "text-rose-600 data-[highlighted]:text-rose-700" : "text-slate-700 data-[highlighted]:text-slate-950"
              }`}
            >
              {item.label}
            </DropdownPrimitive.Item>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
