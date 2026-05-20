//src\app\(dashboard)\my-tasks\page.tsx

import MyTasksHero      from "@/components/dashboard/my-tasks/MyTasksHero";
import PersonalCalendar from "@/components/dashboard/my-tasks/PersonalCalendar";
import MyNotes          from "@/components/dashboard/my-tasks/MyNotes";
import DirectorNotes    from "@/components/dashboard/my-tasks/DirectorNotes";

export default function MyTasksPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <MyTasksHero />

      <section>
        <PersonalCalendar accentColor="#458482" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyNotes />
        <DirectorNotes />
      </section>
    </div>
  );
}