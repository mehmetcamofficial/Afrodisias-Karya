"use client";

import { motion, useReducedMotion } from "framer-motion";

const tags = { div: motion.div, article: motion.article, header: motion.header } as const;

/** Subtle fade-up on first scroll into view; static when reduced motion is requested. */
export function Reveal({ as = "div", children, className }: { as?: keyof typeof tags; children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const Tag = tags[as];
  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
