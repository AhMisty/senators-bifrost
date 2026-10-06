import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { LevelShopItem, ShopCatalogue, UnitShopItem } from '../../protocol/direct-purchases.ts'
import { buyElement, readLevelShop, readUnitShop } from '../../protocol/direct-purchases.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { PageRoute } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetObservation, PlanetReference } from '../../types.ts'

export type DirectShop = 'buyBuild' | 'buyTech' | 'buyFleet' | 'buyDefense'

type ItemOf<K extends DirectShop> = K extends 'buyBuild' | 'buyTech' ? LevelShopItem : UnitShopItem

/**
 * Direct-purchase catalogue using the same unit or level quote shape as its rendered shop.
 *
 * 直接购买目录，按商店实际类型提供单位或等级报价。
 */
export type ShopPage<K extends DirectShop> = {
  kind: K
} & PlanetObservation &
  ShopCatalogue<ItemOf<K>>

export type BuyBuildPage = ShopPage<'buyBuild'>
export type BuyTechPage = ShopPage<'buyTech'>
export type BuyFleetPage = ShopPage<'buyFleet'>
export type BuyDefensePage = ShopPage<'buyDefense'>

export type ShopReader<K extends DirectShop> = (
  session: Session,
  options: PlanetReference,
) => Promise<Observed<PlanetData<PageReply<ShopPage<K>>>>>

export type ShopAction = (
  session: Session,
  options: PlanetReference & { elementId: number; amount: number },
) => Promise<Observed<PlanetData<Ack>>>

function shopPage<K extends DirectShop>(
  page: Page,
  kind: K,
  catalogue: ShopCatalogue<ItemOf<K>>,
): ShopPage<K> {
  return { kind, ...planetObservation(page), ...catalogue }
}

function shopReader<K extends DirectShop>(
  route: PageRoute,
  read: (page: Page) => ShopPage<K>,
): ShopReader<K> {
  return (session, options) => routePage(session, route, { planetId: options.planetId }, read)
}

function shopAction(route: PageRoute): ShopAction {
  return (session, options) => buyElement(session, route, options)
}

export function readBuyBuild(page: Page): BuyBuildPage {
  return shopPage(page, 'buyBuild', readLevelShop(page))
}

export const buyBuild: ShopReader<'buyBuild'> = shopReader(GAME_ROUTES.buyBuild, readBuyBuild)

export const buyBuildSend: ShopAction = shopAction(GAME_ROUTES.buyBuildSend)

export function readBuyTech(page: Page): BuyTechPage {
  return shopPage(page, 'buyTech', readLevelShop(page))
}

export const buyTech: ShopReader<'buyTech'> = shopReader(GAME_ROUTES.buyTech, readBuyTech)

export const buyTechSend: ShopAction = shopAction(GAME_ROUTES.buyTechSend)

export function readBuyFleet(page: Page): BuyFleetPage {
  return shopPage(page, 'buyFleet', readUnitShop(page))
}

export const buyFleet: ShopReader<'buyFleet'> = shopReader(GAME_ROUTES.buyFleet, readBuyFleet)

export const buyFleetSend: ShopAction = shopAction(GAME_ROUTES.buyFleetSend)

export function readBuyDefense(page: Page): BuyDefensePage {
  return shopPage(page, 'buyDefense', readUnitShop(page))
}

export const buyDefense: ShopReader<'buyDefense'> = shopReader(
  GAME_ROUTES.buyDefense,
  readBuyDefense,
)

export const buyDefenseSend: ShopAction = shopAction(GAME_ROUTES.buyDefenseSend)
