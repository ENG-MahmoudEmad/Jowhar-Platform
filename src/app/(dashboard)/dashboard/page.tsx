import TeamProgress      from '@/components/dashboard/TeamProgress'
import ProjectCalendar   from '@/components/dashboard/ProjectCalendar'
import DeadlineCountdown from '@/components/dashboard/DeadlineCountdown'
import MembersCard       from '@/components/dashboard/MembersCard'
import Activityfeed       from '@/components/dashboard/Activityfeed'
import Leaderboard from '@/components/dashboard/Leaderboard'

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Team Progress */}
      <section>
        <TeamProgress />
      </section>

      {/* Calendar + Deadline — 2/3 + 1/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <ProjectCalendar />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <DeadlineCountdown />
        </div>
      </section>

      {/* Members + My Tasks — 1/3 + 2/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
  <div className="lg:col-span-1 flex flex-col">
    <MembersCard />
  </div>
  <div className="lg:col-span-2 flex flex-col h-full"> 
    <Activityfeed />
  </div>
</section>

<section>
  <Leaderboard />
</section>


    </div>
  )
}