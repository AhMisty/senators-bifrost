import type { PageReply } from '../../protocol/ack.ts'
import {
  prefixedId,
  recordEntry,
  requiredAttribute,
  requiredText,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import type { SelectedNode } from '../../protocol/dom.ts'
import { displayed } from '../../protocol/numbers.ts'
import { planetObservation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference, PlanetObservation } from '../../types.ts'

export type ElementRecord = {
  elementId: number
  name: string

  record: number | null

  owned: number | null

  holders: {
    id: number | null
    name: string
  }[]
}

export type RecordTable = {
  categoryId: number

  name: string
  records: ElementRecord[]
}

export type RecordsPage = PlanetObservation & {
  kind: 'records'

  tables: RecordTable[]
}

function recordRow(page: Page, node: SelectedNode): ElementRecord {
  const row = page.$(node)
  const { elementId: id, name } = recordEntry(row)
  const tooltip = tooltipPage(page, row.find('.record_made'))
  return {
    elementId: id,
    name,
    record: row.find('.record_server > div').length
      ? displayed(textContent(row.find('.record_server > div')))
      : null,
    owned: row.find('.record_text:not(.record_server) > div').length
      ? displayed(textContent(row.find('.record_text:not(.record_server) > div')))
      : null,
    holders: selections(tooltip.$('a[onclick]')).map((holder) => ({
      id: tooltip.handlerId(holder.attr('onclick'), 'Playercard'),
      name: textContent(holder),
    })),
  }
}

export function readRecords(page: Page): RecordsPage {
  page.one('#content #u000')
  return {
    kind: 'records',
    ...planetObservation(page),
    tables: selections(page.$('#content #ally_content > div[id^="u"]')).map((table) => ({
      categoryId: prefixedId(requiredAttribute(table, 'id'), 'u'),
      name: requiredText(table.children('.record_header'), 'record table name'),
      records: table
        .find('.record_rows')
        .toArray()
        .map((row) => recordRow(page, row)),
    })),
  }
}

export function records(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<RecordsPage>>>> {
  return routePage(session, GAME_ROUTES.records, { planetId: options.planetId }, readRecords)
}
