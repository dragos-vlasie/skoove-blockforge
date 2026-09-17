import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "./classNames";

export type SelectOption = {
  value: string;
  label: string;
};

export function Select({
  value,
  defaultValue,
  options,
  placeholder = "Select",
  onValueChange,
  className,
}: {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "inline-flex h-11 min-w-40 items-center justify-between gap-3 rounded-[var(--site-radius,0.75rem)] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition hover:border-slate-400 focus:ring-2 focus:ring-[var(--site-primary,#6d5dfc)]",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="text-slate-500">v</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
