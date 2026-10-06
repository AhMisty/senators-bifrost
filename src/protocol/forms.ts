import { ErrorCode } from '../types.ts'
import type { Selection } from './dom.ts'
import { optionValue, requiredAttribute, selections } from './dom.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'

/**
 * Match controls by exact attribute value in document order.
 *
 * 按属性值精确匹配控件，保持文档顺序。
 */
export function matchingAttribute(
  root: Selection,
  selector: string,
  attribute: string,
  value: string,
): Selection {
  return root.find(selector).filter((_index, node) => node.attribs[attribute] === value)
}

/**
 * Read the value of the unique named control.
 *
 * 读取唯一同名控件的值。
 *
 * @returns The control value, or an empty string when no option is selected.
 *
 * 控件值；未选中任何选项时为空字符串。
 *
 * @throws {OperationError} Missing or duplicate controls, or multiple selected values, with code ParseError.
 *
 * 控件缺失、同名控件不唯一或选中多个值，错误码为 ParseError。
 */
export function fieldValue(root: Selection, name: string): string {
  const control = matchingAttribute(root, '[name]', 'name', name)
  if (control.length !== 1)
    throw new OperationError(ErrorCode.ParseError, `Missing ${name} form field`)
  const value = controlValue(control)
  if (!Array.isArray(value)) return value

  if (value.length > 1)
    throw new OperationError(ErrorCode.ParseError, `Ambiguous ${name} form field`)
  return value[0] ?? ''
}

/**
 * Read a nonempty protocol field required to continue, such as a fleet token.
 *
 * 读取继续协议操作所需的非空字段，如舰队令牌。
 */
export function requiredFieldValue(root: Selection, name: string): string {
  const value = fieldValue(root, name)
  if (!value) throw new OperationError(ErrorCode.ParseError, `Missing ${name} form value`)
  return value
}

/**
 * Multiple selects retain all selected options; single selects use the last selected option, defaulting to the first enabled option only when size≤1.
 *
 * 多选下拉框保留全部选中项；单选下拉框取最后选中项，仅 size≤1 时采用首个可用默认项。
 */
export function selectedOptions(control: Selection): Selection {
  const options = control.find('option')
  const selected = options.filter('[selected]')
  if (control.attr('multiple') !== undefined) return selected
  if (selected.length) return selected.last()
  return Number(control.attr('size') ?? 1) <= 1
    ? options.filter(':not(:disabled)').first()
    : options.slice(0, 0)
}

/**
 * Read selected options, textarea text or the input value attribute; checkable inputs default to on.
 *
 * 读取选项、文本域正文或输入控件的 value 属性；勾选控件缺省值为 on。
 *
 * @returns An array for a multiple select, otherwise a string.
 *
 * 多选下拉框返回数组；其他控件返回字符串。
 */
export function controlValue(control: Selection, options?: Selection): string | string[] {
  if (control.is('select')) {
    const selected = options ?? selectedOptions(control)
    const values = selections(selected).map((option) => optionValue(option))
    return control.attr('multiple') !== undefined ? values : (values[0] ?? '')
  }
  if (control.is('textarea')) return control.text()
  const value = control.attr('value')
  if (value !== undefined) return value
  return control.is('input[type="checkbox"],input[type="radio"]') ? 'on' : ''
}

/**
 * Collect successful controls in order, excluding submit buttons, files and disabled controls.
 *
 * 按顺序收集可提交控件，排除提交按钮、文件与禁用项。
 */
export function formFields(page: Page, form: Selection): URLSearchParams {
  const result = new URLSearchParams()
  form.find('input[name],select[name],textarea[name]').each((_index, node) => {
    const input = page.$(node)
    const name = requiredAttribute(input, 'name')
    const type = input.attr('type')?.toLowerCase()
    if (
      name === '' ||
      isDisabled(page, input) ||
      ['submit', 'button', 'reset', 'file', 'image'].includes(type ?? '')
    )
      return
    if (['checkbox', 'radio'].includes(type ?? '') && !input.is(':checked')) return
    const selected = input.is('select')
      ? selectedOptions(input).filter((_optionIndex, option) => !isDisabled(page, page.$(option)))
      : undefined
    if (selected?.length === 0) return
    const current = controlValue(input, selected)
    for (const entry of Array.isArray(current) ? current : [current]) result.append(name, entry)
  })
  return result
}

/**
 * Check whether a control's form has an enabled submit button.
 *
 * 判断控件所属表单是否包含可用提交按钮。
 */
export function hasSubmitControl(page: Page, controls: Selection): boolean {
  return controls.toArray().some((node) => {
    const control = page.$(node)
    if (isDisabled(page, control)) return false
    return control
      .closest('form')
      .find('button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]')
      .toArray()
      .some((button) => !isDisabled(page, page.$(button)))
  })
}

/**
 * A disabled fieldset exempts controls inside its first legend.
 *
 * 禁用 fieldset 不影响其首个 legend 内的控件。
 */
export function isDisabled(page: Page, control: Selection): boolean {
  if (control.is('[disabled], optgroup[disabled] > option')) return true
  const legends = new Set(control.parents('legend').toArray())
  return control
    .parents('fieldset[disabled]')
    .toArray()
    .some((fieldset) => {
      const legend = page.$(fieldset).children('legend').node()
      return legend === undefined || !legends.has(legend)
    })
}
