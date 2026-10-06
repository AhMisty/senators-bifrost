import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, selections } from '../../protocol/dom.ts'
import { elementFields } from '../../protocol/elements.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { ElementInput, Observation } from '../../types.ts'

export type AdminGiveawayFilters = {
  planets: boolean
  moons: boolean

  homePlanetOnly: boolean

  /**
   * Exclude accounts beyond the server inactivity threshold.
   *
   * 排除超过服务端不活跃期限未登录的账号。
   */
  activeOnly: boolean
}

export type AdminGiveawayPage = Observation & {
  kind: 'adminGiveaway'
  elementIds: number[]
  filters: AdminGiveawayFilters
}

const ELEMENT_FIELD = 'element_'

export function readAdminGiveaway(page: Page): AdminGiveawayPage {
  const checked = (name: string): boolean => page.$(`input[name="${name}"]`).is(':checked')
  return {
    kind: 'adminGiveaway',
    ...observation(page),
    elementIds: selections(page.$(`input[name^="${ELEMENT_FIELD}"]`)).map((field) => {
      const name = requiredAttribute(field, 'name')
      return readInteger(name.slice(ELEMENT_FIELD.length))
    }),
    filters: {
      planets: checked('planet'),
      moons: checked('moon'),
      homePlanetOnly: checked('mainplanet'),
      activeOnly: checked('no_inactive'),
    },
  }
}

export function adminGiveaway(session: Session): Promise<Observed<PageReply<AdminGiveawayPage>>> {
  return routePage(session, ADMIN_ROUTES.giveaway, {}, readAdminGiveaway)
}

/**
 * Award elements to matching targets in the current universe; the server rounds quantities with a minimum of zero.
 *
 * 向当前宇宙中匹配的目标赠送元素；服务端将数量取整并限制为非负数。
 *
 * @param options - Omitted filters are false; select at least planets or moons.
 *
 * filters 中省略的项为 false；至少选择 planets 或 moons。
 */
export function adminGiveawayAward(
  session: Session,
  options: {
    elements: ElementInput
    filters: Partial<AdminGiveawayFilters>
  },
): Promise<Observed<Ack>> {
  const { filters } = options
  const body = new URLSearchParams({ action: 'send' })
  for (const [name, on] of [
    ['planet', filters.planets],
    ['moon', filters.moons],
    ['mainplanet', filters.homePlanetOnly],
    ['no_inactive', filters.activeOnly],
  ] as const)
    if (on === true) body.set(name, '1')
  for (const [name, value] of elementFields(options.elements, ELEMENT_FIELD, ''))
    body.append(name, value)
  return routeAck(session, ADMIN_ROUTES.giveaway, {
    method: 'POST',
    body,
  })
}
