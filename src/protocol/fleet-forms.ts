import type { FormOption } from '../types.ts'
import { optionValue, renderedOptions, requiredAttribute, selections, textContent } from './dom.ts'
import { isDisabled, matchingAttribute, selectedOptions } from './forms.ts'
import type { Page } from './page.ts'

/**
 * Dispatch form option with disabled and selected states.
 *
 * 派遣表单选项及禁用、选中状态。
 */
export type FleetOption<Value extends number = number> = FormOption<Value> & {
  disabled: boolean
  selected: boolean
}

/**
 * Read select or radio choices; return an empty list when the control is absent.
 *
 * 读取 select 或单选按钮；控件缺失时返回空列表。
 */
export function readFleetOptions<Value extends number>(
  page: Page,
  name: string,
  decode: (value: string) => Value,
): FleetOption<Value>[] {
  const select = matchingAttribute(page.$('body'), 'select', 'name', name)
  if (select.length) {
    const selected = new Set(selectedOptions(select).toArray())
    return renderedOptions(select).map(({ node, option }) => ({
      value: decode(optionValue(option)),
      label: textContent(option),
      disabled: isDisabled(page, option),
      selected: selected.has(node),
    }))
  }

  const labels = new Map<string, string>()
  for (const label of selections(page.$('label[for]'))) {
    labels.set(requiredAttribute(label, 'for'), label.text())
  }
  return selections(matchingAttribute(page.$('body'), 'input[type="radio"]', 'name', name)).map(
    (input) => {
      const id = input.attr('id')
      const labelled = id === undefined ? undefined : labels.get(id)
      return {
        value: decode(requiredAttribute(input, 'value')),
        label: labelled === undefined ? '' : textContent(labelled),
        disabled: isDisabled(page, input),
        selected: input.is(':checked'),
      }
    },
  )
}
