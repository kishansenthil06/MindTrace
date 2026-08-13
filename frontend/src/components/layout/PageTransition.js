import { motion } from "framer-motion";

export function PageTransition({ children, className = "", wide = false, testId }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`mx-auto w-full px-5 pb-24 pt-28 sm:px-8 ${wide ? "max-w-7xl" : "max-w-6xl"} ${className}`}
      data-testid={testId}
    >
      {children}
    </motion.main>
  );
}
