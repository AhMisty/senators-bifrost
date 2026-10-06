import type { PageReply } from '../../protocol/ack.ts'
import { linkUrl, responseUrl, selections } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type PublicScreenshot = {
  /**
   * Full-size screenshot URL.
   *
   * 完整截图地址。
   */
  image: URL

  /**
   * Preview URL; the full-size screenshot when no thumbnail exists.
   *
   * 预览图地址；没有缩略图时为完整截图。
   */
  thumbnail: URL
}

export type PublicScreensPage = Observation & {
  kind: 'publicScreens'
  screenshots: PublicScreenshot[]
}

export function readPublicScreens(page: Page): PublicScreensPage {
  return {
    kind: 'publicScreens',
    ...observation(page),
    screenshots: selections(page.$('.card-body a.gallery')).map((tile) => ({
      image: linkUrl(page, tile),
      thumbnail: responseUrl(tile.find('img').attr('src'), page.url),
    })),
  }
}

/**
 * Read all images exposed by the server screenshot directory.
 *
 * 读取服务端截图目录公开的全部图片。
 */
export function publicScreens(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicScreensPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.screens,
    { query: publicPageQuery(options) },
    readPublicScreens,
  )
}
