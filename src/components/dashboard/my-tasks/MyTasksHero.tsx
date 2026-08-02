//src\components\dashboard\my-tasks\MyTasksHero.tsx
"use client";

import { memo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import TodayFocusCard from "@/components/dashboard/my-tasks/TodayFocusCard";
import WelcomePanel from "@/components/dashboard/my-tasks/WelcomePanel";
import type { Task } from "@/lib/taskStats";

// ─── Module-level constants — fully static, zero dependency on props/state ────
// (the two motion.div items used IDENTICAL variants + transition objects —
// hoisting also removes that duplication)
const SECTION_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1 },
};

const ITEM_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

function MyTasksHero({
  tasks,
  name,
  nameAr,
  hue,
  sat,
}: {
  tasks: Task[];
  name: string;
  nameAr?: string;
  hue: number;
  sat: number;
}) {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial="hidden"
        animate="show"
        variants={SECTION_VARIANTS}
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6 items-stretch"
      >
        <m.div variants={ITEM_VARIANTS} transition={ITEM_TRANSITION}>
          <WelcomePanel name={name} nameAr={nameAr} hue={hue} sat={sat} />
        </m.div>

        <m.div variants={ITEM_VARIANTS} transition={ITEM_TRANSITION}>
          <TodayFocusCard tasks={tasks} />
        </m.div>
      </m.section>
    </LazyMotion>
  );
}

export default memo(MyTasksHero);