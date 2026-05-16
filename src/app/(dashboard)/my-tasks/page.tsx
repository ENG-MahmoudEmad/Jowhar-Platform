import MyTasksHero       from "@/components/dashboard/my-tasks/MyTasksHero";
import PersonalCalendar  from "@/components/dashboard/my-tasks/PersonalCalendar";

export default function MyTasksPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">

      <MyTasksHero />

      <section>
        <PersonalCalendar accentColor="#458482" />
      </section>

    </div>
  );
}