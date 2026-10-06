import type { Coordinate } from '../types.ts'
import { coordinateIn } from './coordinates.ts'
import type { Selection } from './dom.ts'
import { requiredAttribute, requiredText, textContent } from './dom.ts'
import { readInteger } from './numbers.ts'
import type { Page } from './page.ts'

/**
 * Planet in a gathering or delivery plan; coordinate is null when unreported.
 *
 * 调集或运输计划中的星球；未显示坐标时 coordinate 为 null。
 */
export type PlanCandidate = {
  planetId: number
  name: string

  coordinate: Coordinate | null

  travelTimeText: string
}

/**
 * Resource-delivery candidate with its displayed stock text.
 *
 * 资源运输候选星球及其显示库存原文。
 */
export type ResourcePlanCandidate = PlanCandidate & { resourceTexts: string[] }

/**
 * Read candidates in form order with page-specific row data.
 *
 * 按表单顺序读取候选行，并附加页面专有数据。
 */
export function planCandidates<T extends object>(
  page: Page,
  form: Selection,
  extra: (row: Selection) => T,
): (PlanCandidate & T)[] {
  const candidates: (PlanCandidate & T)[] = []
  for (const input of form.find('input[name="palanets[]"]').toArray()) {
    const field = page.$(input)
    const row = field.closest('.rd_planet_row')
    const labels = row.find('.rd_planet_data_name span')
    candidates.push({
      planetId: readInteger(requiredAttribute(field, 'value'), 1),
      name: requiredText(labels.eq(0), 'plan row name'),
      coordinate: coordinateIn(textContent(labels.eq(1))),
      travelTimeText: requiredText(labels.eq(2), 'plan row travel time'),
      ...extra(row),
    })
  }
  return candidates
}

function resourceTexts(page: Page, row: Selection): string[] {
  return row
    .find('.text_res')
    .toArray()
    .map((node) => page.$(node).text().trim())
}

export function resourceCandidates(page: Page, form: Selection): ResourcePlanCandidate[] {
  return planCandidates(page, form, (row) => ({ resourceTexts: resourceTexts(page, row) }))
}
