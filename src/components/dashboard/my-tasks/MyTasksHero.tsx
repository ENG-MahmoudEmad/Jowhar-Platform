"use client";

import { motion } from "framer-motion";
import TodayFocusCard from "@/components/dashboard/my-tasks/TodayFocusCard";
import WelcomePanel from "@/components/dashboard/my-tasks/WelcomePanel";

export default function MyTasksHero() {
  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6 items-stretch"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 18, scale: 0.98 },
          show:   { opacity: 1, y: 0,  scale: 1 },
        }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <WelcomePanel
          name="KB"
          hue={170}
          sat={35}
        />
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 18, scale: 0.98 },
          show:   { opacity: 1, y: 0,  scale: 1 },
        }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <TodayFocusCard />
      </motion.div>
    </motion.section>
  );
}
