import type { PageReply } from '../../protocol/ack.ts'
import { catalogue } from '../../protocol/catalogue.ts'
import type { GrowthEntry } from '../../protocol/catalogue.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference, PlanetObservation } from '../../types.ts'

export type AchievementsPage = PlanetObservation & {
  kind: 'achievements'

  items: GrowthEntry[]
}

export function readAchievements(page: Page): AchievementsPage {
  return {
    kind: 'achievements',
    ...planetObservation(page),

    items: catalogue(page, 'readonly', true),
  }
}

export function achievements(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<AchievementsPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.achievements,
    { planetId: options.planetId },
    readAchievements,
  )
}
