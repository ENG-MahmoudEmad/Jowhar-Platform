import TeamProgress       from '@/components/dashboard/TeamProgress';
import ProjectCalendar    from '@/components/dashboard/ProjectCalendar';
import DeadlineCountdown  from '@/components/dashboard/DeadlineCountdown';

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Team Progress */}
      <section>
        <TeamProgress />
      </section>

      {/* Calendar + Deadline — 2/3 + 1/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectCalendar />
        </div>
        <div className="lg:col-span-1">
          <DeadlineCountdown />
        </div>
      </section>

    </div>
  );
}