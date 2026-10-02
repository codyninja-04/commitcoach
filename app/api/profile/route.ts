import { NextResponse } from 'next/server'
import { cleanText, jsonError, readJson, requireUser } from '@/lib/api'
import { isValidTimezone } from '@/lib/dates'

export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('Invalid request')

  const update: Record<string, unknown> = {}
  if ('display_name' in body) update.display_name = cleanText(body.display_name, 60)
  if ('timezone' in body) {
    if (typeof body.timezone !== 'string' || !isValidTimezone(body.timezone)) return jsonError('Unknown timezone')
    update.timezone = body.timezone
  }
  if ('reminder_enabled' in body) update.reminder_enabled = body.reminder_enabled === true
  if ('reminder_hour' in body) {
    const h = Number(body.reminder_hour)
    if (!Number.isInteger(h) || h < 0 || h > 23) return jsonError('Pick an hour between 0 and 23')
    update.reminder_hour = h
  }
  if (!Object.keys(update).length) return jsonError('Nothing to update')

  const { data, error } = await supabase.from('profiles').update(update).eq('id', user.id).select('*').single()
  if (error) return jsonError('Could not save your settings', 500)
  return NextResponse.json({ profile: data })
}
