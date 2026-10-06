export function contentPage(content: string): string {
  return `<div id="page"><div id="content">${content}</div></div>`
}

export const allianceStorageBody = `
    <div class="gray_stripo">
      <div class="titolosinistra">
        Storage
      </div>
      <div class="tornaindietro">
        <a href="?page=alliance">Back</a>
      </div>
    </div>
    <div class="alleanza45">
      <div class="ally_contents sepor_conten res_901" style="background-image: url(./styles/theme/nsc/img/resources/901f.png);">
        <div class="res_text">Metal:</div>
        <div class="res_count">1.000</div>
        <div class="clear"></div>
      </div>
      <div class="ally_contents sepor_conten res_902" style="background-image: url(./styles/theme/nsc/img/resources/902f.png);">
        <div class="res_text">Crystal:</div>
        <div class="res_count">500</div>
        <div class="clear"></div>
      </div>
      <div class="ally_contents" style="padding:10px;">
        <div>
          <a href="?page=alliance&amp;mode=issue" method="post" class="alleanza46">Distribute</a>
        </div>
        <div>
          <a class="alleanza46">Withdraw available in: 15 min</a>
        </div>
        <div>
          <a href="?page=alliance&amp;mode=put" class="alleanza46">Deposit</a>
        </div>
        <div class="clear"></div>
      </div>
    </div>
  `

export const allianceStorageWithoutBalanceBody = '<div class="alleanza1"></div>'

export const allianceRanksBody = `
    <div id="new_alliance_rank">
      <table>
        <tr>
          <td><img src="img/iconav/admin.png" alt="ADMIN"></td>
          <td><input type="checkbox" name="newrank[1]" title="Administration"></td>
        </tr>
        <tr>
          <td><img src="img/iconav/bank.png" alt="BANK"></td>
          <td><input type="checkbox" name="newrank[2]" title=""></td>
        </tr>
      </table>
    </div>
    <table>
        <tr>
          <td><input type="text" name="rank[3][rankName]" value="Leader"></td>
          <td><input type="checkbox" name="rank[3][1]" checked="checked"></td>
          <td><input type="checkbox" name="rank[3][2]"></td>
        </tr>
        <tr>
          <td><input type="text" name="rank[4][rankName]" value="Treasurer"></td>
          <td><input type="checkbox" name="rank[4][1]"></td>
          <td><input type="checkbox" name="rank[4][2]" checked="checked"></td>
        </tr>
      </table>
  `

export const allianceDiplomacyOptionsBody = `
    <select name="ally_id"><option value="9">[ALLY] Alpha</option><option value="10">Beta</option></select>
    <select name="level"><option value="3">Trade pact</option><option value="5">War</option></select>
  `

export const allianceDistributionBody = `
    <div id="trader">
      <select name="id_u"><option value="2001">Nova (AhMisty)</option></select>
      <table>
        <tr>
          <td class="trade_input" name="901">Metal</td>
          <td class="res_count">1.000</td>
        </tr>
        <tr>
          <td class="trade_input" name="902">Crystal</td>
          <td class="res_count">500</td>
        </tr>
      </table>
    </div>
  `

export const allianceMemberListBody = `
    <table id="memberList" class="tablesorter ally_ranks gray_stripe_th">
      <thead>
        <tr>
          <th>Member</th>
          <th></th>
          <th>Rank</th>
          <th>Points</th>
          <th>Coordinates</th>
          <th>Joined</th>
          <th>Activity</th>
        </tr>
      </thead>
      <tbody>
        <tr class="alleanza62">
          <td><a href="#" onclick="return Dialog.Playercard(4242);">AhMisty</a></td>
          <td></td>
          <td>Leader</td>
          <td>1.234</td>
          <td>[1:2:3]</td>
          <td>01.01.2026</td>
          <td>15 min</td>
        </tr>
        <tr class="alleanza62">
          <td>Plain Member</td>
          <td></td>
          <td>Member</td>
          <td>10</td>
          <td>[1:2:4]</td>
          <td>02.01.2026</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  `

export const allianceAdminMembersBody = `
    <table id="memberList" class="tablesorter ally_ranks gray_stripe_th">
      <thead>
        <tr>
          <th>Member</th>
          <th></th>
          <th>Rank</th>
          <th>Points</th>
          <th>Coordinates</th>
          <th>Joined</th>
          <th>Activity</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr class="alleanza62">
          <td><a href="#" onclick="return Dialog.Playercard(4242);">AhMisty</a></td>
          <td></td>
          <td><select name="rank[4242]"><option value="3" selected="selected">Leader</option><option value="4">Member</option></select></td>
          <td>1.234</td>
          <td>[1:2:3]</td>
          <td>01.01.2026</td>
          <td>15 min</td>
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=membersKick&amp;id=4242">kick</a></td>
        </tr>
        <tr class="alleanza62">
          <td>Plain Member</td>
          <td></td>
          <td>Member</td>
          <td>10</td>
          <td>[1:2:4]</td>
          <td>02.01.2026</td>
          <td>-</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `

export const allianceAdminMembersScoredBody = `
    <table id="memberList" class="tablesorter ally_ranks gray_stripe_th">
      <tbody>
        <tr class="alleanza62">
          <td><a href="#" onclick="return Dialog.Playercard(4242);">AhMisty</a></td>
          <td></td>
          <td><select name="rank[4242]"><option value="3" selected="selected">Leader</option></select></td>
          <td><span title="1.234.567">1,23 M</span></td>
          <td>[1:2:3]</td>
          <td>01.01.2026</td>
          <td>15 min</td>
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=membersKick&amp;id=4242">kick</a></td>
        </tr>
      </tbody>
    </table>
  `

export const allianceSettingsBody = `
    <form action="game.php?page=alliance&amp;mode=admin" method="post">
      <input type="hidden" name="send" value="1">
      <input type="hidden" name="textMode" value="external">
      <input name="ally_tag" value="ALLY">
      <input name="ally_name" value="The Alliance">
      <input name="owner_range" value="Leader">
      <input name="web" value="">
      <input name="image" value="">
      <select name="request_notallow"><option value="0" selected="selected">open</option><option value="1">closed</option></select>
      <input name="ally_max_members" value="50">
      <input name="request_min_points" value="1000">
      <select name="stats"><option value="1" selected="selected">shown</option></select>
      <select name="diplo"><option value="0" selected="selected">hidden</option></select>
      <select name="events[]" multiple="multiple">
        <option value="1" selected="selected">Attack</option>
        <option value="2">Transport</option>
      </select>
      <textarea name="text">Apply here</textarea>
    </form>
  `

export const allianceApplicationBody = `
    <form action="game.php?page=alliance&amp;mode=admin&amp;action=sendAnswerToApply&amp;id=9" method="post">
      <button name="answer" value="yes">Accept</button>
      <button name="answer" value="no">Reject</button>
    </form>
    <a href="#" onclick="return Dialog.Playercard(4242);">AhMisty</a>
    <div class="alleanza36">Please let me in</div>
  `

export const allianceApplicationAnswerButton = '<button name="answer" value="yes">Accept</button>'

export const allianceApplicationAnswerWithoutValue = '<button name="answer">Accept</button>'

export const allianceHomeBody = `
    <div class="gray_flettab ">
      Alliance
      <div class="position" style="margin-right: 175px;">
        Rank: Leader
      </div>
      <div class="tornaindietroa">
        <a href="?page=alliance&amp;mode=admin" style="color:#fff">Manage alliance</a>
      </div>
    </div>
    <div class="row" style="padding: 7px">
      <div class="col-md-12">
        <div class="card background-border-black-blue shadow">
          <div class="ally_img" style="background-image:url(./styles/theme/nsc/img/title/al.jpg)">
            <div class="designation">
              <span class="">Nova [NOVA]</span><br>
              <a href="?page=alliance&amp;mode=memberList" style="display:inline;">12 Members</a> of 50
            </div>
            <div style="position: absolute;right: 6px;bottom: 6px;z-index: 2;">
              <a href="https://nova.example.com/">
                <button type="button" class="btn mb-1">Alliance website</button>
              </a>
              <a href="game.php?page=alliance&amp;mode=close" onclick="return confirm('Leave the alliance?');">
                <button type="button" class="btn">Leave alliance</button>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <a href="game.php?page=alliance&mode=circular" onclick="return Dialog.open(this.href, 716, 300);">
              <button type="button" class="btn mesages">Circular message</button>
            </a>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <a href="game.php?page=alliance&mode=development">
              <button type="button" class="btn development">Development</button>
            </a>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <a href="game.php?page=alliance&mode=storage">
              <button type="button" class="btn storage">Storage</button>
            </a>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacy">
              <button type="button" class="btn diplomacy">Diplomacy</button>
            </a>
          </div>
        </div>
      </div>
      <div class="col-md-12">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Inside section</p>
            <p class="card-text">Members only</p>
          </div>
        </div>
      </div>
      <div class="col-md-12">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Events</p>
            <p class="card-text">
              <span>No events</span>
            </p>
          </div>
        </div>
      </div>
      <div class="col-md-12">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Inside section</p>
            <p class="card-text">A peaceful alliance.</p>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card mt-1 mr-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Fight stats</p>
            <div class="row">
              <div class="col-md-4">
                <p class="alleanza_zone">Won<br><span class="card-text">12 (60%)</span></p>
              </div>
              <div class="col-md-4">
                <p class="alleanza_zone">Lost<br><span class="card-text">8 (40%)</span></p>
              </div>
            </div>
            <p class="card-text">Total fights <span style="float: right;">20</span></p>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Diplomacy</p>
            <p class="card-text overflow-auto" style="min-height: 85px;">
              <span>No pacts</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `

export const allianceApplyWaitBody = `
    <div class="gray_flettab" style="padding-right:0;">Your request to [NOVA]</div>
    <div class="ally_img">
      <table class="no_visible">
        <tbody><tr>
          <td>
            <img src="./styles/theme/nsc/img/title/al_app.jpg" alt="*">
            <span class="designation">
              <span>Your request</span><br>
            </span>
          </td>
        </tr></tbody>
      </table>
    </div>
    <div class="clear"></div>
    <div class="build_band2" style="padding-right:0;">
      <form action="game.php?page=alliance&amp;mode=cancelApply" method="post">
        <input class="bottom_band_submit message_check_message" id="submit" name="button" value="Continue" type="button">
      </form>
      <p>Your request is waiting for an answer.</p>
    </div>
  `

export const allianceCreateSelectionBody = `
    <div class="gray_flettab" style="padding-right:0;">Alliance
      <a href="game.php?page=alliance&amp;mode=create" class="tornaindietroa">Found an alliance</a>
    </div>
    <div class="ally_img">
      <table class="no_visible">
        <tr>
          <td>
            <img src="./styles/theme/nsc/img/title/al.jpg" alt="*" />
            <span class="designation">
              <span>Alliance</span><br/>
            </span>
          </td>
        </tr>
      </table>
    </div>
    <div class="fleettab1" style="height:21px;">
      <a href="game.php?page=statistics" class="tornaindietroa" style="left: 0;">Statistics</a>
      <a href="game.php?page=search" class="tornaindietroa">Search</a>
    </div>
  `

export const allianceInfoBody = `
    <div class="gray_flettab">
      Alliance
    </div>
    <div class="row" style="padding: 7px">
      <div class="col-md-12">
        <div class="card background-border-black-blue shadow">
          <div class="ally_img" style="background-image:url(./styles/theme/nsc/img/title/al.jpg)">
            <div class="designation">
              <span class="">Nova [NOVA]</span><br>
              12 Members of 50
            </div>
            <div style="position: absolute;right: 6px;bottom: 6px;z-index: 2;">
              <a href="game.php?page=alliance&amp;mode=apply&amp;id=7">
                <button type="button" class="btn">Request to join</button>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-12">
        <div class="card mt-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-text">A peaceful alliance.</p>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card mt-1 mr-1 background-border-black-blue shadow">
          <div class="card-body">
            <p class="card-title text-align-center">Fight stats</p>
            <p class="card-text">Total fights <span style="float: right;">20</span></p>
          </div>
        </div>
      </div>
    </div>
  `

export const allianceWithoutStateBody =
  '<div class="card-body"><p class="card-text">Members only</p></div>'

export const allianceDepositBody = `
    <div class="gray_stripo">
      <a href="game.php?page=alliance&amp;mode=storage" style="color:#8e9394;">Storage</a>
      <img src="./styles/theme/nsc/img/iconav/arrow_right.png" alt="">
      Deposit
      <span class="tornaindietro"><a href="game.php?page=alliance&amp;mode=storage">Back</a></span>
    </div>
    <form id="trader" action="game.php?page=alliance" method="post">
      <input type="hidden" name="mode" value="putsend">
      <div class="alleanza45">
        <div class="ally_contents sepor_conten res_901" style="background-image: url(./styles/theme/nsc/img/resources/901f.png);">
          <div class="res_text" style="margin-left: 15px;margin-top: 3px;">Metal:</div>
          <div class="res_count"><input name="901" id="901" class="trade_input" type="text" value="0" size="30"></div>
          <div class="clear"></div>
        </div>
        <div class="ally_contents sepor_conten res_902" style="background-image: url(./styles/theme/nsc/img/resources/902f.png);">
          <div class="res_text">Crystal:</div>
          <div class="res_count"><input name="902" id="902" class="trade_input" type="text" value="0" size="30"></div>
          <div class="clear"></div>
        </div>
        <div class="ally_contents sepor_conten res_903" style="background-image: url(./styles/theme/nsc/img/resources/903f.png);">
          <div class="res_text">Deuterium:</div>
          <div class="res_count"><input name="903" id="903" class="trade_input" type="text" value="0" size="30"></div>
          <div class="clear"></div>
        </div>
      </div>
      <div class="ally_contents frax4" style="padding:0">
        <div style="float:left; margin-left:12px;margin-top: 4px;line-height: 18px;">
          <div class="res_text">Maximum:</div>
          <div class="res_count" style="width:auto;">1.000</div>
          <div class="clear"></div>
          <div class="res_text">Total:</div>
          <div class="res_count" style="width:auto;"><span id="ress">0</span></div>
        </div>
        <input type="submit" class="alleanza55" style="width: 50%;right: 7px;left: auto;" value="OK">
        <div class="clear"></div>
      </div>
    </form>
  `

export const allianceWithdrawalBody = `
    <div class="gray_stripo">
      <a href="game.php?page=alliance&amp;mode=storage" style="color:#8e9394;">Storage</a>
      <img src="./styles/theme/nsc/img/iconav/arrow_right.png" alt="">
      Withdraw
      <span class="tornaindietro"><a href="game.php?page=alliance&amp;mode=storage">Back</a></span>
    </div>
    <form id="trader" action="game.php?page=alliance" method="post">
      <input type="hidden" name="mode" value="vlyatsend">
      <div class="alleanza45">
        <div class="ally_contents sepor_conten res_901" style="background-image: url(./styles/theme/nsc/img/resources/901f.png);">
          <div class="res_text">Metal:</div>
          <div class="res_count"><input name="901" id="901" class="trade_input" type="text" value="0" size="30"></div>
          <div class="clear"></div>
        </div>
      </div>
      <div class="ally_contents frax4" style="padding:0">
        <div style="float:left; margin-left:12px;margin-top: 4px;line-height: 18px;">
          <div class="res_text">Maximum:</div>
          <div class="res_count" style="width:auto;">750</div>
          <div class="clear"></div>
        </div>
        <input type="submit" class="alleanza55" value="OK">
        <div class="clear"></div>
      </div>
    </form>
  `

export const allianceOfferWithoutTraderBody = '<div class="alleanza45"></div>'

export const allianceDevelopmentBody = `
    <div id="ally_content" class="conteiner" style="width: 100%;">
      <div class="gray_stripo">
        <div class="titolosinistra">Development</div>
        <div class="tornaindietro"><a href="?page=alliance">Back</a></div>
      </div>
      <div class="res_mini_navigation">
        <span id="res_901" class="res_block colore901"><img src="./styles/theme/nsc/img/resources/901f.png">1.000</span>
      </div>
      <div id="build_elements" class="officier_elements gov2">
        <div id="ofic_2501" class="build_box ">
          <div class="head">
            Class A weaponry
            <font class="gov6">(Level 2/1000)</font>
          </div>
          <div class="content_box">
            <div class="image_mini">
              <img src="./styles/theme/nsc/gebaeude/2501.gif" alt="Class A weaponry" />
            </div>
            <div class="prices_mini">
              <font color="#096">+1% attack on attack<br>+1% defence on attack<br>+1% shield on attack<br></font>
            </div>
            <div class="clear"></div>
            <form action="game.php?page=alliance&mode=development" method="post" class="build_form" id="Gov">
              <div class="time_build_mini">
                Stardust:
                <b><span id="price2501" style="color:lime">1</span></b>
              </div>
              <div class="clear"></div>
              <div class="btn_build_border">
                <form action="game.php?page=alliance&mode=development" method="post" class="build_form">
                  <div class="clear"></div>
                  <input name="id" value="2501" type="hidden">
                  <div class="btn_build_border btn_build_border_left dm_btn_build_border_left">
                    <label class="max_btn_ship">Level up</label>
                    <div class="div_text count_ships_dots">
                      <input id="amount2501" class="text" onchange="Price923('2501', 1);" name="amount" max="1000" min="1" value="1" type="number">
                    </div>
                  </div>
                  <div class="btn_build_border btn_build_border_right dm_btn_build_border_right">
                    <button class="btn_build gubernators_form_submit" type="submit">Buy</button>
                  </div>
                </form>
              </div>
            </form>
          </div>
        </div>
        <div id="ofic_2502" class="build_box required">
          <div class="head">
            Class A Defense
            <font class="gov6">(Level 0/1000)</font>
          </div>
          <div class="content_box">
            <div class="image_mini">
              <img src="./styles/theme/nsc/gebaeude/2502.gif" alt="Class A Defense" />
            </div>
            <div class="prices_mini" style="height: 80px;">
              <div class="necccos" style="left: 75px;">Required tech</div>
              <div class="required_block required_smal_text">
                <a href="#" onclick="return Dialog.info(2501)" class="tooltip" data-tooltip-content="<span style='color:red;'>Class A weaponry Level 2 (1/2)</span>">
                <img src="./styles/theme/nsc/gebaeude/2501.gif" alt="Class A weaponry" />
                <div class="text" style="color:red;">1/2</div></a>
              </div>
            </div>
            <div class="clear"></div>
            <div class="btn_build_border">
              <span class="btn_build red">Not enough resources</span>
            </div>
          </div>
        </div>
        <div class="clear"></div>
      </div>
    </div>
  `

export function developmentEntry(parts: {
  head: string
  requirement?: string
  control?: string
}): string {
  return `
    <div id="ally_content" class="conteiner">
      <div id="build_elements" class="officier_elements gov2">
        <div id="ofic_2501" class="build_box ">
          <div class="head">Class A weaponry ${parts.head}</div>
          <div class="content_box">
            <div class="prices_mini" style="height: 80px;">${parts.requirement ?? ''}</div>
            <div class="btn_build_border">${parts.control ?? ''}</div>
          </div>
        </div>
      </div>
    </div>
  `
}

export const allianceDevelopmentLevelLabelWithoutFigures = '<font class="gov6">(Level /)</font>'

export const allianceDevelopmentRequirement = `
    <div class="required_block required_smal_text">
      <a href="#" onclick="return Dialog.info(2501)" class="tooltip" data-tooltip-content="<span>Class A weaponry Level 2 (1/2)</span>">
        <img src="./styles/theme/nsc/img/iconav/mes_inarchive.png" alt="Class A weaponry" />
        <div class="text" style="color:red;">1/2</div>
      </a>
    </div>
  `

export const allianceDevelopmentLevelLabel = '<font class="gov6">(Level 2/1000)</font>'

export const allianceDevelopmentDisabledControl = `
    <form action="game.php?page=alliance&mode=development" method="post" class="build_form">
      <input name="id" value="2501" type="hidden" disabled>
      <button class="btn_build gubernators_form_submit" type="submit">Buy</button>
    </form>
  `

export const allianceDevelopmentWithoutMaximumLevelBody = `
    <div id="ally_content" class="conteiner">
      <div id="build_elements" class="officier_elements gov2">
        <div id="ofic_2501" class="build_box ">
          <div class="head">
            Class A weaponry
            <font class="gov6">(Level 2)</font>
          </div>
        </div>
      </div>
    </div>
  `

export const allianceApplicationsBody = `
    <div class="gray_stripo" style="margin-bottom:5px;">
      Requests
      <div class="tornaindietro"> <a href="game.php?page=alliance">Back</a></div>
    </div>
    <table id="memberList" class="tablesorter ally_ranks gray_stripe_th">
      <thead>
        <tr>
          <th>Applicant</th>
          <th>Request date</th>
        </tr>
      </thead>
      <tbody>
        <tr class="alleanza62">
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=detailApply&amp;id=9">AhMisty</a></td>
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=detailApply&amp;id=9">01.01.2026</a></td>
        </tr>
        <tr class="alleanza62">
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=detailApply&amp;id=10">Nova</a></td>
          <td><a href="game.php?page=alliance&amp;mode=admin&amp;action=detailApply&amp;id=10">02.01.2026</a></td>
        </tr>
      </tbody>
    </table>
  `

export const allianceApplicationsWithoutLinkBody = `
    <table id="memberList" class="tablesorter ally_ranks gray_stripe_th">
      <tbody>
        <tr class="alleanza62">
          <td>AhMisty</td>
          <td>01.01.2026</td>
        </tr>
      </tbody>
    </table>
  `

export const allianceDiplomacyBody = `
    <div class="gray_stripo" style="padding-right:0; margin-bottom:5px;">
      Diplomacy
      <div class="tornaindietro"><a href="game.php?page=alliance&amp;mode=admin">Back</a></div>
    </div>
    <div class="alleanza1" style="height:auto;width: 698px;">
      <div class="alleanza5 c-diplo-3" style="text-align: left;padding-left: 7px;">Trade pact <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyCreate&amp;diploMode=3" onclick="return Dialog.open(this.href, 716, 300);" class="batn_lincks right_flank diplomacy" style="position: absolute;right: 15px;top: 7px;">Propose</a></div>
      <div class="alleanza64">
        [ALLY] Alpha
        <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyDelete&amp;id=11" onclick="return confirm('Delete this pact?');" style="text-decoration:none; font-size:14px;">
        <img src="./styles/theme/nsc/img/general/false.png" alt="" width="14" height="14"></a>
      </div>
    </div>
    <div class="alleanza1" style="height:auto;width:344px;margin-right: 0;">
      <div class="alleanza5">
        Accept
      </div>
      <div class="alleanza64">
        Trade pact<br/>
        <ul>
          <li>
            Beta
            <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyAccept&amp;id=12" onclick="return confirm('Accept this pact?');">
            <img src="./styles/theme/nsc/img/general/true.png" alt="" width="16" height="16"></a>
            <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyDelete&amp;id=12" onclick="return confirm('Decline this pact?');">
            <img src="./styles/theme/nsc/img/general/false.png" alt="" width="16" height="16"></a>
          </li>
        </ul>
      </div>
    </div>
    <div class="clear"></div>
  `

export const allianceDiplomacyWithoutIdBody = `
    <div class="alleanza1" style="height:auto;width:344px;">
      <div class="alleanza64">
        [ALLY] Alpha
        <a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyDelete" onclick="return confirm('Delete this pact?');">
        <img src="./styles/theme/nsc/img/general/false.png" alt="" width="14" height="14"></a>
      </div>
    </div>
  `
