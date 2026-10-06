/**
 * Language used for this public-page request.
 *
 * 本次公开页面请求使用的语言。
 */
export type PublicPageOptions = { language?: string }

export function publicPageQuery(options: PublicPageOptions): Record<string, string> {
  return options.language === undefined ? {} : { lang: options.language }
}
