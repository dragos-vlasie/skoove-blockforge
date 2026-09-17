import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { ValidationIssue } from "../../types";

export const fieldChromeClass =
  "grid min-w-0 gap-1.5";

export const inputChromeClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-[#d9dee7] bg-white px-3 py-2 text-sm font-medium leading-5 text-[#172033] outline-none transition placeholder:text-[#98a2b3] hover:border-[#c8ced8] focus:border-[#8174e8] focus:ring-2 focus:ring-[#e5e1ff] disabled:bg-[#f5f6f8] disabled:text-[#98a2b3]";

export const selectChromeClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-[#d9dee7] bg-white px-3 py-2 text-sm font-medium leading-5 text-[#172033] outline-none transition hover:border-[#c8ced8] focus:border-[#8174e8] focus:ring-2 focus:ring-[#e5e1ff] disabled:bg-[#f5f6f8] disabled:text-[#98a2b3]";

export function Field({
  label,
  children,
  labelClassName = "",
}: {
  label: string;
  children: ReactNode;
  labelClassName?: string;
}) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const controlId = `${generatedId}-control`;
  const singleChild = Children.count(children) === 1 && isValidElement(children)
    ? children as ReactElement<{ id?: string; "aria-labelledby"?: string }>
    : null;
  const resolvedControlId = singleChild?.props.id ?? controlId;
  const labeledChildren = singleChild
    ? cloneElement(singleChild, {
        id: resolvedControlId,
        "aria-labelledby": [singleChild.props["aria-labelledby"], labelId].filter(Boolean).join(" "),
      })
    : children;

  return (
    <div className={`${fieldChromeClass}`}>
      <span
        id={labelId}
        className={`text-[13px] font-medium leading-5 text-[#394150] ${labelClassName}`}
      >
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="min-w-0 max-w-full">
        {labeledChildren}
      </div>
    </div>
  );
}

export function FieldIssues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="grid gap-1">
      {issues.map((issue) => (
        <p
          key={issue.id}
          className={`text-[11px] font-bold ${issue.level === "error" ? "text-rose-600" : "text-amber-600"}`}
        >
          {issue.message}
        </p>
      ))}
    </div>
  );
}

export function InlineIssueSummary({
  issues,
  title = "Validation",
}: {
  issues: ValidationIssue[];
  title?: string;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-[12px] text-rose-700">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-500">{title}</p>
      <div className="mt-2 grid gap-2">
        {issues.slice(0, 5).map((issue) => (
          <p key={issue.id} className="font-bold leading-snug">
            {issue.message}
          </p>
        ))}
        {issues.length > 5 && (
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-400">
            +{issues.length - 5} more issue{issues.length - 5 === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
}

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`${inputChromeClass} ${props.className ?? ""}`}
  />
);

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`${inputChromeClass} ${props.className ?? ""}`}
  />
);
