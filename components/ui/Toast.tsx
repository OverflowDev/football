"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-up" />,
  error: <AlertCircle className="h-5 w-5 text-down" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

export function ToastViewport() {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 card-surface bg-card p-4 shadow-xl"
            )}
          >
            {icons[t.variant]}
            <div className="flex-1">
              <p className="text-sm font-medium text-content">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-content-secondary">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
              className="text-content-secondary hover:text-content"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
