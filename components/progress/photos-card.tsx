'use client'

import { useState, useTransition } from 'react'
import { addProgressPhoto, deleteProgressPhoto } from '@/lib/actions/progress'
import type { ProgressPhoto } from '@/lib/db/schema'
import { Camera, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { todayString, formatDate, cn } from '@/lib/utils'

const POSES = ['front', 'side', 'back'] as const
type Pose = typeof POSES[number]

// Downscale + JPEG-compress in the browser so we store small data URLs, not
// multi-MB originals. ~1000px / q0.72 keeps a weekly set well under server limits.
async function compress(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = rej
    im.src = dataUrl
  })
  const maxDim = 1000
  let { width, height } = img
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

interface Props {
  photos: ProgressPhoto[]   // descending by date
}

export function PhotosCard({ photos }: Props) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(todayString())
  const [busy, setBusy] = useState<Pose | null>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)

  const handleFile = async (pose: Pose, file: File | undefined) => {
    if (!file) return
    setBusy(pose)
    try {
      const data = await compress(file)
      await new Promise<void>(resolve => startTransition(async () => { await addProgressPhoto(pose, data, date); resolve() }))
    } catch {
      /* ignore — bad image */
    } finally {
      setBusy(null)
    }
  }

  // Group by date (descending) → { date, photos: { pose: photo } }
  const byDate = new Map<string, Partial<Record<Pose, ProgressPhoto>>>()
  for (const p of photos) {
    if (!byDate.has(p.date)) byDate.set(p.date, {})
    byDate.get(p.date)![p.pose as Pose] = p
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera size={14} className="text-fuchsia-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Progress Photos</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        {/* Add a set */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Add weekly set</p>
            <Input
              type="date"
              value={date}
              max={todayString()}
              onChange={e => setDate(e.target.value)}
              className="h-7 text-xs w-36 py-0"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {POSES.map(pose => (
              <label
                key={pose}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 py-3 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/40 transition-colors',
                  busy === pose && 'opacity-60 pointer-events-none',
                )}
              >
                {busy === pose
                  ? <Loader2 size={14} className="text-zinc-400 animate-spin" />
                  : <Plus size={14} className="text-zinc-500" />}
                <span className="text-[10px] capitalize text-zinc-400">{pose}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { handleFile(pose, e.target.files?.[0]); e.target.value = '' }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Existing sets */}
        {dates.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-2 border-t border-zinc-800 pt-4">
            No photos yet. Shoot front / side / back weekly, same lighting and time of day.
          </p>
        ) : (
          <div className="space-y-3 border-t border-zinc-800 pt-3">
            {dates.map(d => {
              const set = byDate.get(d)!
              return (
                <div key={d}>
                  <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{formatDate(d)}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {POSES.map(pose => {
                      const photo = set[pose]
                      return (
                        <div key={pose} className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800/40">
                          {photo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.imageData}
                                alt={`${pose} ${d}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setViewing(photo)}
                              />
                              <button
                                onClick={() => startTransition(async () => { await deleteProgressPhoto(photo.id) })}
                                disabled={isPending}
                                className="absolute top-1 right-1 p-1 rounded bg-zinc-950/70 text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
                              >
                                <Trash2 size={11} />
                              </button>
                              <span className="absolute bottom-1 left-1 text-[9px] capitalize text-zinc-300 bg-zinc-950/60 px-1 rounded">{pose}</span>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[9px] capitalize text-zinc-700">{pose}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/90 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <button className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewing.imageData}
            alt={`${viewing.pose} ${viewing.date}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
