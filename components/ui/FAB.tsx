"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Lightbulb, Film, CheckCircle2, Sparkles, GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Lightbulb,    label: "Add Idea",     href: "/ideas",     color: "bg-yellow-500",  delay: 0 },
  { icon: Film,         label: "Add to Queue", href: "/queue",     color: "bg-blue-500",    delay: 1 },
  { icon: CheckCircle2, label: "Mark Posted",  href: "/streak",    color: "bg-green-500",   delay: 2 },
  { icon: Sparkles,     label: "Generate",     href: "/generator", color: "bg-purple-500",  delay: 3 },
  { icon: GitBranch,    label: "Pipeline",     href: "/pipeline",  color: "bg-violet-600",  delay: 4 },
];

export function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleAction(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6 flex flex-col-reverse items-end gap-3">
      {/* Action buttons */}
      <AnimatePresence>
        {open && actions.map(({ icon: Icon, label, href, color, delay }) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, scale: 0.6, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.6, x: 20 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 22,
              delay: delay * 0.06,
            }}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-semibold bg-background shadow-md border border-border px-2.5 py-1.5 rounded-xl text-foreground whitespace-nowrap">
              {label}
            </span>
            <button
              onClick={() => handleAction(href)}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg tap-scale",
                color
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg fab-shadow",
          open ? "bg-foreground" : "gradient-primary"
        )}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 -z-10"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
