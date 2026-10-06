import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, requiredText } from '../../protocol/dom.ts'
import { hasSubmitControl } from '../../protocol/forms.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetObservation, PlanetReference } from '../../types.ts'

export type CreateMoonPage = PlanetObservation & {
  kind: 'createMoon'

  priceText: string

  hasSubmitControl: boolean
}

export function readCreateMoon(page: Page): CreateMoonPage {
  const band = page.one('.ticket_bottom_band')
  const submit = band.find('form input[type="submit"]')
  return {
    kind: 'createMoon',
    ...planetObservation(page),
    priceText: submit.length
      ? requiredAttribute(submit, 'value')
      : requiredText(band.children('span').last(), 'moon price'),
    hasSubmitControl: hasSubmitControl(page, submit),
  }
}

export function createMoon(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<CreateMoonPage>>>> {
  return routePage(session, GAME_ROUTES.createMoon, { planetId: options.planetId }, readCreateMoon)
}

export function createMoonBuy(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.createMoonBuy, {
    planetId: options.planetId,
    method: 'POST',
  })
}
