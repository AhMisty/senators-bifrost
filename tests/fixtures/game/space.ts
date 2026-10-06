export const fleetStep1PreviewBody = `
    <div id="shortcut-data"><div class="shortcut_block"></div></div>
    <form action="game.php?page=fleetStep2" method="post" id="form">
      <input type="hidden" name="token" value="tok-1">
      <input type="hidden" name="fleet_group" value="0">
      <select name="speed"><option value="10" selected="selected">100%</option><option value="5">50%</option></select>
      <select name="type">
        <option value="1" selected="selected">Planet</option>
        <option value="3" disabled="disabled">Moon</option>
        <option value="2">Debris</option>
      </select>
    </form>
    <a href="javascript:setACSTarget(1, 2, 4, 1, 9)">group</a>
    <script>
      data = {
        gamespeed: 4,
        fleetMinDuration: 5,
        maxspeed: 4000,
        fleetroom: 1000,
        planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1},
        ships: {"202": {amount: 5, speed: 5000, consumption: 20}, "203": {amount: "2", speed: 4000, consumption: 50}}
      };
    </script>
  `

export const fleetStep1ShortcutsBody = `
    <div id="shortcut-data">
      <div class="shortcut-isset">
        <input type="text" name="shortcut[7][name]" value="Home">
        <input type="hidden" name="shortcut[7][galaxy]" value="1">
        <input type="hidden" name="shortcut[7][system]" value="2">
        <input type="hidden" name="shortcut[7][planet]" value="3">
        <select name="shortcut[7][type]">
          <option value="1" selected="selected">Planet</option>
          <option value="3">Moon</option>
        </select>
      </div>
    </div>
    <div class="fleet_my_planet_kord shortcut-edit" onclick="AddShortcuts();return false"><span>+</span></div>
    <div class="gray_ship1"><div class="gray_ship3">My planets</div></div>
    <div class="fleet_my_planet_kord" onclick="setTarget(1,2,3,1);updateVars();">
      <span class="fleet_my_planet_kord_kord">[1:2:3]</span>
      <span class="fleet_my_planet_kord_name">Homeworld</span>
    </div>
    <div class="fleet_my_planet_kord" onclick="setTarget(1,2,4,3);updateVars();">
      <span class="fleet_my_planet_kord_kord">[1:2:4]</span>
      <span class="fleet_my_planet_kord_name">Nova Moon</span>
    </div>
    <form action="game.php?page=fleetStep2" method="post">
      <input type="hidden" name="token" value="tok-1">
      <select name="speed"><option value="10" selected="selected">100%</option></select>
      <select name="type"><option value="1" selected="selected">Planet</option></select>
    </form>
    <script>var database = 1; data = {planet: {galaxy: 1, system: 2, planet: 3, planet_type: 1}, ships: {}};</script>
  `

export const fleetStep2Body = `
    <form action="game.php?page=fleetStep3" method="post">
      <input type="hidden" name="token" value="tok-2">
      <input type="radio" id="radio_1" name="mission" value="1" checked="checked">
      <label for="radio_1">Attack</label>
      <input type="radio" id="radio_3" name="mission" value="3">
      <label for="radio_3">Transport</label>
      <select name="staytime"><option value="1" selected="selected">1</option><option value="2">2</option></select>
      <select name="sectors"><option value="3" selected="selected">3</option></select>
    </form>
    <script>data = {fleetroom: 1000, consumption: 25};</script>
  `

export const fleetStep2ChangedTokenBody = `
    <form action="game.php?page=fleetStep3" method="post">
      <input type="hidden" name="token" value="tok-3">
      <input type="radio" id="radio_1" name="mission" value="1" checked="checked">
      <label for="radio_1">Attack</label>
    </form>
    <script>data = {fleetroom: 1, consumption: 1};</script>
  `

export const fleetStep3DispatchReceiptBody = `
    <div class="gray_stripo">Fleet sent</div>
    <div class="fleettab16">
      <div class="fleetstep1-3"><img src="x">Mission <span class="fleetstep1-10">Transport</span></div>
      <div class="fleetstep1-4">Arrival<span class="fleetstep1-10">01.01.2026 12:00:00</span></div>
      <div class="fleetstep1-5">Fuel <span class="fleetstep1-10">1.234</span></div>
      <div class="fleetstep1-5">From <span class="fleetstep1-10">[1:2:3]</span></div>
      <div class="fleetstep1-6"><span class="fleetstep1-11">17.000</span> speed</div>
      <div class="fleetstep1-7">Arrival <span class="fleetstep1-11">01.01.2026 13:00:00</span></div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">42</span> distance</div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">[1:2:4]</span> destiny</div>
    </div>
    <div class="alleanza1"><img src="gebaeude/202.gif" class="fleettab13"><span class="fleettab14">Small Cargo</span><span class="fleettab15">10</span></div>
    <div class="alleanza1"><img src="gebaeude/210.gif" class="fleettab13"><span class="fleettab14">Recycler</span><span class="fleettab15">2</span></div>
  `

export const fleetTableBody = `
    <form action="?page=fleetStep1" method="post" name="glav"></form>
    <div class="gray_flettab">
      <div class="transparent">Fleets 2 / 5
        <div class="transparent"><span>0 / 1 Expeditions</span></div>
      </div>
    </div>
    <div class="fl_groop_link_name" onclick="GroopShips(0);">Raid</div>
    <table class="tablesorter ally_ranks">
      <tr><td>No.</td><td>Mission</td><td>Amount</td><td>From</td><td>Departure</td><td>To</td><td>Objective</td><td>Arrival</td><td>Order</td></tr>
      <tr>
        <td>1</td>
        <td>Transport<br><a title="On the way">A</a></td>
        <td><a class="tooltip" data-tooltip-content="<table class='reducefleet_table'><tr><td style='width:100%'>Approaching ships:</td></tr><tr><td class='reducefleet_img_ship'><img src='gebaeude/202.gif'></td><td class='reducefleet_name_ship'>Small Cargo: <span class='reducefleet_count_ship'>10</span></td></tr></table>">10</a></td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></td>
        <td>01.01.2026 12:00:00</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:4]</a></td>
        <td>01.01.2026 13:00:00</td>
        <td style="color:lime">0:59:59</td>
        <td>
          <form action="game.php?page=fleetTable&amp;action=sendfleetback" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="Send back" type="submit">
          </form>
          <form action="game.php?page=fleetTable&amp;action=acs" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="ACS" type="submit">
          </form>
        </td>
      </tr>
      <tr>
        <td>2</td>
        <td>Deploy<br><a title="Returning">R</a></td>
        <td>5</td>
        <td>[1:2:3]</td>
        <td>01.01.2026 10:00:00</td>
        <td>[1:2:5]</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    </table>
    <div class="build_box flethan">
      <div class="hang3"><span>Small Cargo</span></div>
      <div class="content_box" style="padding-right: 3px;">
        <div class="image hang2 tooltip"><a href="#"><img src="gebaeude/202.gif" alt="202"></a></div>
        <div class="hang4" id="ship202_value">10</div>
        <div class="fl_fllets_rows_input_div hang1">
          <div onclick="maxShip('ship202');" class="maximhang">Max</div>
          <div onclick="minShip('ship202');" class="minimhang">Min</div>
          <input class="countdots inputhang" name="ship202" id="ship202_input" value="0">
        </div>
      </div>
      <div class="clear"></div>
    </div>
    <script>fleetGroopShip = [{"202": 5, "203": 2}];</script>
  `

export const overviewBody = `
    <div id="big_panet">
      <div class="planetname">Homeworld</div>
      <div class="palnet_big_info">
        <div class="right_part">8.660 <span>10</span><span>163</span></div>
        <div class="right_part">-20 to 40</div>
        <div class="right_part">[1:2:3]</div>
        <div class="right_part">Rank 7 of 100</div>
      </div>
    </div>
    <a href="game.php?page=race"><div class="overvieew15 overvire tooltip" style="background: rgba(0, 0, 0, 0.25) url(gebaeude/1501.gif) no-repeat center;"></div></a>
    <a href="game.php?page=ethics"><div class="overvieew15 overvire tooltip" style="background: rgba(0, 0, 0, 0.25) url(gebaeude/1600.png) no-repeat center;"></div></a>
    <a href="game.php?page=formgovernment"><div class="overvieew15 overvire tooltip" style="background: rgba(0, 0, 0, 0.25) url(gebaeude/1700.png) no-repeat center;"></div></a>
    <div class="costruzioni"><div class="overvieew9">Research Lab <span class="timer" data-time="120"></span></div></div>
    <div class="ricerche"><div class="overvieew9">Espionage Technology</div></div>
    <div id="online_user"><span>12</span></div>
    <div id="content"><div class="col-12"><div class="card"><div class="card-body"><div class="card-text">News of the day</div></div></div></div></div>
  `

export const galaxyFormOnlyBody =
  '<form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>'

export function phalanxPage(log: string): string {
  return `
    <div class="gray_stripe">Investigate position [1:2:4] (Nova)</div>
    <div class="fleet_log">${log}</div>
  `
}

export function shipTooltip(name: string): string {
  return `<a data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_ship'><img src='styles/theme/nsc/gebaeude/202.gif'></td><td class='reducefleet_name_ship'>${name}</td></tr></table>">${name}</a>`
}

export function cargoTooltip(id: number): string {
  return `<a data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_res'><img src='styles/theme/nsc/img/resources/${id}f.png'></td><td class='reducefleet_name_ship'><span class='reducefleet_count_ship'>1</span></td></tr></table>">Attack</a>`
}

export const phalanxEventLog = `
      <div class="separator"></div>
      <div class="fleet_time">
        <div id="v" class="fleets" data-fleet-end-time="1767225600" data-fleet-time="300">-</div>
      </div>
      <div class="fleet_text">
        <span class="flight ownattack">One of your <a href="#" data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_ship'><img src='styles/theme/nsc/gebaeude/202.gif'></td><td class='reducefleet_name_ship'>Small Cargo: <span class='reducefleet_count_ship'>10</span></td></tr><tr><td class='reducefleet_img_ship'><img src='styles/theme/nsc/gebaeude/210.gif'></td><td class='reducefleet_name_ship'>Recycler: <span class='reducefleet_count_ship'>2</span></td></tr></table>" class="tooltip ownattack">Fleets</a> from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2" class="ownattack">[1:2:3]</a> reached the Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4" class="ownattack">[1:2:4]</a>. Mission: <a data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_res'><img src='styles/theme/nsc/img/resources/901f.png'></td><td class='reducefleet_name_ship'>Metal <span class='reducefleet_count_ship'>1.000</span></td></tr><tr><td class='reducefleet_img_res'><img src='styles/theme/nsc/img/resources/902f.png'></td><td class='reducefleet_name_ship'>Crystal <span class='reducefleet_count_ship'>500</span></td></tr><tr><td class='reducefleet_img_res'><img src='styles/theme/nsc/img/resources/903f.png'></td><td class='reducefleet_name_ship'>Deuterium <span class='reducefleet_count_ship'>100</span></td></tr></table>" class="tooltip ownattack">Attack</a></span>
        <div class="clear"></div>
      </div>
  `

export const phalanxEventWithoutStateLog = `
      <div class="fleet_time">
        <div id="v" class="fleets" data-fleet-end-time="1767225600" data-fleet-time="300">-</div>
      </div>
      <div class="fleet_text"><div class="clear"></div></div>
  `

export function eventWith(span: string): string {
  return `
      <div class="fleet_time">
        <div id="v" class="fleets" data-fleet-end-time="1767225600" data-fleet-time="300">-</div>
      </div>
      <div class="fleet_text"><span class="flight attack">${span}</span></div>
  `
}

export const overviewFleetLogBody = `
    <div id="big_panet"><div class="planetname">Homeworld</div></div>
    <div class="fleet_log">
      <div class="fleet_time">
        <div id="fleettime_0" class="fleets" data-fleet-end-time="1767225600" data-fleet-time="120">00:02:00</div>
        <div class="tooltip fleet_static_time" data-tooltip-content="12:34:56">12:34:56</div>
      </div>
      <div class="fleet_text">
        <span class="return owndeploy">One of your Fleets returns from Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4" class="owndeploy">[1:2:4]</a> back to Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2" class="owndeploy">[1:2:3]</a>. Mission: Deploy</span>
        <div class="clear"></div>
      </div>
      <div class="separator"></div>
      <div class="fleet_time">
        <div id="fleettime_1" class="fleets" data-fleet-end-time="1767226800" data-fleet-time="1800">00:30:00</div>
        <div class="tooltip fleet_static_time" data-tooltip-content="12:34:56">12:34:56</div>
      </div>
      <div class="fleet_text">
        <span class="holding ownhold">One of your <a href="#" data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_ship'><img src='styles/theme/nsc/gebaeude/203.gif'></td><td class='reducefleet_name_ship'>Large Cargo: <span class='reducefleet_count_ship'>1.500</span></td></tr></table>" class="tooltip ownhold">Fleets</a> from Planet Homeworld <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2" class="ownhold">[1:2:3]</a> are in orbit around Planet Nova <a href="game.php?page=galaxy&amp;galaxy=1&amp;system=4" class="ownhold">[1:2:4]</a>. Mission: <a data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_res'><img src='styles/theme/nsc/img/resources/901f.png'></td><td class='reducefleet_name_ship'>Metal <span class='reducefleet_count_ship'>2.000</span></td></tr></table>" class="tooltip ownhold">Transfer</a></span>
        <div class="clear"></div>
      </div>
      <div class="separator"></div>
    </div>
  `

export const phalanxMessageBody =
  '<div class="gray_stripe">Investigate position [1:2:4] (Nova)</div>'

export const jumpGateCooldownBody = `
    <table style="width:100%;">
      <tbody>
        <tr style="height:20px;">
          <th colspan="3" class="left">Use the jump portal: number of ships</th>
        </tr>
        <tr style="height:20px;">
          <td colspan="3">Next jump possible in: 01.01.2026 12:00:00&nbsp;(<span class="countdown" data-time="600">00:10:00</span>)</td>
        </tr>
      </tbody>
    </table>
  `

export const jumpGateReadyBody = `
    <table style="width:100%;">
      <tbody>
        <tr style="height:20px;">
          <th colspan="3" class="left">Use the jump portal: number of ships</th>
        </tr>
        <tr style="height:20px;">
          <td>Moon jump</td>
          <td colspan="2">Base [1:2:3]</td>
        </tr>
        <tr style="height:20px;">
          <td>Destination Moon jump</td>
          <td colspan="2"><select name="jmpto" class="jumpgate"><option value="1001">[1:2:4] Nova</option><option value="1002">[1:2:5] Outpost</option></select></td>
        </tr>
        <tr>
          <th>Ship type</th><th>Ships available</th><th></th>
        </tr>
        <tr>
          <td style="width:33%;">Small Cargo</td>
          <td style="width:33%;"><span id="ship202_value">10</span></td>
          <td style="width:33%;"><input class="jumpgate" name="ship[202]" id="ship202_input" size="7" value="0" type="text"><input onclick="Gate.max(202);" value="max" type="button"></td>
        </tr>
        <tr>
          <td style="width:33%;">Recycler</td>
          <td style="width:33%;"><span id="ship210_value">2</span></td>
          <td style="width:33%;"><input class="jumpgate" name="ship[210]" id="ship210_input" size="7" value="0" type="text"><input onclick="Gate.max(210);" value="max" type="button"></td>
        </tr>
        <tr>
          <td colspan="3"><input value="Jump" type="button" onclick="Gate.submit();"></td>
        </tr>
      </tbody>
    </table>
  `

export const jumpGateNoTargetBody = `
    <table style="width:100%;">
      <tbody>
        <tr style="height:20px;">
          <th colspan="3" class="left">Use the jump portal: number of ships</th>
        </tr>
        <tr style="height:20px;">
          <td>Moon jump</td>
          <td colspan="2">Base [1:2:3]</td>
        </tr>
        <tr style="height:20px;">
          <td colspan="3"><span style="color:red">No target jump available.</span></td>
        </tr>
      </tbody>
    </table>
  `

export function simulatorUnit(
  id: number,
  name: string,
  attacker: string,
  defender: string,
): string {
  return `
          <div class="rexx16">
            <a href="#" onclick="return Dialog.info(${id})"><img src="styles/theme/nsc/gebaeude/${id}.gif" alt="${name}"></a>
            <span>${name}</span>
            ${attacker}
            ${defender}
          </div>`
}

export function simulatorTab(index: number, defenses: boolean): string {
  return `
    <div id="tabs-${index}" class="ui-tabs-panel ui-widget-content ui-corner-bottom">
      <div class="rexx14" style="width: 702px;">
        <div class="rexx19"><span class="rexx21">Technologies</span><span class="rexx20">reset</span></div>
        ${simulatorUnit(
          109,
          'Weapons Technology',
          `<input type="text" size="10" value="0" name="battleinput[${index}][1][109]" class="rexx18">`,
          `<input type="text" size="10" value="0" name="battleinput[${index}][0][109]" class="rexx17">`,
        )}
        ${simulatorUnit(
          110,
          'Shielding Technology',
          `<input type="text" size="10" value="0" name="battleinput[${index}][1][110]" class="rexx18">`,
          `<input type="text" size="10" value="0" name="battleinput[${index}][0][110]" class="rexx17">`,
        )}
      </div>
      <div class="clear"></div>
      <div class="rexx15">
        <div class="rexx19"><span class="rexx21">Ships</span><span class="rexx20">reset</span></div>
        ${simulatorUnit(
          202,
          'Small Cargo',
          `<input class="fleetAttCountBS rexx18" type="text" size="10" value="0" name="battleinput[${index}][1][202]">`,
          `<input class="fleetDefCountBS rexx17" type="text" size="10" value="0" name="battleinput[${index}][0][202]">`,
        )}
        ${simulatorUnit(
          210,
          'Recycler',
          `<input class="fleetAttCountBS rexx18" type="text" size="10" value="0" name="battleinput[${index}][1][210]">`,
          `<input class="fleetDefCountBS rexx17" type="text" size="10" value="0" name="battleinput[${index}][0][210]">`,
        )}
      </div>
      ${
        defenses
          ? `<div class="rexx15">
        <div class="rexx19"><span class="rexx21">Defense</span><span class="rexx20">reset</span></div>
        ${simulatorUnit(
          401,
          'Rocket Launcher',
          `<input class="fleetDefCountBS rexx18" type="text" size="10" value="0" name="battleinput[${index}][1][401]">`,
          '',
        )}
      </div>`
          : ''
      }
      <div class="clear"></div>
    </div>`
}

export function battleSimulatorBody(): string {
  return `
    <form id="form" name="battlesim">
      <input type="hidden" name="slots" id="slots" value="3">
      <div class="gray_flettab" style="padding-right:0;">Simulator</div>
      <div class="battlesim_ress">
        <span>Steal </span>
        <input type="text" size="10" value="0" name="battleinput[0][1][901]" class="colore901 rexx24 tooltip" data-tooltip-content="Metal" style="background-image:url(styles/theme/nsc/img/resources/901f.png)">
        <input type="text" size="10" value="0" name="battleinput[0][1][902]" class="colore902 rexx24 tooltip" data-tooltip-content="Crystal" style="background-image:url(styles/theme/nsc/img/resources/902f.png)">
        <input type="text" size="10" value="0" name="battleinput[0][1][903]" class="colore903 rexx24 tooltip" data-tooltip-content="Deuterium" style="background-image:url(styles/theme/nsc/img/resources/903f.png)">
      </div>
      <div id="tabs">
        <ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">
          <li class="ui-state-default"><a href="#tabs-0">ACS slot 1</a></li>
          <li class="ui-state-default"><a href="#tabs-1">ACS slot 2</a></li>
          <input type="button" class="rexx25 tooltip" data-tooltip-content="wait" onclick="return add();" value="+">
        </ul>
        <div class="clear"></div>
        ${simulatorTab(0, true)}
        ${simulatorTab(1, false)}
      </div>
      <div class="alleanza57" style="margin-top: 5px;"></div>
    </form>
  `
}

export const battleSimulatorForeignSlotBody = `
    <div id="tabs-0" class="ui-tabs-panel ui-widget-content ui-corner-bottom">
      <div class="rexx14" style="width: 702px;">
        <div class="rexx16">
          <span>Weapons Technology</span>
          <input type="text" size="10" value="0" name="battleinput[1][0][109]" class="rexx17">
        </div>
      </div>
    </div>
  `

export function acsForm(fleetId: number, name: string): string {
  return `
    <form action="?page=fleetTable&amp;action=acs" method="post">
      <input name="fleetID" value="${fleetId}" type="hidden">
      <table class="table519">
        <tr style="height:20px;">
          <th colspan="2">ACS fleet</th>
        </tr>
        <tr style="height:20px;">
          <th colspan="2">ACS name (<a href="javascript:Rename();">Change</a>)</th>
        </tr>
        <tr>
          <td colspan="2" id="acsName">${name}</td>
        </tr>
        <tr style="height:20px;">
          <th style="width:50%;">Guests</th>
          <th style="width:50%;">Invite members</th>
        </tr>
        <tr>
          <td>
            <select size="5" style="width:80%;">
              <option value="4242">AhMisty</option>
              <option value="4243">Nova</option>
            </select>
          </td>
          <td>
            <p><input name="username" type="text"></p>
            <p><input type="submit" value="Continue"></p>
          </td>
        </tr>
      </table>
    </form>
    <script type="text/javascript">
    function Rename(){
      var Name = prompt("ACS name", "${name}");
      $.getJSON('?page=fleetTable&action=acs&fleetID=${fleetId}&acsName='+Name, function(data) {
        if(data != "") { alert(data); return; }
        $('#acsName').text(Name);
      });
    }
    </script>
  `
}

export const fleetTableAcsRowBody = `
    <table class="tablesorter ally_ranks">
      <tr>
        <td>1</td>
        <td>Attack<br><a title="On the way">A</a></td>
        <td>10</td>
        <td>[1:2:3]</td>
        <td>01.01.2026 12:00:00</td>
        <td>[1:2:4]</td>
        <td>01.01.2026 13:00:00</td>
        <td style="color:lime">0:59:59</td>
        <td>
          <form action="game.php?page=fleetTable&amp;action=sendfleetback" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="Send back" type="submit">
          </form>
          <form action="game.php?page=fleetTable&amp;action=acs" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="ACS" type="submit">
          </form>
        </td>
      </tr>
    </table>
  `

export const galaxyOccupiedPositionBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <span id="p_1000" class="tooltip gal_img_planet" data-tooltip-content="planet">
        <table class="gl-actions-t">
          <a class="i-mis1" href="?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">attack</a>
          <a class="gl-actions-i ri i-mis10" href="?page=fleetMissile">missiles</a>
          <a class="i-mis17" href="?page=phalanx">phalanx</a>
        </table>
      </span>
      <div class="gal_planet_name">Homeworld (15 min)</div>
      <div class="gal_ico_moon">
        <span class="ico_moon"></span>
        <div data-tooltip-content="<table><tr><td>8.660</td></tr><tr><td>-20</td></tr></table>"></div>
        <a href="javascript:doit(6, 1001);">spy</a>
      </div>
      <div class="gal_ico_trash">
        <div data-tooltip-content="<span class='tooltip_class_901'>1.000</span><span class='tooltip_class_902'>500</span>"></div>
      </div>
      <div class="gal_player_name">
        <a href="game.php?page=playerCard&amp;id=4242" onclick="return Dialog.Playercard(4242);">
          <span class="galaxy-username-class1 galaxy-username">AhMisty</span>
        </a>
        <div data-tooltip-content="<a href='game.php?page=playerCard' onclick='return Dialog.Playercard(4242);'>AhMisty</a><a href='game.php?page=statistics&amp;start=7'>7</a>"></div>
      </div>
      <div class="gal_ally_name">
        <span class="galaxy-alliance">[ALLY]</span>
        <div data-tooltip-content="<a href='game.php?page=alliance&amp;id=9'>ALLY</a><a href='game.php?page=statistics&amp;start=3'>3</a>"></div>
      </div>
    </div>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">4</a></div>
      <div class="gal_player_cont"><a class="ico_coloni" href="?page=fleetTable">colonize</a></div>
    </div>
  `

export const galaxyUnrankedRowsBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <span id="p_1000" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Homeworld</div>
      <div class="gal_player_name">
        <a class="tooltip_sticky" data-tooltip-content="<table class='tooltip_class_table'><tbody><tr><td><a class='tooltip_class_a_bigbtn' href='#' onclick='return Dialog.Playercard(4242);'>Player card</a></td></tr><tr><td><a class='tooltip_class_a_bigbtn' href='?page=statistics&amp;who=1&amp;start='>See on stats</a></td></tr></tbody></table>">
          <span class="galaxy-username">AhMisty</span>
        </a>
      </div>
      <div class="gal_ally_name">
        <a class="tooltip_sticky" data-tooltip-content="<table class='tooltip_class_table'><tbody><tr><td><a class='tooltip_class_a_bigbtn' href='?page=alliance&amp;mode=info&amp;id=9'>Alliance page</a></td></tr><tr><td><a class='tooltip_class_a_bigbtn' href='?page=statistics&amp;start=&amp;who=2'>See on stats</a></td></tr></tbody></table>">
          <span class="galaxy-alliance">[ALLY]</span>
        </a>
      </div>
    </div>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">4</a></div>
      <span id="p_1001" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Nova</div>
      <div class="gal_player_name">
        <a class="tooltip_sticky" data-tooltip-content="<table class='tooltip_class_table'><tbody><tr><td><a class='tooltip_class_a_bigbtn' href='#' onclick='return Dialog.Playercard(4243);'>Player card</a></td></tr><tr><td><a class='tooltip_class_a_bigbtn' href='?page=statistics'>See on stats</a></td></tr></tbody></table>">
          <span class="galaxy-username">Nova</span>
        </a>
      </div>
      <div class="gal_ally_name">
        <a class="tooltip_sticky" data-tooltip-content="<table class='tooltip_class_table'><tbody><tr><td><a class='tooltip_class_a_bigbtn' href='?page=alliance&amp;mode=info&amp;id=10'>Alliance page</a></td></tr><tr><td><a class='tooltip_class_a_bigbtn' href='?page=statistics&amp;who=2'>See on stats</a></td></tr></tbody></table>">
          <span class="galaxy-alliance">[NOVA]</span>
        </a>
      </div>
    </div>
  `

export const findDebrisBody = `
    <a href="game.php?page=findDebris&amp;y=1">search</a>
    <table class="ally_ranks">
      <tr><td>1</td><td>2</td><td>3</td><td>1.000</td><td>500</td><td><a href="javascript:doit(8, 2001);">harvest</a></td></tr>
    </table>
  `

export const fleetStep3EmptyShipReceiptBody = `
    <div class="fleettab16">
      <div class="fleetstep1-3"><img src="x">Mission <span class="fleetstep1-10">Transport</span></div>
      <div class="fleetstep1-4">Arrival<span class="fleetstep1-10">01.01.2026 12:00:00</span></div>
      <div class="fleetstep1-5">Fuel <span class="fleetstep1-10">1.234</span></div>
      <div class="fleetstep1-5">From <span class="fleetstep1-10">[1:2:3]</span></div>
      <div class="fleetstep1-6"><span class="fleetstep1-11">17.000</span> speed</div>
      <div class="fleetstep1-7">Arrival <span class="fleetstep1-11">01.01.2026 13:00:00</span></div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">42</span> distance</div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">[1:2:4]</span> destiny</div>
    </div>
    <div class="alleanza1"><img src="gebaeude/202.gif" class="fleettab13"><span class="fleettab14">Small Cargo</span><span class="fleettab15">0</span></div>
  `

export const fleetStep1FormOnlyBody = `<form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>`

export const fleetStep1InvalidOriginBody = `
    <form action="game.php?page=fleetStep2" method="post"><input type="hidden" name="token" value="tok-1"></form>
    <div id="shortcut-data"></div>
    <script>data = {planet: {galaxy: 1, system: 2, planet: 3, planet_type: 9}, ships: {}};</script>
  `

export const fleetStep3UnstatedOriginReceiptBody = `
    <div class="fleettab16">
      <div class="fleetstep1-3"><img src="x">Mission <span class="fleetstep1-10">Transport</span></div>
      <div class="fleetstep1-4">Arrival<span class="fleetstep1-10">01.01.2026 12:00:00</span></div>
      <div class="fleetstep1-5">Fuel <span class="fleetstep1-10">1.234</span></div>
      <div class="fleetstep1-5">From <span class="fleetstep1-10">somewhere</span></div>
      <div class="fleetstep1-6"><span class="fleetstep1-11">17.000</span> speed</div>
      <div class="fleetstep1-7">Arrival <span class="fleetstep1-11">01.01.2026 13:00:00</span></div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">42</span> distance</div>
      <div class="fleetstep1-9"><span class="fleetstep1-11">[1:2:4]</span> destiny</div>
    </div>
    <div class="alleanza1"><img src="gebaeude/202.gif" class="fleettab13"><span class="fleettab15">10</span></div>
  `

export const debrisTableWithoutControlBody = '<table class="ally_ranks"></table>'

export const debrisIncompleteRowBody = `
    <a href="game.php?page=findDebris&amp;y=1">search</a>
    <table class="ally_ranks">
      <tr><td>1</td><td>2</td><td>3</td><td>1.000</td><td>500</td></tr>
    </table>
  `

export const debrisRowWithoutHarvestPlanetBody = `
    <a href="game.php?page=findDebris&amp;y=1">search</a>
    <table class="ally_ranks">
      <tr><td>1</td><td>2</td><td>3</td><td>1.000</td><td>500</td><td><a href="javascript:doit(8);">harvest</a></td></tr>
    </table>
  `

export const fleetTablePresetListNonArrayBody = `
    <form action="game.php?page=fleetStep1" method="post"></form>
    <div class="fl_groop_link_name" onclick="GroopShips(0);">Raid</div>
    <script>fleetGroopShip = 7;</script>
  `

export const fleetTableRowsBody = `
    <form action="game.php?page=fleetStep1" method="post"></form>
    <div class="fl_groop_link_name" onclick="GroopShips(0);">Raid</div>
    <table class="ally_ranks">
      <tr><td>No.</td><td>Mission</td><td>Amount</td><td>From</td><td>Departure</td><td>To</td><td>Objective</td><td>Arrival</td><td>Order</td></tr>
      <tr>
        <td>1</td>
        <td>Transport<br><a title="On the way">A</a></td>
        <td><a class="tooltip" data-tooltip-content="<table class='reducefleet_table'><tr></tr><tr><td>Several ships:</td></tr><tr><td class='reducefleet_img_ship'><img src='gebaeude/202.gif'></td><td class='reducefleet_name_ship'>Small Cargo: <span class='reducefleet_count_ship'>10</span></td></tr></table>">10</a></td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></td>
        <td>01.01.2026 12:00:00</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:4]</a></td>
        <td>01.01.2026 13:00:00</td>
        <td>0:59:59</td>
        <td>
          <form action="game.php?page=fleetTable&amp;action=acs" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="ACS" type="submit">
          </form>
        </td>
      </tr>
    </table>
    <input name="shipGroop" value="0">
    <script>fleetGroopShip = [{}];</script>
  `

export const fleetTableIncompleteRowBody = `
    <form action="game.php?page=fleetStep1" method="post"></form>
    <table class="ally_ranks">
      <tr><td>1</td><td>Transport</td><td>10</td></tr>
    </table>
  `

export const fleetTableStateLinkTextBody = `
    <form action="game.php?page=fleetStep1" method="post"></form>
    <table class="ally_ranks">
      <tr>
        <td>1</td>
        <td>Transport<br><a>On the way</a></td>
        <td><a class="tooltip" data-tooltip-content="<table class='reducefleet_table'><tr><td class='reducefleet_img_ship'><img src='gebaeude/202.gif'></td><td class='reducefleet_name_ship'>Small Cargo: <span class='reducefleet_count_ship'>10</span></td></tr></table>">10</a></td>
        <td>[1:2:3]</td>
        <td>01.01.2026 12:00:00</td>
        <td>[1:2:4]</td>
        <td>01.01.2026 13:00:00</td>
        <td>0:59:59</td>
        <td>
          <form action="game.php?page=fleetTable&amp;action=sendfleetback" method="post">
            <input name="fleetID" value="55" type="hidden">
            <input value="Send back" type="submit">
          </form>
        </td>
      </tr>
    </table>
  `

export const fleetTableDeployedRowBody = `
    <form action="?page=fleetStep1" method="post"></form>
    <table class="tablesorter ally_ranks">
      <tr><td>No.</td><td>Mission</td><td>Amount</td><td>Beginning</td><td>Departure</td><td>Destiny</td><td>Objective</td><td>Arrival</td><td>Order</td></tr>
      <tr>
        <td>1</td>
        <td>Deploy<br><a title="Returning">R</a></td>
        <td>5</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></td>
        <td>01.01.2026 10:00:00</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=5">[1:2:5]</a></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    </table>
  `

export const galaxyPlayerActionWithoutPlayerBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <div class="gal_player_name">
        <span class="galaxy-username">AhMisty</span>
        <div data-tooltip-content="<a href='game.php?page=playerCard' onclick='return Dialog.Playercard();'>AhMisty</a>"></div>
      </div>
    </div>
  `

export const galaxyDestroyedPlanetsBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <div class="gal_planet_name">Homeworld</div>
      <a class="i-mis1" href="?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">attack</a>
      <a class="i-mis1" href="?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">attack again</a>
    </div>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">4</a></div>
      <div class="gal_planet_name">Gone</div>
    </div>
  `

export const overviewDetailsWithoutDiameterBody = `
    <div id="big_panet"><div class="planetname">Homeworld</div></div>
    <div class="palnet_big_info">
      <div class="right_part"></div>
      <div class="right_part">-20 to 40</div>
      <div class="right_part">[1:2:3]</div>
      <div class="right_part">Rank 7 of 100</div>
    </div>
  `

export const jumpGateCountdownWithoutWaitBody = `
    <table style="width:100%;">
      <tbody>
        <tr style="height:20px;">
          <th colspan="3" class="left">Use the jump portal: number of ships</th>
        </tr>
        <tr style="height:20px;">
          <td colspan="3">(<span class="countdown" data-time="600">00:10:00</span>)</td>
        </tr>
      </tbody>
    </table>
  `

export const debrisRowWithoutHarvestColumnBody = `
    <a href="game.php?page=findDebris&amp;y=1">search</a>
    <table class="ally_ranks">
      <tr><td>1</td><td>2</td><td>3</td><td>1.000</td><td>500</td><td>Nothing to harvest</td></tr>
    </table>
  `

export const fleetTablePresetLinkWithoutIndexBody = `
    <form action="game.php?page=fleetStep1" method="post"></form>
    <div class="fl_groop_link_name">Raid</div>
    <script>fleetGroopShip = [{"202": 5}];</script>
  `

export const galaxyFormWithoutGalaxyValueBody = `
    <form id="galaxy_form"><input name="galaxy"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
    </div>
  `

export const galaxyNameWithoutActivityBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <span id="p_1000" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Homeworld</div>
    </div>
  `

export const galaxyMoonWithoutTooltipFiguresBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">4</a></div>
      <span id="p_1001" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Nova</div>
      <div class="gal_ico_moon">
        <div class="ico_moon tooltip" data-tooltip-content="<table class='tooltip_class_table'><tr><th colspan='2'>Moon [1:2:4]</th></tr><tr><td class='tooltip_class_table_text_left'><span>Diameter</span> 8.660</td></tr></table>"></div>
        <a href="javascript:doit(6, 1001);">spy</a>
      </div>
    </div>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">5</a></div>
      <span id="p_1002" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Outpost</div>
      <div class="gal_ico_moon">
        <div class="ico_moon tooltip" data-tooltip-content="<table class='tooltip_class_table'><tr><th colspan='2'>Moon [1:2:5]</th></tr></table>"></div>
      </div>
    </div>
  `

export const galaxyPlayerSpanBody = `
    <form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <span id="p_1000" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Homeworld</div>
      <div class="gal_player_name">
        <a class="tooltip_sticky" data-tooltip-content="<table class='tooltip_class_table'><tbody><tr><th>Rank 7 of 100</th></tr><tr><td><a class='tooltip_class_a_bigbtn' href='#' onclick='return Dialog.Playercard(4242);'>Player card</a></td></tr></tbody></table>">
          <span class="galaxy-username-cool galaxy-username" style="color:#eae45c">AhMisty</span>
          <span>(</span><span class="galaxy-short-cool galaxy-short">c</span><span>)</span>
        </a>
      </div>
    </div>
  `
