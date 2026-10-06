import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, selections, textContent } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

const TARGETS = [
  'alliances',
  'banneds',
  'dark',
  'defenses',
  'edif',
  'edif_l',
  'edif_p',
  'fleets',
  'friends',
  'h_d',
  'inves',
  'inves_c',
  'messages',
  'moons',
  'notes',
  'ofis',
  'planets',
  'players',
  'resources',
  'rw',
  'ships',
  'statpoints',
] as const

export type AdminResetTarget = (typeof TARGETS)[number]

const TARGET_NAMES: ReadonlySet<string> = new Set(TARGETS)

function isTarget(value: string): value is AdminResetTarget {
  return TARGET_NAMES.has(value)
}

export type AdminResetPage = Observation & {
  kind: 'adminReset'
  targets: FormOption<AdminResetTarget>[]
}

export function readAdminReset(page: Page): AdminResetPage {
  const form = page.one('form')
  return {
    kind: 'adminReset',
    ...observation(page),
    targets: selections(form.find('input[type="checkbox"][name]')).flatMap((control) => {
      const name = requiredAttribute(control, 'name')
      if (!isTarget(name)) return []
      return [{ value: name, label: textContent(form.find(`label[for="${name}"]`)) }]
    }),
  }
}

export function adminReset(session: Session): Promise<Observed<PageReply<AdminResetPage>>> {
  return routePage(session, ADMIN_ROUTES.reset, {}, readAdminReset)
}

/**
 * Reset the selected data categories in the current universe.
 *
 * 重置当前宇宙中所选的数据类别。
 */
export function adminResetUniverse(
  session: Session,
  options: { targets: readonly AdminResetTarget[] },
): Promise<Observed<Ack>> {
  const body: Record<string, string> = {}
  for (const target of options.targets) body[target] = 'on'
  return routeAck(session, ADMIN_ROUTES.reset, {
    method: 'POST',
    body,
  })
}
