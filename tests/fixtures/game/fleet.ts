export function receiptPanel(mission: string, ships: string): string {
  return `
    <div class="fleettab16">
      <div class="fleetstep1-3"><img src="x">${mission}</div>
      <div class="fleetstep1-4">Arrival<span class="fleetstep1-10">01.01.2026 12:00:00</span></div>
      <div class="fleetstep1-5">Fuel <span class="fleetstep1-10">1.234</span></div>
      <div class="fleetstep1-5">From <span class="fleetstep1-10">[1:2:3]</span></div>
      <div class="fleetstep1-6"><span class="fleetstep1-11">17.000</span> speed</div>
      <div class="fleetstep1-7">Arrival <span class="fleetstep1-11">01.01.2026 13:00:00</span></div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">42</span> distance</div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">[1:2:4]</span> destiny</div>
    </div>
    ${ships}
  `
}

export function shipRow(id: number, count: string): string {
  return `<div class="alleanza1"><img src="gebaeude/${id}.gif" class="fleettab13"><span class="fleettab15">${count}</span></div>`
}

export const emptyMissionLabel = '<span class="fleetstep1-10"></span>'

export const transportMissionLabel = '<span class="fleetstep1-10">Transport</span>'

export const destinyRow =
  '<div class="fleetstep1-9"><span class="fleetstep1-11">[1:2:4]</span> destiny</div>'

export const DRAFT_FIGURES = 'gamespeed: 4, fleetMinDuration: 5, maxspeed: 4000, fleetroom: 1000'

export const fleetStep2WithoutMissions = `
    <form action="game.php?page=fleetStep3" method="post">
      <input type="hidden" name="token" value="tok-2">
    </form>
    <script>data = {fleetroom: 1000, consumption: 25};</script>
  `

export const fleetStep1WithTruncatedColonyTarget: string = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data"></div>
    <div class="fleet_my_planet_kord" onclick="setTarget(1,2,4);updateVars();"></div>
    <script>data = {${DRAFT_FIGURES}, planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `

export const fleetStep1WithTruncatedACSTarget: string = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data"></div>
    <a href="javascript:setACSTarget(1,2,4,1);">Nova - [1:2:4]</a>
    <script>data = {${DRAFT_FIGURES}, planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `

export const fleetStep1WithDuplicateACSGroup: string = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data"></div>
    <a href="javascript:setACSTarget(1,2,4,1,7);">Nova - [1:2:4]</a>
    <a href="javascript:setACSTarget(1,2,5,1,7);">Outpost - [1:2:5]</a>
    <script>data = {${DRAFT_FIGURES}, planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `

export const fleetStep1WithTypedACSTargets: string = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data"></div>
    <a href="javascript:setACSTarget(1,2,4,2,7);">Wreck - [1:2:4]</a>
    <a href="javascript:setACSTarget(1,2,5,3,8);">Nova - [1:2:5]</a>
    <script>data = {${DRAFT_FIGURES}, planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `

export const fleetStep1WithNamelessShortcutRow: string = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data" class="clear shortcut-row">
      <div class="shortcut-colum shortcut_block shortcut-isset">
        <div class="shortcut-link" style="display: block;">
          <a href="javascript:setTarget(1,2,4,3);updateVars();">
            <span class="shortcut_link_name">Nova</span>
            <span class="shortcut_link_kord">Moon [1:2:4]</span>
          </a>
        </div>
        <div class="shortcut-edit" style="display: none;">
          <input type="text" class="shortcut-input shortcut-input-name" maxlength="32" name="shortcut[3][name]" placeholder="Nova">
          <div class="shortcut-delete" title="Delete shortcut"></div>
        </div>
        <div class="shortcut-edit" style="display: none;">
          <input type="text" class="shortcut-input shortcut-input-system" name="shortcut[3][galaxy]" value="1" size="3" maxlength="2">
          <input type="text" class="shortcut-input shortcut-input-system" name="shortcut[3][system]" value="2" size="3" maxlength="4">
          <input type="text" class="shortcut-input shortcut-input-system" name="shortcut[3][planet]" value="4" size="3" maxlength="2">
        </div>
        <div class="shortcut-edit" style="display: none;">
          <select class="shortcut-input shortcut-input-type" name="shortcut[3][type]">
            <option value="1">Planet</option>
            <option value="3" selected>Moon</option>
          </select>
        </div>
      </div>
    </div>
    <script>data = {${DRAFT_FIGURES}, planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `
