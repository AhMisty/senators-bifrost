import type { PageReply } from '../../protocol/ack.ts'
import {
  contentText,
  requiredHtml,
  requiredText,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type PublicNewsEntry = {
  id: number
  /**
   * News title; the server permits an empty value.
   *
   * 新闻标题，服务端允许为空。
   */
  title: string
  /**
   * Plain news text retaining line and paragraph boundaries.
   *
   * 新闻正文纯文本，保留换行与段落边界。
   */
  text: string

  /**
   * Publication date and author as displayed on the page.
   *
   * 页面显示的发布日期及作者。
   */
  from: string
}

export type PublicNewsPage = Observation & {
  kind: 'publicNews'
  news: PublicNewsEntry[]
}

export function readPublicNews(page: Page): PublicNewsPage {
  return {
    kind: 'publicNews',
    ...observation(page),

    news: selections(page.$('.row > div[id]')).map((card) => {
      const title = card.find('h5.card-title')
      requiredHtml(title, 'news title')
      return {
        id: readInteger(card.attr('id')),
        title: textContent(title),
        text: contentText(card.find('p.card-text.overflow-auto')),
        from: requiredText(card.find('small.text-muted'), 'news attribution'),
      }
    }),
  }
}

/**
 * Read news across the installation.
 *
 * 读取整个安装实例的新闻列表。
 */
export function publicNews(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicNewsPage>>> {
  return routePage(session, PUBLIC_ROUTES.news, { query: publicPageQuery(options) }, readPublicNews)
}
