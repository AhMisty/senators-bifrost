import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { GrowthModule } from '../../protocol/catalogue.ts'
import type { GrowthDocument } from '../../protocol/growth.ts'
import { readGrowth, upgradeGrowth } from '../../protocol/growth.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import type { GROWTH_MODULES } from '../../protocol/routes.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference } from '../../types.ts'

type ControlOf<K extends GrowthModule> = (typeof GROWTH_MODULES)[K]['kind']

/**
 * Choice catalogues accept only an element; other catalogues require an amount in their displayed purchase unit.
 *
 * 选择类目录只接受元素，其他目录必须提供以页面购买单位计量的数量。
 */
export type GrowthPurchaseOptions<K extends GrowthModule> = PlanetReference & {
  elementId: number
} & (ControlOf<K> extends 'choice' ? { amount?: never } : { amount: number })

export type GrowthReader<K extends GrowthModule> = (
  session: Session,
  options: PlanetReference,
) => Promise<Observed<PlanetData<PageReply<GrowthDocument<K>>>>>

export type GrowthAction<K extends GrowthModule> = (
  session: Session,
  options: GrowthPurchaseOptions<K>,
) => Promise<Observed<PlanetData<Ack>>>

function reader<K extends GrowthModule>(module: K): GrowthReader<K> {
  return (session, options) =>
    routePage(session, GAME_ROUTES[module], options, (page) => readGrowth(page, module))
}

function action<K extends GrowthModule>(module: K): GrowthAction<K> {
  return (session, options) => upgradeGrowth(session, GAME_ROUTES[module], options)
}

export const officer: GrowthReader<'officer'> = reader('officer')

export const officerUpgrade: GrowthAction<'officer'> = action('officer')

export const premium: GrowthReader<'premium'> = reader('premium')

export const premiumUpgrade: GrowthAction<'premium'> = action('premium')

export const blueprints: GrowthReader<'blueprints'> = reader('blueprints')

export const blueprintsUpgrade: GrowthAction<'blueprints'> = action('blueprints')

export const artifact: GrowthReader<'artifact'> = reader('artifact')

export const artifactUpgrade: GrowthAction<'artifact'> = action('artifact')

export const development: GrowthReader<'development'> = reader('development')

export const developmentUpgrade: GrowthAction<'development'> = action('development')

export const details: GrowthReader<'details'> = reader('details')

/**
 * New-Star raises the detail level without deducting its displayed currency cost.
 *
 * New-Star 提升零件等级时不会扣除页面显示的货币费用。
 */
export const detailsUpgrade: GrowthAction<'details'> = action('details')

export const minerals: GrowthReader<'minerals'> = reader('minerals')

export const mineralsUpgrade: GrowthAction<'minerals'> = action('minerals')

export const ancientContainerShop: GrowthReader<'ancientContainerShop'> =
  reader('ancientContainerShop')

export const ancientContainerUpgrade: GrowthAction<'ancientContainerShop'> =
  action('ancientContainerShop')

export const auction: GrowthReader<'auction'> = reader('auction')

export const auctionUpgrade: GrowthAction<'auction'> = action('auction')

export const fair: GrowthReader<'fair'> = reader('fair')

export const fairUpgrade: GrowthAction<'fair'> = action('fair')

export const band: GrowthReader<'band'> = reader('band')

export const bandUpgrade: GrowthAction<'band'> = action('band')

export const race: GrowthReader<'race'> = reader('race')

export const raceUpgrade: GrowthAction<'race'> = action('race')

export const ethics: GrowthReader<'ethics'> = reader('ethics')

export const ethicsUpgrade: GrowthAction<'ethics'> = action('ethics')

export const government: GrowthReader<'government'> = reader('government')

export const governmentUpgrade: GrowthAction<'government'> = action('government')

export const party: GrowthReader<'party'> = reader('party')

/**
 * Buy party time; New-Star refuses while another party remains active.
 *
 * 购买政党生效时间；已有政党仍生效时 New-Star 会拒绝。
 */
export const partyUpgrade: GrowthAction<'party'> = action('party')

export const ideologies: GrowthReader<'ideologies'> = reader('ideologies')

export const ideologiesUpgrade: GrowthAction<'ideologies'> = action('ideologies')
