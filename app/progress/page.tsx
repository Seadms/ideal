import { asc, desc, gte } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { bodyweightLogs, benchmarkLogs, progressPhotos } from '@/lib/db/schema'
import { daysAgoString } from '@/lib/utils'
import { BodyweightCard } from '@/components/progress/bodyweight-card'
import { BenchmarksCard } from '@/components/progress/benchmarks-card'
import { PhotosCard } from '@/components/progress/photos-card'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  await initDb()
  const since = daysAgoString(365)

  const [weights, benchmarks, photos] = await Promise.all([
    db.select().from(bodyweightLogs).where(gte(bodyweightLogs.date, since)).orderBy(asc(bodyweightLogs.date)),
    db.select().from(benchmarkLogs).orderBy(asc(benchmarkLogs.date)),
    db.select().from(progressPhotos).orderBy(desc(progressPhotos.date)),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <PageHeader title="Progress" ghost="Recomp" sub="Fat down, strength up. Track the recomp." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-6">
          <BodyweightCard logs={weights} />
          <BenchmarksCard logs={benchmarks} />
        </div>
        <PhotosCard photos={photos} />
      </div>
    </div>
  )
}
