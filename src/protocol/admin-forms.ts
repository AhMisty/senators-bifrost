import type { FormOption } from '../types.ts'
import type { Selection } from './dom.ts'
import { controlOptions, linkUrl, requiredAttribute, textContent } from './dom.ts'
import { controlValue } from './forms.ts'
import type { Page } from './page.ts'

/**
 * Administrative form control; multiple-select values are string arrays and other values are strings.
 *
 * 管理员表单控件；多选列表的值为字符串数组，其他控件为字符串。
 */
export type AdminFormField = {
  name: string

  type: string

  value: string | string[]

  checked: boolean

  options: FormOption[]
}

/**
 * Read named controls from an administrative form.
 *
 * 读取管理员表单中带名称的控件。
 *
 * @returns Controls in document order, including disabled and unchecked controls.
 *
 * 按页面顺序排列的控件，包含禁用和未勾选的控件。
 */
export function adminFormFields(form: Selection): AdminFormField[] {
  const controls = form.find('input[name],select[name],textarea[name]')
  return controls.toArray().map((_node, index): AdminFormField => {
    const control = controls.eq(index)
    return {
      name: requiredAttribute(control, 'name'),
      type: control.is('select')
        ? 'select'
        : control.is('textarea')
          ? 'textarea'
          : (control.attr('type') ?? 'text'),
      value: controlValue(control),
      checked: control.is(':checked'),
      options: controlOptions(control),
    }
  })
}

export type AdminMenuCard = {
  value: string

  title: string
}

export function adminMenuCards(page: Page, parameter: string): AdminMenuCard[] {
  return page
    .$('.card')
    .toArray()
    .flatMap((node) => {
      const card = page.$(node)
      const link = card.find('a')
      if (link.length === 0) return []
      const stated = linkUrl(page, link).searchParams.get(parameter)
      if (stated === null) return []
      return [{ value: stated, title: textContent(card.find('.card-title')) }]
    })
}
