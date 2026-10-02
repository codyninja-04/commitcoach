import { ChartIcon, GearIcon, ListIcon, SunIcon } from '@/components/ui/Icons'

export const NAV = [
  { href: '/today', label: 'Today', Icon: SunIcon },
  { href: '/habits', label: 'Habits', Icon: ListIcon },
  { href: '/insights', label: 'Insights', Icon: ChartIcon },
  { href: '/settings', label: 'Settings', Icon: GearIcon },
] as const

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
