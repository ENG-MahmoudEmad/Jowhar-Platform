import TodayFocusCard from "@/components/dashboard/my-tasks/TodayFocusCard";
import WelcomePanel from "@/components/dashboard/my-tasks/WelcomePanel";

export default function MyTasksHero() {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6 items-stretch">
      <WelcomePanel
        name="KB"
        hue={170}
        sat={35}
      />

      <TodayFocusCard />
    </section>
  );
}
