import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { FormHTMLAttributes, ReactNode } from "react";

const join = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
type CmsDialogFormProps = FormHTMLAttributes<HTMLFormElement> & {
  "data-testid"?: string;
};

export function CmsDialog({
  open,
  onClose,
  title,
  description,
  eyebrow,
  headerExtra,
  children,
  footer,
  formProps,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  tone = "default",
  maxWidthClassName = "sm:max-w-4xl",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  formProps?: CmsDialogFormProps;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  tone?: "default" | "inverse";
  maxWidthClassName?: string;
}) {
  const inverse = tone === "inverse";
  const dialogContents = (
    <>
      <header
        className={join(
          "sticky top-0 z-10 shrink-0 border-b px-5 py-4 sm:px-6",
          inverse ? "border-white/15 bg-indigo-700/80 text-white backdrop-blur" : "border-slate-200 bg-white/95 backdrop-blur",
          headerClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div
                className={join(
                  "text-xs font-medium",
                  inverse ? "text-violet-100" : "text-violet-700",
                )}
              >
                {eyebrow}
              </div>
            )}
            <DialogPrimitive.Title
              className={join(
                "mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl",
                inverse ? "text-white" : "text-slate-950",
              )}
            >
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description
                className={join(
                  "mt-1 text-sm font-normal leading-6",
                  inverse ? "text-violet-100" : "text-slate-500",
                )}
              >
                {description}
              </DialogPrimitive.Description>
            )}
            {headerExtra && <div className="mt-3">{headerExtra}</div>}
          </div>
          <DialogPrimitive.Close
            type="button"
            aria-label="Close dialog"
            className={join(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xl leading-none shadow-sm transition focus-visible:outline-none focus-visible:ring-4",
              inverse
                ? "border-white/20 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/30"
                : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-700 focus-visible:ring-violet-200",
            )}
          >
            <span aria-hidden="true">×</span>
          </DialogPrimitive.Close>
        </div>
      </header>

      <div
        className={join(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5",
          inverse ? "bg-gradient-to-br from-violet-600 to-indigo-800 text-white" : "bg-slate-50/60",
          bodyClassName,
        )}
      >
        {children}
      </div>

      {footer && (
        <footer
          className={join(
            "sticky bottom-0 z-10 shrink-0 border-t px-5 py-3 sm:px-6",
            inverse ? "border-white/15 bg-indigo-800/90 text-white backdrop-blur" : "border-slate-200 bg-white/95 backdrop-blur",
            footerClassName,
          )}
        >
          {footer}
        </footer>
      )}
    </>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm data-[state=closed]:animate-none data-[state=open]:animate-none" />
        <DialogPrimitive.Content
          className={join(
            "fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-white shadow-2xl outline-none",
            "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[min(92vw,64rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            maxWidthClassName,
            contentClassName,
          )}
        >
          {formProps ? (
            <form {...formProps} className={join("contents", formProps.className)}>
              {dialogContents}
            </form>
          ) : dialogContents}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
