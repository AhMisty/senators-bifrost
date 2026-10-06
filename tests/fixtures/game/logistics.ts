export function row(
  id: number,
  name: string,
  coordinate: string,
  travelTime: string,
  extra: string,
): string {
  return `
    <div id="prow_${id}" class="rd_planet_row rd_planet_row_select">
      <input class="rd_checkbox" id="p${id}" name="palanets[]" value="${id}" type="checkbox">
      <div class="rd_planet_img"><img title="${name} ${coordinate}" src="planeten/small/s_x.jpg" alt=""></div>
      <div class="rd_planet_data_name">
        <span style="color:#CC6;">${name}</span><br>
        <span style="color:#CCC;">${coordinate}</span><br>
        <span style="color:#09F;">${travelTime}</span>
      </div>
      ${extra}
    </div>
  `
}

export function fleetTooltip(ships: [number, number][]): string {
  const rows = ships
    .map(
      ([id, count]) => `
      <tr>
        <td class='reducefleet_img_ship'> <img src='gebaeude/${id}.gif' alt='' /></td>
        <td class='reducefleet_name_ship'>Ship ${id}: <span class='reducefleet_count_ship'>${count}</span></td>
      </tr>`,
    )
    .join('')
  return `<table class='reducefleet_table'>${rows}</table>`
}

export function logisticsPageContent(kind: string, rows: string): string {
  return `
    <form action="game.php?page=${kind}" method="post">
      ${rows}
    </form>
    `
}

export function resourceCells(metal: string, crystal: string, deuterium: string): string {
  return `
    <div class="rd_planet_resours">
      <div class="imper_block_td"><div class="text_res tooltip"> ${metal}</div></div>
      <div class="imper_block_td"><div class="text_res tooltip"> ${crystal}</div></div>
      <div class="imper_block_td"><div class="text_res tooltip"> ${deuterium}</div></div>
    </div>
  `
}

export function fleetTooltipCell(fleetTable: string): string {
  return `<div class="rd_planet_fleets tooltip" data-tooltip-content="${fleetTable.replaceAll('"', '&quot;')}"><span>7</span></div>`
}

export const fleetCellTooltipWithoutTable =
  '<div class="rd_planet_fleets" data-tooltip-content="<span>7</span>"><span>7</span></div>'

export const emptyFleetCell = '<div class="rd_planet_fleets"><span>0</span></div>'

export function withDeliveryCost(page: string, amount: number): string {
  return page.replace('</body>', `<script>var CostOne = ${amount};</script></body>`)
}

export const deliveryCostScript = '<script>var CostOne = 30;</script></body>'

export function withCostOneMention(page: string): string {
  return page.replace('</body>', '<script>var CostOneExtra = 1; // CostOne</script></body>')
}

export const foreignPageForm = '<form action="game.php?page=overview" method="post"></form>'
