import type { PageReply } from '../../protocol/ack.ts'
import { readLocationType } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  linkId,
  requiredAttribute,
  responseUrl,
  selections,
  splitTrailingParenthetical,
  textContent,
  withoutChildren,
} from '../../protocol/dom.ts'
import { displayed, readDecimal, readInteger } from '../../protocol/numbers.ts'
import { planetObservation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, PlanetObservation, PlanetReference } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Visible system slot; hidden identity or activity remains absent instead of being inferred.
 *
 * 星系中的可见轨道；未公开的身份或活动不做推断。
 */
export type GalaxyPosition = {
  coordinate: Coordinate
  status: 'occupied' | 'empty' | 'destroyed'

  planetId: number | null

  name: string | null

  rawActivityText: string | null
  moon: {
    id: number | null

    diameter: number | null

    temperature: number | null
  } | null

  debris: {
    metal: number
    crystal: number
  } | null

  player: {
    id: number | null
    name: string

    classes: string[]

    rank: number | null
  } | null

  alliance: {
    id: number | null
    tag: string

    rank: number | null
  } | null
  missions: {
    mission: number

    type: 1 | 2 | 3
  }[]

  hasPhalanxControl: boolean
}

export type GalaxyPage = PlanetObservation & {
  kind: 'galaxy'

  galaxy: number

  system: number

  positions: GalaxyPosition[]
}

function readMissions(page: Page, row: Selection, debris: boolean): GalaxyPosition['missions'] {
  const missions: GalaxyPosition['missions'] = []
  const add = (mission: number, type: GalaxyPosition['missions'][number]['type']): void => {
    if (!missions.some((item) => item.mission === mission && item.type === type))
      missions.push({ mission, type })
  }
  row.find('a[href*="target_mission="]').each((_index, link) => {
    const url = responseUrl(page.$(link).attr('href'), page.url)
    add(
      readInteger(url.searchParams.get('target_mission'), 1),
      readLocationType(url.searchParams.get('planettype')),
    )
  })
  for (const [selector, type] of [
    ['.gal_img_planet', 1],
    ['.gal_ico_moon', 3],
  ] as const) {
    if (row.find(`${selector} a[href^="javascript:doit"]`).length) add(6, type)
  }
  if (debris) add(8, 2)
  if (row.find('.i-mis10').length) add(10, 1)
  return missions
}

export function readGalaxy(page: Page): GalaxyPage {
  const galaxyNumber = readInteger(page.attribute('#galaxy_form input[name="galaxy"]', 'value'), 1)
  const system = readInteger(page.attribute('#galaxy_form input[name="system"]', 'value'), 1)
  const rows = page.$('.gal_user')
  if (!rows.length) throw new OperationError(ErrorCode.ParseError, 'Missing galaxy positions')
  const positions = selections(rows).map<GalaxyPosition>((row) => {
    const planet = readInteger(row.find('.gal_number').text().trim(), 1)

    const planetIcon = row.find('.gal_img_planet')
    const planetId = planetIcon.length
      ? readInteger(planetIcon.attr('id')?.match(/^p_(\d+)$/)?.[1], 1)
      : null
    const playerNode = row.find('.gal_player_name')
    const playerName = playerNode.find('.galaxy-username')
    const playerTip = tooltipPage(page, playerNode.find('[data-tooltip-content]'))
    const allianceNode = row.find('.gal_ally_name')
    const allianceTip = tooltipPage(page, allianceNode.find('[data-tooltip-content]'))

    const playerCall =
      playerTip.$('[onclick*="Playercard"]').attr('onclick') ??
      row.find('[onclick*="Dialog.PM"]').attr('onclick')
    const playerId = page.handlerId(playerCall, 'Playercard') ?? page.handlerId(playerCall, 'PM')

    if (playerCall !== undefined && playerId === null)
      throw new OperationError(ErrorCode.ParseError, 'Invalid player action')
    const moonNode = row.find('.gal_ico_moon')
    const moonTip = tooltipPage(page, moonNode.find('[data-tooltip-content]'))
    const moonRows = moonTip.$('td')
    const moonAction = moonNode.find('a[href^="javascript:doit"]').first().attr('href')
    const moonId = moonAction ? readInteger(page.staticCall(moonAction, 'doit')[1], 1) : null
    const debrisTip = tooltipPage(page, row.find('.gal_ico_trash [data-tooltip-content]'))
    const debris = debrisTip.$('.tooltip_class_901').length
      ? {
          metal: displayed(debrisTip.$('.tooltip_class_901').text()),
          crystal: displayed(debrisTip.$('.tooltip_class_902').text()),
        }
      : null
    const label = planetId
      ? splitTrailingParenthetical(textContent(row.find('.gal_planet_name')))
      : { text: null, trailing: null }
    return {
      coordinate: { galaxy: galaxyNumber, system, planet },
      status: planetId ? 'occupied' : row.find('.gal_planet_name').length ? 'destroyed' : 'empty',
      planetId,
      name: label.text,
      rawActivityText: label.trailing,
      moon: moonNode.find('.ico_moon').length
        ? {
            id: moonId,

            diameter: moonRows.eq(0).length
              ? displayed(textContent(withoutChildren(moonRows.eq(0))))
              : null,
            temperature: moonRows.eq(1).length
              ? readDecimal(textContent(withoutChildren(moonRows.eq(1))))
              : null,
          }
        : null,
      debris,
      player: textContent(playerNode)
        ? {
            id: playerId,
            name: textContent(playerName),

            classes: requiredAttribute(playerName, 'class').split(/\s+/).filter(Boolean),
            rank: linkId(playerTip, 'a[href*="statistics"]', 'start'),
          }
        : null,
      alliance: textContent(allianceNode)
        ? {
            id: linkId(allianceTip, 'a[href*="page=alliance"]', 'id'),
            tag: textContent(allianceNode),
            rank: linkId(allianceTip, 'a[href*="statistics"]', 'start'),
          }
        : null,
      missions: readMissions(page, row, debris !== null),
      hasPhalanxControl: !!row.find('.i-mis17').length,
    }
  })
  return {
    kind: 'galaxy',
    ...planetObservation(page),
    galaxy: galaxyNumber,
    system,
    positions,
  }
}

/**
 * Read a system from the selected planet; the server may charge deuterium.
 *
 * 从所选星球读取星系；服务端可能扣除重氢。
 */
export function galaxy(
  session: Session,
  options: { origin: PlanetReference; target: { galaxy: number; system: number } },
): Promise<Observed<PlanetData<PageReply<GalaxyPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.galaxy,
    {
      planetId: options.origin.planetId,
      query: { galaxy: options.target.galaxy, system: options.target.system },
    },
    readGalaxy,
  )
}
