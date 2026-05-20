import ArchiveHero   from "@/components/dashboard/archive/ArchiveHero"
import PlatformGrid  from "@/components/dashboard/archive/PlatformGrid"

export default function ArchivePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ArchiveHero platformCount={9} />
      <PlatformGrid />
    </div>
  )
}