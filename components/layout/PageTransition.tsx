"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const variants = {
  hidden: { opacity: 0, y: 6 },
  enter:  { opacity: 1, y: 0 },
  exit:   { opacity: 0 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{ duration: 0.1, ease: "easeOut" }}
        className="flex flex-col flex-1 min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
