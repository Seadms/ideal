import { asc, desc, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bodyweightLogs, benchmarkLogs, progressPhotos, sleepLogs } from '@/lib/db/schema'
import { daysAgoString } from '@/lib/utils'
import { BodyweightCard } from '@/components/progress/bodyweight-card'
import { BenchmarksCard } from '@/components/progress/benchmarks-card'
import { PhotosCard } from '@/components/progress/photos-card'
import { SleepTrend } from '@/components/progress/sleep-trend'

export async function ProgressView() {
  const since = daysAgoString(365)

  const [weights, benchmarks, photos, sleep] = await Promise.all([
    db.select().from(bodyweightLogs).where(gte(bodyweightLogs.date, since)).orderBy(asc(bodyweightLogs.date)),
    db.select().from(benchmarkLogs).orderBy(asc(benchmarkLogs.date)),
    db.select().from(progressPhotos).orderBy(desc(progressPhotos.date)),
    db.select().from(sleepLogs).where(gte(sleepLogs.date, daysAgoString(29))).orderBy(asc(sleepLogs.date)),
  ])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-6">
        <BodyweightCard logs={weights} />
        <SleepTrend logs={sleep} />
        <BenchmarksCard logs={benchmarks} />
      </div>
      <PhotosCard photos={photos} />
    </div>
  )
}
