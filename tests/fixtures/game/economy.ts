export function labelRow(id: number, level: string): string {
  return (
    `<div class="rexx2 rexx3"><a href="#"><img src="gebaeude/${id}.gif">Element ` +
    `${id}<span class="rexx4">${level}</span></a></div>`
  )
}

export function labelColumn(): string {
  return (
    '<div class="rexx1">' +
    '<div class="rexx2 rexx3">Basic income</div>' +
    labelRow(1, '5') +
    labelRow(2, '3') +
    '<div class="rexx2 rexx3">Bonus</div>' +
    '<div class="rexx2 rexx3">Capacity</div>' +
    '<div class="rexx2 rexx3">Total</div>' +
    '<div class="rexx2 rexx3">Daily</div>' +
    '<div class="rexx2 rexx3">Weekly</div>' +
    '</div>'
  )
}

export function resourceColumn(id: number, values: string[], kind: 'stock' | 'supply'): string {
  const last = kind === 'supply' ? '-' : values[4]
  const cells = [values[0], values[1], values[2], values[3], last, values[5], values[6], values[7]]
  return (
    `<div class="rexx1 rexx${id}">` +
    cells.map((value) => `<div class="rexx2">${value}</div>`).join('') +
    '</div>'
  )
}

export function productionForm(): string {
  return (
    '<form action="?page=resources" method="post">' +
    '<input type="hidden" name="mode" value="send">' +
    '<div class="rexx1 rexxprocent">' +
    '<select class="rexx5"><option value="1" selected="selected">100%</option></select>' +
    '<select class="rexx5" name="prod[1]"><option value="10" selected="selected">100%</option>' +
    '<option value="9">90%</option></select>' +
    '<select class="rexx5" name="prod[2]"><option value="0" selected="selected">0%</option>' +
    '<option value="1">10%</option></select>' +
    '</div></form>'
  )
}

export function resourcesPageContent(): string {
  return (
    productionForm() +
    labelColumn() +
    resourceColumn(
      901,
      ['30', '600', '300', '10', '100.000', '910', '21.840', '152.880'],
      'stock',
    ) +
    resourceColumn(902, ['20', '300', '150', '5', '100.000', '455', '10.920', '76.440'], 'stock') +
    resourceColumn(903, ['5', '60', '30', '1', '50.000', '91', '2.184', '15.288'], 'stock') +
    resourceColumn(911, ['0', '400', '100', '0', '-', '500', '12.000', '84.000'], 'supply')
  )
}

export const strayResourceCell = '<div class="rexx2">stray</div>'

export function straySupplyColumn(): string {
  return `<div class="rexx1 rexx911">${strayResourceCell.repeat(9)}</div>`
}

export function stockNode(name: string, real: string): string {
  return `<div class="stock_text"><span id="current_${name}" data-real="${real}">${real}</span></div>`
}

export function technologyRow(id: number, name: string, requirements: string): string {
  return (
    '<div class="record_rows">' +
    `<div class="record_img_utits"><a href="#" onclick="return Dialog.info(${id})">` +
    `<img alt="" src="dpath/gebaeude/${id}.gif"></a></div>` +
    `<div class="record_name_utits"><a href="#" onclick="return Dialog.info(${id})">${name}</a></div>` +
    `<div class="required_blocks">${requirements}</div>` +
    '</div>'
  )
}

export function requirementBlock(
  id: number,
  name: string,
  level: string,
  colour: 'lime' | 'red',
): string {
  return (
    '<div class="required_block required_smal_text" style="top: 1px;">' +
    `<a href="#" onclick="return Dialog.info(${id})" class="tooltip" ` +
    `data-tooltip-content="<span style='color:${colour};'>${name}</span>">` +
    `<img src="dpath/gebaeude/${id}.gif" alt="${name}" />` +
    `<div class="text" style="color:${colour};">${level}</div></a></div>`
  )
}

export const techTreePageContent: string =
  '<div class="gray_stripe">' +
  '<div style="float:left">Technology:</div>' +
  '<span class="record_btn ico_star record_btn_active" title="All" onclick="allopen();"></span>' +
  '<span class="record_btn ico_builds" title="Buildings" onclick="buildsopen();"></span>' +
  '<span class="record_btn ico_tech" title="Research" onclick="techopen();"></span>' +
  '</div>' +
  '<div class="u0">' +
  '<div class="record_header">Buildings<div class="record_header_top_line"></div>' +
  '<div class="record_header_bottom_line"></div>' +
  '<div style="color:#999; font-weight:lighter; float:right; width:53%;">Requirements</div></div>' +
  technologyRow(1, 'Metal Mine', '') +
  '</div>' +
  '<div class="u100">' +
  '<div class="record_header">Research<div class="record_header_top_line"></div>' +
  '<div class="record_header_bottom_line"></div>' +
  '<div style="color:#999; font-weight:lighter; float:right; width:53%;">Requirements</div></div>' +
  technologyRow(
    115,
    'Combustion Engine',
    requirementBlock(113, 'Energy Technology', '3', 'lime') +
      requirementBlock(111, 'Laser Technology', '5', 'red') +
      requirementBlock(112, 'Ion Technology', '2', 'red'),
  ) +
  '</div>'

export function withoutCategoryWrapper(page: string): string {
  return page.replace('<div class="u0">', '<div>')
}

export function informationPageContent(
  elementId: number,
  name: string,
  description: string,
  parts: string,
): string {
  return (
    `<div class="gray_stripo"><span class="academy_info_text_h">${name}</span></div>` +
    '<div class="info_elements">' +
    '<div class="content_box ">' +
    `<div class="image"><img src="dpath/gebaeude/${elementId}.gif" alt=""></div>` +
    `<div class="prices info_description"><p class="info15">${description}</p></div>` +
    '</div>' +
    '<div class="clear"></div>' +
    parts +
    '<div class="clear"></div>' +
    '</div>'
  )
}

export function tableRow(level: string, cells: string): string {
  return `<tr><td><span>${level}</span></td>${cells}</tr>`
}

export function tableCell(text: string, colour: string): string {
  return `<td><span style="color:${colour}">${text}</span></td>`
}

export function productionTable(): string {
  const green = (text: string) => tableCell(text, '#08c708')
  return (
    '<table class="tablesorter ally_ranks tabagg"><tbody>' +
    '<tr><th class="gray_stripo info1" colspan="1"></th>' +
    '<th class="gray_stripo info1 colore901" colspan="2">' +
    '<img src="dpath/img/resources/901f.png">Metal</th>' +
    '<th class="gray_stripo info1 colore902" colspan="2">' +
    '<img src="dpath/img/resources/902f.png">Crystal</th></tr>' +
    '<tr><th class="gray_stripo info1">Level</th>' +
    '<th class="gray_stripo info1">Production per hour</th>' +
    '<th class="gray_stripo info1">Difference</th>' +
    '<th class="gray_stripo info1">Production per hour</th>' +
    '<th class="gray_stripo info1">Difference</th></tr>' +
    tableRow('3', green('1.020') + tableCell('0', '#ccc') + green('510') + tableCell('0', '#ccc')) +
    tableRow('4', green('1.080') + green('60') + green('540') + green('30')) +
    '</tbody></table>'
  )
}

export function attributeCard(icon: string, title: string, text: string): string {
  return (
    '<div class="col-6"><div class="card m-1 background-border-black-blue shadow">' +
    '<div class="card-body">' +
    `<div class="card-img-left opacity-70" style="background:url(dpath/img/information/${icon})"></div>` +
    `<p class="card-title text-align-right">${title}</p>` +
    `<p class="card-text text-align-right gradient-gray">${text}</p>` +
    '</div></div></div>'
  )
}

export function rapidfireCard(id: number, name: string, shots: string, colour: string): string {
  return (
    '<div class="col-2"><div class="card background-border-black-blue m-1">' +
    `<span class="card-img-text ${colour} opacity-70 tooltip" data-tooltip-content="Number">${shots}</span>` +
    `<img src="dpath/gebaeude/${id}.gif" alt="${name}" class="opacity-70 tooltip" ` +
    `data-tooltip-content="${name}">` +
    '</div></div>'
  )
}

export function rapidfireSide(title: string, cards: string): string {
  return (
    '<div class="col-6"><div class="card m-1 background-border-black-blue shadow">' +
    '<div class="card-body">' +
    `<p class="card-title text-align-right">${title}</p>` +
    `<div class="row">${cards}</div>` +
    '</div></div></div>'
  )
}

export function rapidfireRow(against: string, from: string): string {
  return (
    '<div class="row background-border-black-gray m-1">' +
    rapidfireSide('Rapidfire against', against) +
    rapidfireSide('Rapidfire from', from) +
    '</div>'
  )
}

export const shipInfo: string =
  '<div class="row background-border-black-gray m-1">' +
  attributeCard('d_light.png', 'Hull', '400') +
  attributeCard('s_light.png', 'Shield', '10') +
  '</div>' +
  '<div class="row background-border-black-gray m-1">' +
  attributeCard('comb.png', 'Engine', '12.500') +
  attributeCard('consumption.png', 'Consumption', '20') +
  attributeCard('capacity.png', 'Capacity', '5.000') +
  '</div>' +
  rapidfireRow(
    rapidfireCard(215, 'Battle Cruiser', '10', 'background-color-blue') +
      rapidfireCard(217, 'Battle Transporter', '5', 'background-color-blue'),
    rapidfireCard(226, 'Destroyer', '5', 'background-color-red'),
  )

export const shipInfoWithoutIcons: string =
  '<div class="row background-border-black-gray m-1">' +
  attributeCard('', 'Hull', '400') +
  '<div class="col-6"><div class="card m-1 background-border-black-blue shadow">' +
  '<div class="card-body">' +
  '<p class="card-title text-align-right">Shield</p>' +
  '<p class="card-text text-align-right gradient-gray">10</p>' +
  '</div></div></div>' +
  '</div>'

export function storageCellPair(storage: string, difference: string): string {
  return tableCell(storage, 'lime') + tableCell(difference, difference === '0' ? 'white' : 'lime')
}

export function storageTable(): string {
  return (
    '<table style="width:100%;"><tbody><tr><td colspan="2"><table><tbody>' +
    '<tr><th>Level</th>' +
    '<th colspan="2">Metal</th><th colspan="2">Crystal</th><th colspan="2">Deuterium</th></tr>' +
    '<tr><th>&nbsp;</th>' +
    '<th>Storage</th><th>Difference</th><th>Storage</th><th>Difference</th>' +
    '<th>Storage</th><th>Difference</th></tr>' +
    tableRow(
      '2',
      storageCellPair('100.000', '0') +
        storageCellPair('100.000', '0') +
        storageCellPair('50.000', '0'),
    ) +
    tableRow(
      '3',
      storageCellPair('200.000', '100.000') +
        storageCellPair('200.000', '100.000') +
        storageCellPair('100.000', '50.000'),
    ) +
    '</tbody></table></td></tr></tbody></table>'
  )
}

export function traderColumn(id: number, name: string, purchasable: boolean): string {
  const image = `<img src="dpath/img/resources/${id}f.png" title="${name}" border="0" height="50" width="50">`
  if (!purchasable) return `<div class="trader_col">${image}<br>${name}</div>`
  return (
    '<div class="trader_col">' +
    '<form action="game.php?page=trader" method="post">' +
    '<input type="hidden" name="mode" value="trade">' +
    `<input type="hidden" name="resource" value="${id}">` +
    `<input type="image" id="trader_${id}" src="dpath/img/resources/${id}f.png" title="${name}" ` +
    'border="0" height="50" width="50"><br>' +
    `<label for="trader_${id}">${name}</label>` +
    '</form></div>'
  )
}

export function traderPageContent(columns: string, fee: boolean): string {
  return (
    '<div class="gray_stripe" style="padding-right: 0;">Call a trader who purchases</div>' +
    '<table class="tablesorter ally_ranks"><tr><td>' +
    '<div>Call a merchant who purchases</div>' +
    `<div id="trader" style="width:335px">${columns}</div>` +
    '<div style="padding-bottom:10px;">' +
    '<p>The exchange rate is: 4/2/1</p>' +
    '<div class="clear"></div></div>' +
    '</td></tr></table>' +
    (fee
      ? '<div style="padding-bottom:10px;">' +
        '<p>The value of the merchant is 750 Dark Matter!</p></div>'
      : '')
  )
}

export function unnamedTraderColumn(id: number): string {
  return (
    '<div class="trader_col">' +
    `<img src="dpath/img/resources/${id}f.png" border="0" height="50" width="50">` +
    '</div>'
  )
}

export function tradeRow(id: number, name: string, rate: string): string {
  return (
    '<tr><td style="text-align:right;">' +
    `<label for="resource${id}">${name}</label></td>` +
    '<td class="tr_table_td_img">' +
    `<label for="resource${id}"><img src="dpath/img/resources/${id}f.png"></label></td>` +
    `<td>+ <input name="trade[${id}]" id="resource${id}" class="trade_input" value="0" ` +
    `size="30" type="text" data-resource="${id}"></td>` +
    `<td>${rate}</td></tr>`
  )
}

export function tradePageContent(charge: string): string {
  return (
    '<div class="gray_stripe">Sell <span style="color:#09F;">Metal</span></div>' +
    '<form id="trader" action="" method="post">' +
    '<input type="hidden" name="mode" value="send">' +
    '<input type="hidden" name="resource" value="901">' +
    '<table class="tablesorter ally_ranks"><tbody>' +
    '<tr><td style="text-align:right;">Metal</td>' +
    '<td class="tr_table_td_img">' +
    '<img alt="Metal" title="Metal" src="dpath/img/resources/901f.png"></td>' +
    '<td colspan="2"><span style="color:#F63;" id="ress">0</span></td></tr>' +
    tradeRow(902, 'Crystal', '2') +
    tradeRow(903, 'Deuterium', '4') +
    '</tbody></table>' +
    '<div class="build_band ticket_bottom_band" style="padding-left:20px;">' +
    '<input class="bottom_band_submit" value="Exchange" type="submit"></div>' +
    '</form>' +
    `<script type="text/javascript">var charge = ${charge};</script>`
  )
}

export function withoutSourceResourceName(page: string): string {
  return page.replace(
    '<td style="text-align:right;">Metal</td>',
    '<td style="text-align:right;"></td>',
  )
}

export function shipButtons(ids: number[]): string {
  return ids
    .map(
      (id) => `<img class="buy_res" onclick="updateVars(${id})" src="dpath/gebaeude/${id}.gif" />`,
    )
    .join('')
}

export function fleetDealerPageContent(costInfo: string): string {
  return (
    '<div class="gray_stripe" style="padding-right: 0;">' +
    '<span>Merchant fleets</span>' +
    '<a onclick="MaxShips();return false;" class="right_flank button">Max</a></div>' +
    '<form action="game.php?page=fleetDealer" method="post">' +
    '<input type="hidden" name="mode" value="send">' +
    '<input type="hidden" id="shipID" name="shipID" value="">' +
    '<div class="buy_content"><div class="buy_sector fleetdealer">' +
    '<div class="buy_id">' +
    '<img class="buy_img" id="img" alt="" data-src="dpath/gebaeude/" ' +
    'src="dpath/gebaeude/undefined.gif"/>' +
    '<div class="buy_img_text tooltip" data-tooltip-content="Merchant rate">30%</div>' +
    '</div>' +
    `<div class="buy_res_content">${shipButtons([202, 203])}</div>` +
    '<div class="clear"></div></div></div></form>' +
    '<script type="text/javascript">' +
    `var CostInfo = ${costInfo};\nvar Charge = 30;` +
    '</script>'
  )
}

type ShopRoute = 'buyFleet' | 'buyDefense' | 'buyBuild' | 'buyTech'

const SHOP_SHAPE: Readonly<Record<ShopRoute, { sector: string; total: string }>> = {
  buyFleet: { sector: 'buyfleet', total: 'total_price_count' },
  buyDefense: { sector: 'buydefense', total: 'total_price_count' },
  buyBuild: { sector: 'buybuild', total: 'total_price_factor' },
  buyTech: { sector: 'buytech', total: 'total_price_factor' },
}

export function shopPageContent(
  route: ShopRoute,
  currency: number,
  elements: number[],
  costInfo: string,
): string {
  const shape = SHOP_SHAPE[route]
  return (
    '<div class="gray_stripe" style="padding-right: 0;"><span>Buy</span></div>' +
    `<form action="game.php?page=${route}" method="post">` +
    '<input type="hidden" name="mode" value="send">' +
    '<input type="hidden" id="Element" name="Element" value="">' +
    `<div class="buy_content"><div class="buy_sector ${shape.sector}">` +
    '<span class="buy_cost">Cost Dark Matter: ' +
    `<span id="price" class="colore${currency}"></span></span>` +
    '<span class="buy_outcome">Total: ' +
    `<span id="${shape.total}" class="colore${currency}"></span></span>` +
    `<div class="buy_res_content">${shipButtons(elements)}</div>` +
    '<div class="clear"></div></div></div></form>' +
    `<script type="text/javascript">var CostInfo = ${costInfo};</script>`
  )
}

export function lotTooltip(items: [number, string, string][]): string {
  const rows = items
    .map(
      ([id, name, count]) =>
        `<tr><td class='reducefleet_img_ship'><img src='dpath/gebaeude/${id}.gif'></td>` +
        `<td class='reducefleet_name_ship'>${name}: ` +
        `<span class='reducefleet_count_ship'>${count}</span></td></tr>`,
    )
    .join('')
  return `<table class='reducefleet_table'>${rows}</table>`
}

export const emptyLotTooltip = "<table class='reducefleet_table'></table>"

export function marketLotRow(
  category: number,
  tooltip: string,
  time: string,
  button: string,
): string {
  return (
    '<div class="market_rows">' +
    `<div class="market_img_utits"><img alt="" src="dpath/img/content/market_${category}.png"></div>` +
    '<div class="market_name_utits">' +
    `<a href="#" data-tooltip-content="${tooltip}" class="tooltip">Offer</a>` +
    '<span class="textForBlind"> (contents)</span></div>' +
    `<div class="count_blocks"><span style="color:#FC6;float:right;">${time}</span></div>` +
    `<div class="market_button">${button}</div>` +
    '</div>'
  )
}

export const lotPurchaseLink = '<a href="?page=market&mode=sell&id=77">'
export const lotPriceButton = '<button type="button" class="button_red">20.000 Metal</button></a>'
export const lotPriceButtonWithoutLink =
  '<button type="button" class="button_red">20.000 Metal</button>'

export const lotPriceButtonWithoutPrice =
  '<button type="button" class="button_red">Buy</button></a>'
export const lotOwnLotButton = '<button type="button" class="button_red">Remove offer</button>'

export const emptyLot: string =
  '<div class="market_rows">' +
  '<div class="market_img_utits"><img alt="" src="dpath/img/content/market.png"></div>' +
  '<div class="market_name_utits"><span style="color:#6C6;">No offers!</span></div>' +
  '</div>'

export const sellForm: string =
  '<form action="?page=market&mode=add" method="post">' +
  '<div class="market_rows">' +
  '<div class="market_img_utits"><img alt="" src="dpath/gebaeude/202.gif"></div>' +
  '<div class="market_name_utits"><span style="color:#6C6;">Light Cargo</span></div>' +
  '<div class="count_blocks"><span style="color:#FC6;float:right;">1.000.000</span></div>' +
  '<div class="market_button">' +
  '<input class="input_light_blue" name="lot202" type="number" min="0" value="0"></div>' +
  '</div>' +
  '<div class="market_rows">' +
  '<div class="market_img_utits"><img alt="" src="dpath/gebaeude/922.gif"></div>' +
  '<div class="market_name_utits"><span style="color:#6C6;">Price: Antimatter</span></div>' +
  '<div class="count_blocks"><span style="color:#FC6;float:right;"></span></div>' +
  '<div class="market_total_button">' +
  '<select name="class" class="select_light_blue">' +
  '<option value="1" selected="selected">All</option>' +
  '<option value="2">Metal</option>' +
  '<option value="3">Fleet</option>' +
  '</select>' +
  '<input name="price" id="price" size="10" value="0" class="input_light_blue" type="number" min="0">' +
  '<input class="button_light_blue" type="submit" value="Continue">' +
  '</div></div></form>'

export const marketPageContent: string =
  '<div class="gray_flettab">Market<div class="gr_btn_top">' +
  '<a class="market_1 active" href="#" onclick="open_market(\'market_1\', 1)">Offers</a>' +
  '<a class="market_2" href="#" onclick="open_market(\'market_2\', 2)">Sell</a>' +
  '<a class="market_3" href="#" onclick="open_market(\'market_3\', 3)">Own offers</a>' +
  '</div></div>' +
  '<div class="fleettab9" style="margin-bottom:5px"></div>' +
  '<div id="market_1" class="markett_conteiner" style="display:block;">' +
  marketLotRow(
    3,
    lotTooltip([
      [202, 'Light Cargo', '5'],
      [203, 'Heavy Cargo', '2'],
    ]),
    '01.01.2024 12:00:00',
    '<a href="?page=market&mode=sell&id=77">' +
      '<button type="button" class="button_red">20.000 Metal</button></a>',
  ) +
  emptyLot +
  '</div>' +
  '<div id="market_2" class="markett_conteiner" style="display:none;">' +
  sellForm +
  '</div>' +
  '<div id="market_3" class="markett_conteiner" style="display:none;">' +
  marketLotRow(
    4,
    lotTooltip([[401, 'Rocket Launcher', '120']]),
    '02.01.2024 08:30:00',
    '<a href="?page=market&mode=cancel_lot&id=88">' +
      '<button type="button" class="button_dark_blue">Remove offer</button></a>',
  ) +
  marketLotRow(
    5,
    lotTooltip([[204, 'Light Fighter', '30']]),
    '03.01.2024 09:00:00',
    '<button type="button" class="button_red">Remove offer</button>',
  ) +
  emptyLot +
  '</div>'

export const marketPageMissingSections = '<div id="market_1"></div>'

export function lotInFirstSectionPage(lot: string): string {
  return (
    '<div id="market_1" class="markett_conteiner">' +
    lot +
    '</div><div id="market_3" class="markett_conteiner"></div>'
  )
}

export function lotsPage(lot: string): string {
  return (
    `<div id="market_1" class="markett_conteiner">${lot}</div>` +
    `<div id="market_3" class="markett_conteiner">${lot}</div>`
  )
}

export const emptyMarketPageContent: string =
  '<div id="market_1" class="markett_conteiner">' +
  emptyLot +
  '</div>' +
  '<div id="market_2" class="markett_conteiner">' +
  '<div class="market_rows">' +
  '<div class="market_img_utits"><img alt="" src="dpath/img/content/market.png"></div>' +
  '<div class="market_name_utits"><span style="color:#6C6;">Nothing to sell</span></div>' +
  '</div></div>' +
  '<div id="market_3" class="markett_conteiner">' +
  emptyLot +
  '</div>'

export const sellFormOnlyPageContent: string =
  `<div id="market_1" class="markett_conteiner">${emptyLot}</div>` +
  `<div id="market_2" class="markett_conteiner">${sellForm}</div>` +
  `<div id="market_3" class="markett_conteiner">${emptyLot}</div>`

export const unknownResourceMarketPage = `
      <div id="market_1"></div>
      <div id="market_2"><div class="market_rows">
        <input name="lot999" value="0">
        <div class="count_blocks">1.000</div>
      </div></div>
      <div id="market_3"></div>
      `

export const bonusClaimControl =
  '<a class="big_btn blue btn_menu btn_menu_big" href="game.php?page=bonus">Bonus</a>'

export const bonusClaimedControl =
  '<a class="big_btn blue btn_menu btn_menu_big">Available in 01:23:45</a>'

export const serverTimeControl =
  '<a class="big_btn btn_menu btn_menu_big"><div class="servertime oservertime"></div></a>'

export function overviewPageContent(bonus: string): string {
  return (
    '<div id="big_panet">' +
    '<div class="palnet_pianeta_titolo">' +
    '<span class="planetname">Homeworld</span></div>' +
    '<div class="palnet_block_info palnet_big_info">' +
    '<div class="left_part">Diameter</div>' +
    '<div class="right_part">12.800 km (<span>163</span> / <span>200</span> fields)</div>' +
    '<div class="left_part">Temperature</div>' +
    '<div class="right_part">approx. -10°C to 20°C</div>' +
    '<div class="left_part">Position</div>' +
    '<div class="right_part">' +
    '<a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></div>' +
    '</div></div>' +
    `<div id="left_menu">${bonus}</div>`
  )
}

export function containerRow(
  id: number,
  name: string,
  count: string,
  factor: string | null,
): string {
  return (
    '<div class="conteiner_rows">' +
    `<div class="conteiner_img_utits"><img alt="" src="dpath/gebaeude/${id}.gif"></div>` +
    `<div class="conteiner_name_utits"><span style="color:#6C6;">${name}</span></div>` +
    '<div class="count_blocks"><span style="color:#FC6;float:right;">' +
    `+ ${count} ${factor === null ? '' : `<span style="color:#d90036;"><b>(x${factor})</b></span>`}` +
    '</span></div></div>'
  )
}

export function containerPage(rows: string): string {
  return (
    '<div class="gray_stripe">' +
    '<div class="position tooltip" data-tooltip-content="Opened in 24 hours.">' +
    '<font color="#2db300"> 3</font>' +
    '</div></div>' +
    '<div class="ally_img"><table class="no_visible"><tr><td>' +
    '<img src="dpath/img/title/conteiner.jpg" alt="*" />' +
    '<span class="designation"><span>Сontainers (12)</span><br/></span>' +
    '</td></tr></table></div>' +
    '<div id="build_elements" class="officier_elements prem_shop">' +
    '<div class="conteiner_rows" style="margin: 0px 7px 4px 7px;">' +
    '<div class="conteiner_img_utits" style="width: 100px;height: 40px;">' +
    '<img alt="" src="dpath/img/content/open_cont.png">' +
    '</div>' +
    '<form action="game.php?page=conteiner&amp;mode=open" method="post" class="getRead">' +
    '<input class="pre_btn_buy" type="submit" value="Open"/>' +
    '<input name="conts" id="conts" type="number" min="1" max="12" value="12"/>' +
    '</form></div>' +
    rows +
    '</div>'
  )
}

export const containerContent: string = containerPage(
  containerRow(202, 'Light Cargo', '1.500', '5') + containerRow(901, 'Metal', '400.000', null),
)

export const containerPageWithoutInventory: string =
  '<div class="gray_stripe">' +
  '<div class="position tooltip" data-tooltip-content="Opened in 24 hours.">' +
  '<font color="#2db300"> 3</font></div></div>'

export const containerInventoryRow = '<div class="designation">Containers <span>(2)</span></div>'

export const containerRowWithoutAmount: string =
  '<div class="conteiner_rows">' +
  '<div class="conteiner_img_utits"><img alt="" src="dpath/gebaeude/202.gif"></div>' +
  '<div class="conteiner_name_utits"><span style="color:#6C6;">Light Cargo</span></div>' +
  '<div class="count_blocks"><span style="color:#FC6;float:right;">(x5)</span></div>' +
  '</div>'

export const containerRowWithoutIcon: string =
  '<div class="conteiner_rows">' +
  '<div class="conteiner_name_utits"><span style="color:#6C6;">Light Cargo</span></div>' +
  '<div class="count_blocks"><span style="color:#FC6;float:right;">+ 1.500</span></div>' +
  '</div>'
