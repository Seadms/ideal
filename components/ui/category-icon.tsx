import {
  Dumbbell, CheckCircle2, Leaf, BookOpen, Code2, Rocket, Sofa, Utensils,
  Blocks, Gem, Brush, Home, MessageCircle, Palette, Zap, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// One icon per task/habit/reward category — replaces the old emoji markers so
// list items share the app's lucide icon language.
const ICONS: Record<string, LucideIcon> = {
  fitness: Dumbbell,
  productivity: CheckCircle2,
  'self-care': Leaf,
  growth: BookOpen,
  coding: Code2,
  project: Rocket,
  rest: Sofa,
  food: Utensils,
  hobby: Blocks,
  luxury: Gem,
  chore: Brush,
  home: Home,
  social: MessageCircle,
  creative: Palette,
  general: Zap,
}

export function CategoryIcon({ category, size = 13, className }: {
  category: string
  size?: number
  className?: string
}) {
  const Icon = ICONS[category] ?? Zap
  return <Icon size={size} className={cn('shrink-0 text-zinc-500', className)} aria-hidden />
}
