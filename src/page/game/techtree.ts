import type { PageReply } from '../../protocol/ack.ts'
import { elementId, recordEntry, requiredAttribute, selections } from '../../protocol/dom.ts'
import { readInteger, readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference, PlanetObservation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type TechnologyRequirement = {
  elementId: number
  name: string
  requiredLevel: number

  satisfied: boolean
}

export type TechnologyEntry = {
  elementId: number
  name: string

  categoryId: number | null
  requirements: TechnologyRequirement[]
}

export type TechtreePage = PlanetObservation & {
  kind: 'techtree'
  entries: TechnologyEntry[]
}

function requirementSatisfied(style: string): boolean {
  if (/lime/i.test(style)) return true
  if (/red/i.test(style)) return false
  throw new OperationError(ErrorCode.ParseError, 'Unreadable requirement status')
}

export function readTechtree(page: Page): TechtreePage {
  page.one('#content #ally_content .gray_stripe .record_btn.ico_star')
  return {
    kind: 'techtree',
    ...planetObservation(page),
    entries: selections(page.$('.record_rows')).map((row) => {
      const { elementId: id, name } = recordEntry(row)
      const category = row
        .parent()
        .attr('class')
        ?.match(/\bu(\d+)\b/)?.[1]
      return {
        elementId: id,
        name,
        categoryId: category === undefined ? null : readInteger(category),
        requirements: selections(row.find('.required_block')).map((item) => {
          const level = item.find('.text')
          return {
            elementId: elementId(item.find('img').attr('src')),
            name: requiredAttribute(item.find('img'), 'alt'),
            requiredLevel: readQuantity(level.text()),
            satisfied: requirementSatisfied(requiredAttribute(level, 'style')),
          }
        }),
      }
    }),
  }
}

export function techtree(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<TechtreePage>>>> {
  return routePage(session, GAME_ROUTES.techtree, { planetId: options.planetId }, readTechtree)
}
