import Anthropic from '@anthropic-ai/sdk'

export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'

let client: Anthropic | null = null

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Shared voice so every coaching surface sounds like the same calm person. */
export const VOICE = `Voice:
- Calm, honest and practical. Talk like a friend who coaches, not an app.
- No exclamation marks. No em dashes. No "you've got this", "keep crushing it" or other hype.
- No guilt and no lecturing. A missed day is data, not failure.
- Specific beats generic. Refer to the actual habit, days and reasons you were given.`

/**
 * Forces the model to answer through a single tool call, which gives us
 * schema-shaped JSON without parsing prose or stripping code fences.
 */
export async function callStructured<T>(params: {
  system: string
  content: string
  toolName: string
  toolDescription: string
  schema: Anthropic.Tool['input_schema']
  maxTokens: number
}): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: params.maxTokens,
    system: params.system,
    tools: [{ name: params.toolName, description: params.toolDescription, input_schema: params.schema }],
    tool_choice: { type: 'tool', name: params.toolName },
    messages: [{ role: 'user', content: params.content }],
  })

  const block = response.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('The model did not return a structured answer')
  if (response.stop_reason === 'max_tokens') throw new Error('The answer was cut off')
  return block.input as T
}

/** Strips em and en dashes and exclamation marks the model sometimes slips in. */
export function tidy(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/!/g, '.')
    .replace(/\.{2,}/g, '.')
    .trim()
}

/** Wraps user written text so it is read as data, not instructions. */
export function quote(text: string | null | undefined, max = 400): string {
  const clean = (text ?? '').replace(/[<>]/g, '').slice(0, max).trim()
  return clean ? `<user_text>${clean}</user_text>` : 'none given'
}

export const str = { type: 'string' } as const
