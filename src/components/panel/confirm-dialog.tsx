import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="panel-card max-w-[calc(100vw-1.5rem)] gap-0 border-border/70 bg-card/95 p-0 sm:max-w-md">
        <div
          className={`h-1 w-full rounded-t-[inherit] ${
            tone === "destructive"
              ? "bg-linear-to-r from-destructive to-warning"
              : "bg-linear-to-r from-primary to-accent"
          }`}
        />
        <div className="p-5 sm:p-6">
          <AlertDialogHeader className="space-y-0 text-left sm:text-left">
            <span
              className={`mb-4 grid size-11 place-items-center rounded-2xl text-xl ${
                tone === "destructive"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }`}
              aria-hidden
            >
              {icon ?? "✳︎"}
            </span>
            <AlertDialogTitle className="font-display text-lg font-bold tracking-tight">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction
              onClick={() => void onConfirm()}
              className={`w-full rounded-xl px-4 py-2.5 font-semibold sm:w-auto ${
                tone === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "panel-gradient-btn hover:opacity-90"
              }`}
            >
              {confirmLabel}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-xl border-border/70 bg-secondary/60 px-4 py-2.5 font-medium hover:bg-secondary sm:w-auto">
              {cancelLabel}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
