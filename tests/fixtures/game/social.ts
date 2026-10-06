export const settingsForm = `
<form action="game.php?page=settings" method="post">
  <input type="hidden" name="mode" value="send">
  <input name="foto" value="https://images.example/a.png">
  <input name="background" value="">
  <input name="username" value="AhMisty">
  <input name="password" type="password">
  <input name="newpassword" type="password">
  <input name="newpassword2" type="password">
  <input name="email" value="a@b.example">
  <select name="timezone"><option value="0">UTC</option><option value="60" selected="selected">CET</option></select>
  <select name="language"><option value="en" selected="selected">English</option></select>
  <select name="planetSort"><option value="1">by name</option><option value="2" selected="selected">by size</option></select>
  <select name="planetOrder"><option value="0" selected="selected">ascending</option><option value="1">descending</option></select>
  <select name="theme"><option value="nsc" selected="selected">nsc</option></select>
  <input name="queueMessages" type="checkbox" value="1" checked="checked">
  <input name="spyMessagesMode" type="checkbox" value="1">
  <input name="blockPM" type="checkbox" value="1" checked="checked">
  <input name="spycount" value="5">
  <input name="fleetactions" value="3">
  <input name="galaxySpy" type="checkbox" value="1" checked="checked">
  <input name="galaxyMessage" type="checkbox" value="1" checked="checked">
  <input name="galaxyBuddyList" type="checkbox" value="1">
  <input name="galaxyMissle" type="checkbox" value="1" checked="checked">
  <input name="vacation" type="checkbox" value="1">
  <input name="delete" type="checkbox" value="1" checked="checked">
  <input name="adminprotection" type="checkbox" value="1" checked="checked">
  <button type="submit">Save</button>
</form>
`

export const settingsVacationForm = `
    <form action="game.php?page=settings" method="post">
      <input type="hidden" name="mode" value="send">
      <div id="skils1">
      <input name="vacation" type="checkbox" value="1">
      <input name="delete" type="checkbox" value="1" checked="checked">
      </div>
      <button type="submit">Save</button>
    </form>
  `

export const settingsVacationTab = `
    <div id="content">
    <div id="achivment">
    <div class="ach_main_block academy_main_block1">
    <form action="game.php?page=settings&amp;mode=send" method="post">
    <input type="hidden" name="mode" value="send">
    <div id="academy" class="ach_main_content">
        <div id="skils1" class="settingleft" style="display:block;">
            <div style="float:left; width:100%;">
                <div class="ach_content" style="min-height: 130px;">
                    <div class="ally_contents" style="padding-bottom:20px;">
                        <div class="content_box">
                            <div class="clear"></div>
                            <label class="left_label" style="width: 300px;">End vacation mode</label>
                            <input name="vacation" type="checkbox" value="1" disabled>
                            <div class="clear"></div>
                            <label class="left_label" style="width: 300px;">Delete account</label>
                            <input name="delete" type="checkbox" value="1" checked="checked">
                        </div>
                    </div>
                <div class="clear"></div>
                </div>
                <div class=" build_band2 ticket_bottom_band">
                    <input value="Save changes" type="submit" style="width: 568px;">
                </div>
            </div>
        </div>
    </div>
    </form>
    </div>
    </div>
    </div>
  `

export const messageCategoryTabs = `
    <ul>
      <li><a href="#" onclick="Message.getMessages(100);return false;" class="planet1 messagesnew5" id="mes_100" style="background-image:url(x);color:#ffffff;">Messages <span id="unread_100">3</span>/<span id="total_100">12</span></a></li>
      <li><a href="#" onclick="Message.getMessages(999);return false;" class="planet1 messagesnew5" id="mes_999" style="background-image:url(x);">Outbox <span id="unread_999">0</span>/<span id="total_999">7</span></a></li>
    </ul>
  `

export const messageCategoryTabWithBlankColour = `
    <ul>
      <li><a href="#" onclick="Message.getMessages(100);return false;" class="planet1 messagesnew5" id="mes_100" style="background-image:url(x);color:;">Messages <span id="unread_100">2</span>/<span id="total_100">9</span></a></li>
    </ul>
  `

export const messageView = `
    <div class="messagestable">
      <form action="game.php?page=messages" method="post">
        <input type="hidden" name="mode" value="action">
        <input type="hidden" name="ajax" value="1">
        <input type="hidden" name="messcat" value="100">
        <input type="hidden" name="side" value="2">
      </form>
      <div class="message_page_navigation"><a href="#">1</a><a href="#">2</a><a href="#">3</a></div>
      <div class="head_row_msg">
        <div id="message_7" class="message_head mes_unread">
          <div class="message_time">01.01.2026 12:00:00</div>
          <div class="message_sender">
            <a href="#" onclick="return Dialog.Buddy(4242)"><img src="mes_friendd.png"></a>
            <a href="#" onclick="return Dialog.PM(4242, Message.CreateAnswer('Spy on 1:2:3'));"><img src="mes_messages.png"></a>
            <a href="#" onclick="msgArchive(7, 100); Message.getMessages(100); return false;"><img src="mes_inarchive.png"></a>
            <div class="message_check"><input name="messageID[7]" value="1" type="checkbox"></div>
          </div>
          <div class="message_title"><span class="message_recipient_name">Scout</span></div>
        </div>
        <div class="messages_body"><div class="left"><div class="message_text">Report: <a href="game.php?page=raport&amp;raport=abc123">battle</a></div></div></div>
      </div>
    </div>
  `

export const messageListCategoryField = '<input type="hidden" name="messcat" value="100">'

export function messageListSideFieldWithoutValue(category: string): string {
  return `<input type="hidden" name="side" value="">${category}`
}

export function messageListSideFieldWithTwoValues(category: string): string {
  return `<select name="side" multiple><option value="1" selected>1</option><option value="2" selected>2</option></select>${category}`
}

export function messageListSideFieldWithNoSelection(category: string): string {
  return '<select name="side" multiple><option value="1">1</option></select>' + category
}

export function messageListRoutingForm(fields: string): string {
  return `<div class="messagestable"><form action="game.php?page=messages" method="post">${fields}</form></div>`
}

export const messageViewOutbox = `
    <div class="messagestable">
      <form action="game.php?page=messages" method="post">
        <input type="hidden" name="messcat" value="999">
        <input type="hidden" name="side" value="1">
      </form>
    </div>
  `

export const messageViewWithoutCorrespondent = `
    <div class="messagestable">
      <form action="game.php?page=messages" method="post">
        <input type="hidden" name="messcat" value="100">
        <input type="hidden" name="side" value="1">
      </form>
      <div class="head_row_msg">
        <div id="message_11" class="message_head">
          <div class="message_time">03.01.2026 07:00:00</div>
          <div class="message_sender">
            <a href="#" onclick="msgArchive(11, 100); Message.getMessages(100); return false;" title="Archive"><img src="mes_inarchive.png"></a>
            <a href="#" onclick="msgDel(11, 100); Message.getMessages(100); return false;" title="Delete"><img src="mes_delmsg.png"></a>
          </div>
          <div class="message_title"><span class="message_recipient_name">System</span></div>
        </div>
        <div class="messages_body"><div class="left"><div class="message_text">Welcome to the universe. Report: <a href="game.php?page=raport&amp;raport=abc123">battle</a> and <a href="game.php?page=raport">the report list</a>.</div></div></div>
      </div>
    </div>
  `

export const messageViewWithHoleInArchiveCall = `
    <div class="messagestable">
      <form action="game.php?page=messages" method="post">
        <input type="hidden" name="messcat" value="100">
        <input type="hidden" name="side" value="1">
      </form>
      <div class="head_row_msg">
        <div id="message_11" class="message_head">
          <div class="message_time">03.01.2026 07:00:00</div>
          <div class="message_sender">
            <a href="#" onclick="msgArchive(11, ); Message.getMessages(100); return false;" title="Archive"><img src="mes_inarchive.png"></a>
          </div>
          <div class="message_title"><span class="message_recipient_name">System</span></div>
        </div>
        <div class="messages_body"><div class="left"><div class="message_text">Welcome</div></div></div>
      </div>
    </div>
  `

export const messageViewWithoutBody = `
    <div class="messagestable">
      <form action="game.php?page=messages" method="post">
        <input type="hidden" name="messcat" value="100">
        <input type="hidden" name="side" value="1">
      </form>
      <div class="head_row_msg">
        <div id="message_12" class="message_head">
          <div class="message_time">04.01.2026 06:00:00</div>
          <div class="message_title"><span class="message_recipient_name">System</span></div>
        </div>
      </div>
    </div>
  `

export const spyReport = `
    <div class="spyRaport">
      <div class="spyRaportHead"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">Spy on 1:2:3</a></div>
      <div class="spyRaportContainer">
        <div class="spyRaportContainerHead spyRaportContainerHeadClass0">Buildings</div>
        <div class="spyRaportContainerRow clearfix">
          <div class="spyRaportContainerCell">Metal Mine</div>
          <div class="spyRaportContainerCell">5</div>
          <div class="spyRaportContainerCell">Crystal Mine</div>
          <div class="spyRaportContainerCell">3</div>
        </div>
      </div>
      <div class="spyRaportContainer">
        <div class="spyRaportContainerHead spyRaportContainerHeadClass200">Ships</div>
        <div class="spyRaportContainerRow clearfix">
          <div class="spyRaportContainerCell">Small Cargo</div>
          <div class="spyRaportContainerCell">1.000</div>
        </div>
      </div>
      <div class="spyRaportFooter">
        <a href="game.php?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">Attack</a>
        <br>Probes lost: 1
        <br><a href="game.php?page=battleSimulator&amp;im[1]=5&amp;im[2]=3&amp;im[202]=1000">Simulate</a>
      </div>
    </div>
  `

export const spyReportWithoutSimulatorLink = `
    <div class="spyRaport">
      <div class="spyRaportHead"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">Spy on 1:2:3</a></div>
      <div class="spyRaportContainer">
        <div class="spyRaportContainerHead spyRaportContainerHeadClass400">Defense</div>
        <div class="spyRaportContainerRow clearfix">
          <div class="spyRaportContainerCell">Rocket Launcher</div>
          <div class="spyRaportContainerCell">1.234</div>
        </div>
      </div>
      <div class="spyRaportFooter"><a href="game.php?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">Attack</a> Nothing to report</div>
    </div>
  `

export const battleReport = `
    <div id="content_battle">
      <div id="batle_top_nav">
        <div class="batle_party"><table><tbody><tr><td>attacker</td></tr></tbody></table></div>
        <div class="batle_party"><table><tbody><tr><td>defender</td></tr></tbody></table></div>
        <div id="batle_vs">01.01.2026 12:00:00</div>
      </div>
      <div id="raports">
        <div class="batle_round" id="round_0">
          <div class="batle_part_att">
            <div class="batle_mem">
              <div class="batle_mem_header"><span>AhMisty</span> [1:2:3] <span>+10%</span> <span>+5%</span></div>
              <div class="batle_mem_content">
                <div class="batle_unit">
                  <div class="img_unit" data-tooltip-content="<table><tr><td>Weapon</td><td>120</td></tr><tr><td>Shield</td><td>10</td></tr></table>">
                    <img src="gebaeude/202.gif" alt="">
                  </div>
                  <span class="name_unit">Small Cargo</span>
                  <span data-real="10">10</span>
                  <span class="destruct_unit">-2</span>
                </div>
              </div>
            </div>
          </div>
          <div class="batle_part_def">
            <div class="batle_mem">
              <div class="batle_mem_header"><span>Scout</span> [1:2:4]</div>
              <div class="batle_mem_content">
                <div class="batle_unit">
                  <div class="img_unit" data-tooltip-content="<table><tr><td>Weapon</td><td>50</td></tr></table>">
                    <img src="gebaeude/401.gif" alt="">
                  </div>
                  <span data-real="40">40</span>
                  <span class="destruct_unit">0</span>
                </div>
              </div>
            </div>
          </div>
          <div class="batle_part_sep"><div class="clear"></div></div>
        </div>
      </div>
      <div class="batle_round_info"><h2>Defender won</h2></div>
      <div class="band_itog tooltip" data-tooltip-content="Lost: 2 / 0">
        <div class="ico_part"></div>
      </div>
      <div class="batle_text">Debris: 300 metal, 150 crystal</div>
    </div>
  `

export const battleReportPublic = `
    <div id="content_battle">
      <div id="batle_vs">01.01.2026</div>
      <div id="raports"></div>
      <div class="batle_round_info"><h2>Attacker won</h2></div>
      <div class="band_itog" data-tooltip-content="Lost: 1"></div>
      <div class="batle_text">Debris: none</div>
    </div>
  `

export const reportNotFound = `
    <div id="content"><div id="ally_content"><div class="ally_contents">Report not found</div></div></div>
  `

export const battleReportMaskedCoordinates = `
    <div id="content_battle">
      <div id="batle_top_nav">
        <div style="float:left; width:378px;" class="batle_party">
          <table><tbody><tr><td style="color:#c77602">AhMisty</td><td style="width:32px;"><img alt="" title="" src="styles/theme/nsc/img/battle/att.png"></td></tr></tbody></table>
        </div>
        <div style="float:right" class="batle_party">
          <table><tbody><tr><td style="width:30px;"><img alt="" title="" src="styles/theme/nsc/img/battle/def.png"></td><td style="color:#c77602">Scout</td></tr></tbody></table>
        </div>
        <div id="batle_vs">
            01.01.2026 12:00:00
        </div>
      </div>
      <div id="raports">
        <div class="batle_round" id="round_0">
          <div class="batle_part_att">
            <div class="batle_mem batle_mem">
              <div class="batle_mem_header">
                <span>AhMisty</span>
                ([XX:XX:XX])<br>
                Weapon <span>+140%</span> •
                Shield <span>+130%</span> •
                Armour <span>+120%</span>
                <div class="batle_scan batle_scan_active"></div>
              </div>
              <div class="batle_mem_content" style="display:block;">
                <div class="batle_unit">
                  <div class="img_unit tooltip" style="cursor:help !important" data-tooltip-content="
                    <table>
                      <tr><td style='color:#FC0;'>Weapon:</td><td><span >120</span></td></tr>
                      <tr><td style='color:#FC0;'>Shield:</td><td><span >10</span></td></tr>
                      <tr><td style='color:#FC0;'>Armour:</td><td>4.000</td></tr>
                    </table>
                  ">
                    <img alt="" title="" src="styles/theme/nsc/gebaeude/202.gif" width="60px" height="60px" />
                  </div>
                  <span class="name_unit">Small Cargo</span><br/>
                  <span class="tooltip" data-real="1.000" data-tooltip-content="1.000">1.000</span><br/>
                  <span class="destruct_unit">-250</span>
                </div>
                <div class="clear"></div>
              </div>
            </div>
          </div>
          <div class="batle_part_def">
            <div class="batle_mem">
              <div class="batle_mem_header">
                <span>Scout</span>
                ([XX:XX:XX])<br>
                Weapon <span>+80%</span> •
                Shield <span>+80%</span> •
                Armour <span>+80%</span>
              </div>
              <div class="batle_mem_content">
                <div class="batle_unit">
                  <div class="img_unit tooltip" style="cursor:help !important" data-tooltip-content="
                    <table><tr><td style='color:#FC0;'>Weapon:</td><td><span >50</span></td></tr></table>
                  ">
                    <img alt="" title="" src="styles/theme/nsc/gebaeude/401.gif" width="60px" height="60px" />
                  </div>
                  <span data-real="40">40</span>
                  <span class="destruct_unit">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="batle_round_info" onclick="RoundScan('#round_2');">
        <h2 style="color:#c77602">Both sides won</h2>
      </div>
      <div class="band_itog tooltip" style="cursor:help !important" data-tooltip-content="
        Attacker lost units 1.250 units<br>
        Defender lost units 0 units
      "></div>
      <div class="batle_text">
        Attacker lost 1.250 units, defender lost 0 units
      </div>
    </div>
  `

export const battleReportPrivateRounds = `
    <div id="content_battle">
      <div id="raports">
        <div class="batle_round" id="round_0">
          <div class="batle_part_att">
            <div class="batle_mem">
              <div class="batle_mem_header">
                <span>AhMisty</span>
                ([1:2:3])<br>
                Weapon <span>+140%</span> •
                Shield <span>+130%</span> •
                Armour <span>+120%</span>
              </div>
              <div class="batle_mem_content"></div>
            </div>
          </div>
          <div class="batle_part_def">
            <div class="batle_mem">
              <div class="batle_mem_header">
                <span>Scout</span>
                ([4:5:6])<br>
                Weapon <span>+80%</span> •
                Shield <span>+80%</span> •
                Armour <span>+80%</span>
              </div>
              <div class="batle_mem_content"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="batle_round_info" onclick="RoundScan('#round_2');">
        <h2>Defender won</h2>
      </div>
      <div class="band_itog tooltip" data-tooltip-content="
        Attacker lost units 500 units<br>
        Defender lost units 0 units
      "></div>
      <div class="batle_text">
        Debris: 300 metal, 150 crystal
      </div>
    </div>
  `

export const statisticsPlayersPage = `
    <form name="stats" id="stats" method="post" action="">
       <table class="tablesorter ally_ranks">
          <tr>
             <td><label for="who">Show</label> <select name="who" id="who" onchange="$('#stats').submit();"><option value="1" selected="selected">Players</option><option value="2">Alliances</option></select></td>
             <td><label for="type">Per</label> <select name="type" id="type" onchange="$('#stats').submit();"><option value="1" selected="selected">Points</option><option value="2">Fleets</option><option value="3">Research</option></select></td>
             <td><label for="range">Positions</label> <select name="range" id="range" onchange="$('#stats').submit();"><option value="1" selected="selected">1-100</option><option value="101">101-200</option></select></td>
          </tr>
       </table>
    </form>
    <table class="tablesorter ally_ranks tabstatistica">
      <tr class="barraclass">
        <th colspan="2">Position</th>
        <th>Player</th>
        <th></th>
        <th>Alliance</th>
        <th>Points</th>
      </tr>
      <tr class="classificabarra ">
        <td id="1" class="classstat1">1</td>
        <td class="classstat2"><span style='color:#87CEEB'>*</span></td>
        <td class="classstat3">
          <div class="barracla classstat4"></div>
          <a href="#" class="fbox-s-name classstat5" onclick="return Dialog.Playercard(4242, 'AhMisty');">
            <span style="color:lime">AhMisty</span>
            <span class="classstat6"><span class='galaxy-short-vacation galaxy-short'>v </span></span>
          </a>
        </td>
        <td class="classstat7"></td>
        <td class="classstat8"><a href="game.php?page=alliance&amp;mode=info&amp;id=7"><span style="color:#33CCFF">Void Runners</span></a><div class="barracla" style=""></div></td>
        <td class="classstat10" style="text-align:right">1.234.567</td>
      </tr>
      <tr class="classificabarra ">
        <td id="2" class="classstat1">2</td>
        <td class="classstat2"><span style='color:red'>-2</span></td>
        <td class="classstat3">
          <div class="barracla classstat4"></div>
          <a href="#" class="fbox-s-name classstat5" onclick="return Dialog.Playercard(77, 'Scout');">
            <span>Scout</span>
          </a>
        </td>
        <td class="classstat7"></td>
        <td class="classstat8">-<div class="barracla" style=""></div></td>
        <td class="classstat10" style="text-align:right">9.876</td>
      </tr>
    </table>
  `

export const statisticsAlliancesPage = `
    <form name="stats" id="stats" method="post" action="">
       <select name="who" id="who"><option value="1">Players</option><option value="2" selected="selected">Alliances</option></select>
       <select name="type" id="type"><option value="1" selected="selected">Points</option></select>
       <select name="range" id="range"><option value="1" selected="selected">1-100</option></select>
    </form>
    <table class="tablesorter ally_ranks tabstatistica">
      <tr class="barraclass">
        <th colspan="2">Position</th>
        <th>Alliance</th>
        <th>Members</th>
        <th style="text-align: center;padding-left: 20px;">Points</th>
        <th style="min-width:85px;">Per member</th>
      </tr>
      <tr class="classificabarra ">
        <td class="classstat1">1</td>
        <td class="classstat2"><span style='color:green'>+2</span></td>
        <td class="classstat3">
          <div class="barracla classstat4"></div>
          <a href="game.php?page=alliance&amp;mode=info&amp;id=7" class="fbox-s-name f-eu classstat5" target="ally" style="color:lime;">
            <span>Void Runners</span>
          </a>
        </td>
        <td class="classstat7">12</td>
        <td class="classstat7"></td>
        <td class="classstat8" style="text-align:right;width: 145px;"><div class="barracla" style="margin-left: 10px;"></div>1.234.567</td>
        <td class="classstat10" style="text-align:right;width: 130px;">102.880</td>
      </tr>
    </table>
  `

export const recordsPage = `
    <div id="u000" style="display: block;">
      <div class="record_header">Buildings</div>
      <div class="record_rows ">
         <div class="bottom_line_progres" style="width: 50%;"></div>
         <div class="record_img_utits"><a href="#" onclick="return Dialog.info(31)"><img src="styles/theme/nsc/gebaeude/31.gif"></a></div>
         <div class="record_name_utits"><a href="#" onclick="return Dialog.info(31)">Robotics Factory</a></div>
         <div class="record_made ico_record_made tooltip_sticky" data-tooltip-content="
            <span style='line-height:20px; font-size:14px; color:#6c6;'>Top holder:</span><br />
            • <a href='#' style='line-height:20px;' onclick='return Dialog.Playercard(4242);'>AhMisty</a><br/>
            • <a href='#' style='line-height:20px;' onclick='return Dialog.Playercard(77);'>Scout</a>
            ">
         </div>
         <div class="record_count">
            <div class="record_text record_server"><span>Record:</span> <div>25</div></div>
            <div class="record_text"><span>Yours:</span> <div>12</div></div>
         </div>
      </div>
      <div class="record_rows ">
         <div class="record_img_utits"><a href="#" onclick="return Dialog.info(44)"><img src="styles/theme/nsc/gebaeude/44.gif"></a></div>
         <div class="record_name_utits"><a href="#" onclick="return Dialog.info(44)">Ion Cannon</a></div>
      </div>
    </div>
    <div id="u400" style="display: block;">
      <div class="record_header">Defense</div>
      <div class="record_rows ">
         <div class="record_img_utits"><a href="#" onclick="return Dialog.info(402)"><img src="styles/theme/nsc/gebaeude/402.gif"></a></div>
         <div class="record_name_utits"><a href="#" onclick="return Dialog.info(402)">Rocket Launcher</a></div>
      </div>
    </div>
  `

export const recordsWithoutAnchor = '<div class="record_rows"></div>'

export const battleHallPage = `
    <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom:5px">
      <tbody>
        <tr class="torneo4">
          <th style="width: 45px;min-width: 45px;">Rank</th>
          <th style="text-align: center;min-width: 215px;width: 215px;">Owners</th>
          <th style="text-align:center;width: 185px;"><a href="game.php?page=battleHall&amp;order=date&amp;sort=DESC" style="font-weight:bold;">Date</a></th>
          <th style="text-align:right;width: 200px;"><a href="game.php?page=battleHall&amp;order=units&amp;sort=DESC">Units</a></th>
        </tr>
        <tr class="day0 week0 classificabarra">
          <td class="classstat1">1</td>
          <td class="classstat3" style="width: 200px;">
            <div class="barracla classstat4"></div>
            <a href="game.php?page=raport&amp;mode=battlehall&amp;raport=abc123" target="_blank">
              <span style="color:#00FF00">AhMisty</span> VS <span style="color:#FF0000">Scout</span>
            </a>
          </td>
          <td class="classstat8" style="text-align: center;width: 190px;">
            <div class="barracla" style="float: left;"></div>01.01.2026 12:00:00
            <div class="barracla" style=""></div>
          </td>
          <td class="classstat10" style="text-align: right;width: 185px;">1.234</td>
        </tr>
        <tr class="day0 week0 classificabarra">
          <td class="classstat1">2</td>
          <td class="classstat3" style="width: 200px;">
            <div class="barracla classstat4"></div>
            <a href="game.php?page=raport&amp;mode=battlehall&amp;raport=def456" target="_blank">
              <span style="color:#FF0000">Scout</span> VS <span style="color:#00FF00">AhMisty</span>
            </a>
          </td>
          <td class="classstat8" style="text-align: center;width: 190px;">
            <div class="barracla" style="float: left;"></div>02.01.2026 08:30:00
            <div class="barracla" style=""></div>
          </td>
          <td class="classstat10" style="text-align: right;width: 185px;">42</td>
        </tr>
      </tbody>
    </table>
  `

export const battleHallRowWithoutReportLink = `
    <table class="tablesorter ally_ranks tabstatistica">
      <tr class="torneo4"><th><a href="game.php?page=battleHall&amp;order=date&amp;sort=DESC">Date</a></th></tr>
      <tr class="classificabarra">
        <td class="classstat1">1</td>
        <td class="classstat3"><a href="game.php?page=battleHall">AhMisty VS Scout</a></td>
        <td class="classstat8">01.01.2026 12:00:00</td>
        <td class="classstat10">1.234</td>
      </tr>
    </table>
  `

export const notesPage = `
    <form action="game.php?page=notes&amp;mode=delete" method="post">
    <table class="tablesorter ally_ranks tabstatistica">
      <tbody>
        <tr class="torneo4">
          <th style="width: 55px;">Delete</th>
          <th style="width:155px;">Date</th>
          <th style="width:110px;">Subject</th>
          <th style="width: 320px;">Size</th>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3" style="text-align: left;"><input style="height:10px;" name="delmes[4]" type="checkbox"></td>
          <td class="classstat8" style="text-align: left;">01.01.2026 12:00:00</td>
          <td class="classstat8" style="text-align: left;">
            <a href="game.php?page=notes&amp;mode=detail&amp;id=4">
              <span style="color:red">Buy list</span>
            </a>
          </td>
          <td class="classstat8 tooltip" style="text-align: right;">1.024</td>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3" style="text-align: left;"><input style="height:10px;" name="delmes[9]" type="checkbox"></td>
          <td class="classstat8" style="text-align: left;">02.01.2026 09:15:00</td>
          <td class="classstat8" style="text-align: left;">
            <a href="game.php?page=notes&amp;mode=detail&amp;id=9">
              <span style="color:lime">Spy times</span>
            </a>
          </td>
          <td class="classstat8 tooltip" style="text-align: right;">37</td>
        </tr>
      </tbody>
    </table>
    </form>
  `

export const notesWithoutDeleteForm = '<div id="ally_content"></div>'

export const ticketOverviewPage = `
    <div class="gray_flettab">Support <a href="game.php?page=ticket&amp;mode=create" class="tornaindietroa">New ticket</a></div>
    <a href="game.php?page=ticket&amp;mode=view&amp;id=4" class="ticket_row_linck">
        <span class="ticket_row_linck_id">#4</span>
        <span class="ticket_row_linck_subject">Cannot build</span>
        <span class="ticket_row_linck_time">01.01.2026 12:00:00</span>
        <span class="ticket_row_linck_status" style="color:orange">Response</span>
        <span class="clear"></span>
    </a>
    <a href="game.php?page=ticket&amp;mode=view&amp;id=9" class="ticket_row_linck">
        <span class="ticket_row_linck_id">#9</span>
        <span class="ticket_row_linck_subject">Wrong language</span>
        <span class="ticket_row_linck_time">02.01.2026 09:15:00</span>
        <span class="ticket_row_linck_status" style="color:green">Open</span>
        <span class="clear"></span>
    </a>
  `

export const ticketWithoutControls = '<div class="gray_flettab">Support</div>'

export const ticketCreateForm = `
    <form action="game.php?page=ticket&mode=send" method="post" id="form">
        <input type="hidden" name="id" value="0">
        <select id="category" name="category">
            <option></option>
            <option>Error</option>
            <option>Bug</option>
            <option>Language error</option>
        </select>
        <textarea class="ticket_message_send_text" id="message" name="message"></textarea>
        <button type="submit" class="rexx12">Submit</button>
    </form>
  `

export const ticketCreateFormWithoutCategory =
  '<form action="game.php?page=ticket&mode=send"></form>'

export const ticketViewPage = `
    <div class="ticket_message ticket_message_owner">
        <div class="ticket_message_head">
            <span class="ticket_message_head_name">AhMisty</span>
            [01.01.2026 12:00:00]
        </div>
        <div class="ticket_message_text">
            I cannot build the robotics factory.
        </div>
    </div>
    <div class="ticket_message">
        <div class="ticket_message_head">
            <span class="ticket_message_head_name">Admin</span>
            [02.01.2026 09:30:00]
        </div>
        <div class="ticket_message_text">
            The requirements are met now.
        </div>
    </div>
    <div class="clear"></div>
    <form action="game.php?page=ticket&mode=send" method="post" id="form">
        <input type="hidden" name="id" value="4">
        <textarea class="ticket_message_send_text" id="message" name="message" rows="60" cols="8"></textarea>
        <div class="fleettab1" style="height: 32px;">
            <button type="submit" class="rexx12">Submit</button>
        </div>
    </form>
  `

export const ticketViewClosed = `
    <div class="ticket_message ticket_message_owner">
        <div class="ticket_message_head"><span class="ticket_message_head_name">AhMisty</span> [01.01.2026 12:00:00]</div>
        <div class="ticket_message_text">I cannot build.</div>
    </div>
  `

export const buddyListPage = `
    <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom: 5px;">
      <tbody>
        <tr class="classificabarra">
          <td class="classstat3"><a href="#" onclick="return Dialog.PM(7);">Scout</a></td>
          <td class="classstat8"><a href="game.php?page=alliance&amp;mode=info&amp;id=3">Void Runners</a></td>
          <td class="classstat8"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></td>
          <td class="classstat8">Please be my buddy</td>
          <td class="classstat8">
            <a href="game.php?page=buddyList&amp;mode=accept&amp;id=11" style="width: auto;float: right;"><img src="styles/theme/nsc/img/general/true.png"></a>
            <a href="game.php?page=buddyList&amp;mode=delete&amp;id=11" style="width: auto;float: right;"><img src="styles/theme/nsc/img/general/false.png"></a>
          </td>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3"><a href="#" onclick="return Dialog.PM(8);">Pilot</a></td>
          <td class="classstat8">-</td>
          <td class="classstat8"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:4]</a></td>
          <td class="classstat8 tooltip">Waiting for an answer</td>
          <td class="classstat8"><a href="game.php?page=buddyList&amp;mode=delete&amp;id=12" style="width: auto;float: right;"><img src="styles/theme/nsc/img/general/false.png"></a></td>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3"><a href="#" onclick="return Dialog.PM(9);">Navigator</a></td>
          <td class="classstat8"><a href="game.php?page=alliance&amp;mode=info&amp;id=4">Traders</a></td>
          <td class="classstat8"><a href="game.php?page=galaxy&amp;galaxy=2&amp;system=5">[2:5:1]</a></td>
          <td class="classstat8 tooltip">
            <span style="color:yellow">12  min</span>
          </td>
          <td class="classstat8"><a href="game.php?page=buddyList&amp;mode=delete&amp;id=13" style="width: auto;float: right;"><img src="styles/theme/nsc/img/general/false.png"></a></td>
        </tr>
      </tbody>
    </table>
  `

export const banListPage = `
    <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom: 5px;">
      <tbody>
        <tr class="torneo4">
          <th style="width:170px;">From</th>
          <th style="width:155px;">Until</th>
          <th style="width:110px;">Player</th>
          <th style="width:125px;">By</th>
          <th style="width:75px;">Reason</th>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3">01.01.2026 12:00:00</td>
          <td class="classstat8">08.01.2026 12:00:00</td>
          <td class="classstat8">Scout</td>
          <td class="classstat8"><a href="mailto:admin@example.com" title="Mail to AhMisty">AhMisty</a></td>
          <td class="classstat8">Multi account</td>
        </tr>
        <tr class="classificabarra">
          <td class="classstat3">02.01.2026 08:00:00</td>
          <td class="classstat8">02.01.2026 20:00:00</td>
          <td class="classstat8">Pilot</td>
          <td class="classstat8"><a href="mailto:mod@example.com" title="Mail to Moderator">Moderator</a></td>
          <td class="classstat8">Insults</td>
        </tr>
      </tbody>
    </table>
    <div class="fleettab1" style="height:21px;">
      <div class="message_page_navigation" style="color: #ccc; padding: 4px 6px;">Page:
        <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=1">&laquo;</a>
        <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=1">1</a>
        <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=2"><span class="active_page">2</span></a>
        <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=3">3</a>
        <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=3">&raquo;</a>
      </div>
    </div>
  `

export const banListWithoutContactLink = `
    <table class="tablesorter ally_ranks tabstatistica">
      <tbody>
        <tr class="classificabarra">
          <td class="classstat3">01.01.2026 12:00:00</td>
          <td class="classstat8">08.01.2026 12:00:00</td>
          <td class="classstat8">Scout</td>
          <td class="classstat8">AhMisty</td>
          <td class="classstat8">Multi account</td>
        </tr>
      </tbody>
    </table>
  `

export const banListEmpty = `
    <table class="tablesorter ally_ranks tabstatistica">
      <tbody>
        <tr class="classificabarra">
          <td colspan="5" class="classstat3">There are no banned players.</td>
        </tr>
      </tbody>
    </table>
  `

export const helpIndexPage = `
    <table>
        <tr><th>FAQ overview</th></tr>
        <tr>
            <td class="left"><h2>Gameplay</h2>
            <ul>
                <li><a href="game.php?page=questions&amp;mode=single&amp;categoryID=1&amp;questionID=2">How do I build a mine?</a></li>
                <li><a href="game.php?page=questions&amp;mode=single&amp;categoryID=1&amp;questionID=3">Why is my fleet gone?</a></li>
            </ul>
            </td>
        </tr>
    </table>
  `

export const helpAnswerPage = `
    <table>
        <tr><th>FAQ overview</th></tr>
        <tr><th>How do I build a mine?</th></tr>
        <tr>
            <td class="left">
            Open the buildings page and click the mine.
            </td>
        </tr>
        <tr><th><a href="game.php?page=questions">Back</a></th></tr>
    </table>
  `

export const noteDetailForm = `
    <form action="?page=notes&amp;mode=insert" method="post">
        <input type="hidden" name="id" value="4">
        <table class="tablesorter ally_ranks">
            <tbody>
                <tr>
                    <td>
                        <label for="priority">Priority:</label>
                        <select name="priority" id="priority">
                            <option value="2">Important</option>
                            <option value="1" selected="selected">Normal</option>
                            <option value="0">Unimportant</option>
                        </select>
                    </td>
                    <td>
                        <label for="title">Subject:</label>
                        <input id="title" placeholder="Title" name="title" size="30" maxlength="30" value="Buy list" type="text">
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <textarea name="text" placeholder="Text" id="text" cols="60" rows="10">Metal: 500 Crystal: 300</textarea>
                    </td>
                </tr>
            </tbody>
        </table>
        <button type="submit" class="rexx12">Save</button>
    </form>
  `

export const noteDetailOfAnotherNote = `
    <form action="?page=notes&amp;mode=insert" method="post">
        <input type="hidden" name="id" value="9">
        <select name="priority" id="priority"><option value="1" selected="selected">Normal</option></select>
        <input id="title" name="title" value="Other note" type="text">
        <textarea name="text" id="text">Other text</textarea>
    </form>
  `

export const searchPlayerResults = `
    <table style="width:760px" id="resulttable">
      <tr>
        <th>Name</th>
        <th>&nbsp;</th>
        <th>Alliance</th>
        <th>Planet</th>
        <th>Coordinates</th>
        <th>Position</th>
      </tr>
      <tr>
        <td><a href="#" onclick="return Dialog.Playercard(4242);">AhMisty</a></td>
        <td><a href="#" onclick="return Dialog.PM(4242);" title="Write message"><img src="styles/theme/nsc/img/m.gif"/></a>&nbsp;<a href="#" onclick="return Dialog.Buddy(4242);" title="Buddy request"><img src="styles/theme/nsc/img/b.gif" border="0"></a></td>
        <td><a href="game.php?page=alliance&amp;mode=info&amp;id=7">Void Runners</a></td>
        <td>Homeworld</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">[1:2:3]</a></td>
        <td>12</td>
      </tr>
      <tr>
        <td><a href="#" onclick="return Dialog.Playercard(77);">Scout</a></td>
        <td><a href="#" onclick="return Dialog.PM(77);" title="Write message"><img src="styles/theme/nsc/img/m.gif"/></a></td>
        <td>-</td>
        <td>Outpost</td>
        <td><a href="game.php?page=galaxy&amp;galaxy=2&amp;system=5">[2:5:1]</a></td>
        <td>98</td>
      </tr>
    </table>
  `

export const searchAllianceResults = `
    <table style="width:760px" id="resulttable">
      <tr>
        <th>Tag</th>
        <th>Name</th>
        <th>Members</th>
        <th>Points</th>
      </tr>
      <tr>
        <td><a href="game.php?page=alliance&amp;mode=info&amp;tag=VOID">VOID</a></td>
        <td>Void Runners</td>
        <td>12</td>
        <td>1.234.567</td>
      </tr>
    </table>
  `

export function autocompleteSuggestionsPayload(): string {
  const payload = [
    { label: 'Ah<b>Bo</b>by', category: 'Player name', type: 'playername' },
    { label: 'Bo<b>Bo</b>land', category: 'Planet name', type: 'planetname' },
    { label: 'BOL', category: 'Alliance tag', type: 'allytag' },
    { label: '<b>Bo</b>lts', category: 'Alliance name', type: 'allyname' },
  ]
  return JSON.stringify(payload)
}

export const playerCardPage = `
    <div class="conteiner player_card" style="width:auto;">
      <div class="gray_stripo">About Player</div>
      <div class="row" style="padding: 7px">
        <div class="col-md-12">
          <div class="card background-border-black-gray shadow">
            <div class="card-body">
              <div class="row" style="align-items: center; ">
                <div class="col-2">
                  <img src="https://images.example/a.png" class="img-fluid float-start opacity-70 border-radius-50">
                </div>
                <div class="col-10">
                  <div class="card">
                    <div class="card-body">
                      <p class="card-title" style="font-size: 20px;">
                        AhMisty
                        [<a href="#" onclick="parent.location = 'game.php?page=alliance&amp;mode=info&amp;id=7';return false;" class="playercrd17">Void Runners</a>]
                      </p>
                      <p class="card-title">
                        <a href="#" onclick="parent.location = 'game.php?page=galaxy&amp;galaxy=1&amp;system=2';return false;">Homeworld [1:2:3]</a>
                      </p>
                      <p class="card-title">Europe/Berlin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-12">
          <div class="card mt-1 background-border-black-gray shadow">
            <div class="card-body">
              <div class="row" style="align-items: center; ">
                <div class="col-6">
                  <div class="card mr-1 background-border-black-blue shadow">
                    <div class="card-body">
                      <p class="card-title text-align-center">Statistics</p>
                      <table class="tablesorter ally_ranks playercard_tables">
                        <tbody>
                          <tr class="playercrd2">
                            <td style="text-align: left;">Buildings</td>
                            <td>12.345</td>
                            <td style="font-weight:bold">#7</td>
                          </tr>
                          <tr class="playercrd2">
                            <td style="text-align: left;">Research</td>
                            <td>2.000</td>
                            <td style="font-weight:bold">#12</td>
                          </tr>
                          <tr class="playercrd2">
                            <td style="text-align: left;">Total</td>
                            <td>18.545</td>
                            <td style="font-weight:bold">#6</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="card background-border-black-blue shadow">
                    <div class="card-body">
                      <p class="card-title text-align-center">Fight Stats</p>
                      <div class="row">
                        <div class="col-4">
                          <p class="alleanza_zone">Won<br><span class="card-text">10 (50%)</span></p>
                        </div>
                        <div class="col-4">
                          <p class="alleanza_zone">Lost<br><span class="card-text">8 (40%)</span></p>
                        </div>
                        <div class="col-4">
                          <p class="alleanza_zone">Drawn<br><span class="card-text">2 (10%)</span></p>
                        </div>
                      </div>
                      <p class="card-text">Total fights <span style="float: right;">20</span></p>
                      <p class="card-text mb-3">Damage Coefficient <span style="float: right;">1.5</span></p>
                      <div class="alleanza12 tooltip" data-tooltip-content="Units Killed 5.000" style="width:60%"></div>
                      <div class="alleanza13 tooltip" data-tooltip-content="Units Lost 3.000" style="width:40%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
