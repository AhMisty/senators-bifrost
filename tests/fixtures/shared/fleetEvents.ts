export const ELEMENT_ICON = (id: number): string =>
  `<img src='styles/theme/nsc/gebaeude/${id}.gif'>`
export const RESOURCE_ICON = (id: number): string =>
  `<img src='styles/theme/nsc/img/resources/${id}f.png'>`

export function shipTableRow(icon: string, name: string, count: string): string {
  return `<tr><td class='reducefleet_img_ship'>${icon}</td><td class='reducefleet_name_ship'>${name}: <span class='reducefleet_count_ship'>${count}</span></td></tr>`
}

export function resourceTableRow(icon: string, name: string, count: string): string {
  return `<tr><td class='reducefleet_img_res'>${icon}</td><td class='reducefleet_name_ship'>${name} <span class='reducefleet_count_ship'>${count}</span></td></tr>`
}

export function tooltipAnchor(label: string, inner: string): string {
  return `<a href="#" data-tooltip-content="<table class='reducefleet_table'>${inner}</table>" class="tooltip">${label}</a>`
}

export function eventWithStates(states: string, timer: string = '00:05:00'): string {
  return `
    <div class="fleet_time">
      <div id="fleettime_0" class="fleets" data-fleet-end-time="1767225600" data-fleet-time="300">${timer}</div>
    </div>
    <div class="fleet_text">${states}<div class="clear"></div></div>
  `
}

export function stateSpan(classes: string, body: string): string {
  return `<span class="${classes}">${body}</span>`
}

export const eventWithMissionLabel: string = eventWithStates(
  stateSpan(
    'flight attack',
    [
      `One of your Fleets from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a>`,
      `reached the Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4">[1:2:4]</a>.`,
      'Mission:',
      tooltipAnchor('Attack', resourceTableRow(RESOURCE_ICON(901), 'Metal', '1.000')),
    ].join(' '),
  ),
)

export const eventWithUnreadableWording: string = eventWithStates(
  stateSpan(
    'flight espionage',
    `Spying on ${tooltipAnchor('', resourceTableRow(RESOURCE_ICON(901), 'Metal', '5'))} ` +
      'from <a href="game.php?page=galaxy">the galaxy map</a>. Mission: Espionage',
  ),
)

export const eventWithoutMissionClass: string = eventWithStates(
  stateSpan(
    'flight',
    'One of your Fleets from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a> reached the Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4">[1:2:4]</a>. Mission: Deploy',
  ),
)

export const eventWithoutAddress: string = eventWithStates(stateSpan('flight deploy', 'Deploying.'))

export const eventWithUnitTooltip: string = eventWithStates(
  stateSpan(
    'flight owndeploy',
    `One of your ${tooltipAnchor(
      'Fleets',
      shipTableRow(ELEMENT_ICON(202), 'Small Cargo', '10') +
        shipTableRow(ELEMENT_ICON(210), 'Recycler', '2'),
    )} from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a> to Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4">[1:2:4]</a>. Mission: Deploy`,
  ),
)

export const eventWithEmptyUnitTooltip: string = eventWithStates(
  stateSpan(
    'flight attack',
    `One of your ${tooltipAnchor('Fleets', '<tr></tr>')} from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a>. Mission: Attack`,
  ),
)

export const eventWithAmbiguousUnitTooltips: string = eventWithStates(
  stateSpan(
    'flight attack',
    `${tooltipAnchor('Fleets', shipTableRow(ELEMENT_ICON(202), 'Small Cargo', '10'))} and ` +
      `${tooltipAnchor('Ships', shipTableRow(ELEMENT_ICON(203), 'Large Cargo', '4'))} attack.`,
  ),
)

export const eventWithAmbiguousCargoTooltips: string = eventWithStates(
  stateSpan(
    'holding ownhold',
    `Transfer ${tooltipAnchor('Attack', resourceTableRow(RESOURCE_ICON(901), 'Metal', '1.000'))} ` +
      `${tooltipAnchor('Return', resourceTableRow(RESOURCE_ICON(902), 'Crystal', '500'))} Mission:`,
  ),
)

export const eventWithForeignCargoRow: string = eventWithStates(
  stateSpan(
    'holding transport',
    `Transport ${tooltipAnchor(
      'Transfer',
      `<tr><td>Total:</td></tr>` + resourceTableRow(RESOURCE_ICON(901), 'Metal', '2.000'),
    )} Mission:`,
  ),
)

export const eventWithTwoStates: string = eventWithStates(
  stateSpan(
    'flight attack',
    'One of your Fleets <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a> attacks.',
  ) +
    stateSpan(
      'return owndeploy',
      'Another returns to <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4">[1:2:4]</a>.',
    ),
)

/**
 * Missile events use mission 10, which is not a fleet dispatch mission.
 *
 * 导弹事件使用任务 10，该编号不属于舰队派遣任务。
 */
export const eventWithMissileState: string = eventWithStates(
  stateSpan(
    'flight ownmissile',
    'Your missiles heading for <a href="game.php?page=galaxy&amp;galaxy=2&amp;system=3">[2:3:4]</a>.',
  ),
)

export const twoEvents: string = [
  eventWithStates(
    stateSpan(
      'flight attack',
      'First <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a>. Mission: Attack',
    ),
    '00:01:00',
  ),
  eventWithStates(
    stateSpan(
      'holding ownhold',
      'Second <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4">[1:2:4]</a>. Mission: Hold',
    ),
    '00:02:00',
  ),
].join('<div class="separator"></div>')

export const fleetSlotLine = `
    <div class="gray_flettab">
      <div class="transparent">Fleets 2 / 5
        <div class="transparent"><span>0 / 1 Expeditions</span></div>
      </div>
    </div>
  `

export const fleetSlotLineWithoutExpeditions = `
    <div class="gray_flettab">
      <div class="transparent">Fleets 2 / 5</div>
    </div>
  `

export const fleetSlotLineWithoutCounts = `
    <div class="gray_flettab">
      <div class="transparent">Fleets</div>
    </div>
  `

export const countHiddenUnitTooltip = `<table class='reducefleet_table'><tr><td>Approaching ships:</td></tr><tr><td class='reducefleet_name_ship'>Small Cargo</td></tr><tr><td class='reducefleet_name_ship'>Recycler</td></tr></table>`
