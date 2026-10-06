const UNIVERSE_PICKER =
  '<select name="universe" id="universe" class="form-control changeUni">' +
  '<option value="42" selected="selected">Universe One</option>' +
  '<option value="43">Universe Two</option>' +
  '</select>'

const CHANGE_ACTION_PICKER =
  '<select name="uni" id="universe" class="form-control changeAction">' +
  '<option value="42" selected="selected">Universe One</option>' +
  '<option value="43">Universe Two</option>' +
  '</select>'

export const REFUSAL_CARD_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Information</h5>
        <div class="card-body">
            <p class="card-text">Wrong password</p>
        </div>
    </div>
</main>`

export const BAN_LIST_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Ban list</h5>
        <div class="card-body">
        <p>${UNIVERSE_PICKER}</p>
            <table class="table table-dark table-hover">
            <small>
                <thead>
                    <tr>
                        <th>From</th>
                        <th>Until</th>
                        <th>Player</th>
                        <th>By</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>01.03.2024 10:00</td>
                        <td>08.03.2024 10:00</td>
                        <td>Rulebreaker</td>
                        <td><a href="mailto:admin@example.com" title="Write admin@example.com a mail">AdminBob</a></td>
                        <td>Multi accounts</td>
                    </tr>
                    <tr>
                        <td>02.03.2024 18:30</td>
                        <td>09.03.2024 18:30</td>
                        <td>Bashbot</td>
                        <td><a href="mailto:admin.ann@example.com" title="Write admin.ann@example.com a mail">AdminAnn</a></td>
                        <td>Bashing</td>
                    </tr>
                    <tr>
                        <td colspan="5">Players banned: 7 accounts banned</td>
                    </tr>
                </tbody>
            </small>
            </table>
        </div>
        <div class="card-footer text-center">
            <div class="btn-group mr-2" role="group" aria-label="First group">
                <a href="index.php?page=banList&amp;side=1">
                    <button type="button" class="btn btn-secondary">Prev</button>
                </a>
                <a href="index.php?page=banList&amp;side=1">
                    <button type="button" class="btn btn-secondary">1</button>
                </a>
                <a href="#" onclick="false;">
                    <button type="button" class="btn btn-secondary active">2</button>
                </a>
                <a href="index.php?page=banList&amp;side=3">
                    <button type="button" class="btn btn-secondary">Next</button>
                </a>
            </div>
        </div>
    </div>
</main>`

export const BAN_LIST_EMPTY_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Ban list</h5>
        <div class="card-body">
        <p>${UNIVERSE_PICKER}</p>
            <table class="table table-dark table-hover">
            <small>
                <thead>
                    <tr>
                        <th>From</th>
                        <th>Until</th>
                        <th>Player</th>
                        <th>By</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="5">No players are banned.</td>
                    </tr>
                </tbody>
            </small>
            </table>
        </div>
    </div>
</main>`

export const BATTLE_HALL_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Battle hall</h5>
        <div class="card-body">
        <p>${UNIVERSE_PICKER}</p>
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Sides</th>
                        <th>Date</th>
                        <th>Units</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>
                            <span style="color:#00FF00">Attacker One</span><span style="color:#FFFFFF"><b> VS </b></span><span style="color:#FF0000">Defender One</span>
                        </td>
                        <td>17.03.2024 20:15:00</td>
                        <td>1.234.567</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>
                            <span style="color:#FF0000">Attacker Two</span><span style="color:#FFFFFF"><b> VS </b></span><span style="color:#00FF00">Defender Two</span>
                        </td>
                        <td>18.03.2024 09:30:00</td>
                        <td>987.654</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>
                            Gamma<b> VS </b>Delta
                        </td>
                        <td>19.03.2024 12:00:00</td>
                        <td>12.345</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="card-footer text-center">
            <p>Legend<span style="color:#00FF00">Winner</span><span style="color:#FF0000">Loser</span></p>
        </div>
    </div>
</main>`

export const DISCLAMER_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Disclaimer</h5>
        <div class="card-body">
            <div class="row">
                <address class="col-lg-6">
                    <strong>Address</strong><br>
                    Example Street 1<br>
Example City
                </address>
                <address class="col-lg-6">
                    <strong>Phone</strong><br>
                    +49 30 123456
                </address>
            </div>
            <div class="row">
                <address class="col-lg-6">
                    <strong>Mail</strong><br>
                    <a href="support@example.com">support@example.com</a>
                </address>
                <address class="col-lg-6">
                    <strong>Notice</strong><br>
                    This installation is a private test server.
                </address>
            </div>
        </div>
    </div>
</main>`

export const DISCLAMER_EMPTY_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Disclaimer</h5>
        <div class="card-body">
            <div class="row">
                <address class="col-lg-6">
                    <strong>Address</strong><br>

                </address>
                <address class="col-lg-6">
                    <strong>Phone</strong><br>

                </address>
            </div>
            <div class="row">
                <address class="col-lg-6">
                    <strong>Mail</strong><br>
                    <a href=""></a>
                </address>
                <address class="col-lg-6">
                    <strong>Notice</strong><br>

                </address>
            </div>
        </div>
    </div>
</main>`

export const INDEX_BODY: string = `<main role="main" class="container">
    <div class="jumbotron mb-3">
        <h1>Welcome to Universe One</h1>
        <p class="lead">A test installation.</p>
        <a class="btn btn-lg btn-primary" href="/index.php?page=register" role="button">Register</a>
    </div>
    <div class="row">
        <div class="col-md-4">
            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <form id="login" name="login" action="index.php?page=login" data-action="index.php?page=login" method="post">
                        <div class="form-group">
                            <label for="universe">Universe</label>
                            ${CHANGE_ACTION_PICKER}
                        </div>
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" class="form-control" name="username" id="username" placeholder="Username">
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" class="form-control" name="password" id="password" placeholder="Password">
                        </div>
                        <div style="text-align: right;">
                            <button type="submit" class="btn btn-primary">Login</button>
                        </div>
                    </form>
                    <div style="text-align: center">
                        <a href="index.php?page=register">Register</a> - <a href="index.php?page=lostPassword">Lost password</a>
                        <br>
                        <span class="small">By logging in you accept the <a href="index.php?page=rules">rules</a>.</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Screenshots</h5>
                    <p class="card-text">Impressions of the game.</p>
                    <div style="text-align: right">
                        <a href="/index.php?page=screens">
                            <button type="button" class="btn btn-success">Screenshots</button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">News</h5>
                    <p class="card-text">Maintenance on Sunday.</p>
                    <div style="text-align: right">
                        <a href="/index.php?page=news">
                            <button type="button" class="btn btn-success">News</button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>
<script>alert("Wrong password");</script>`

export const LOST_PASSWORD_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Lost password</h5>
        <div class="card-body">
            <p class="card-text">Enter the account name and the mail address it was registered with.</p>
            <form action="index.php?page=lostPassword" method="post" data-action="index.php?page=lostPassword" >
                <input type="hidden" value="send" name="mode">
                <div class="form-group">
                    <label for="universe">Universe</label>
                    ${CHANGE_ACTION_PICKER}
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" class="form-control" name="username" id="username" placeholder="Username">
                </div>
                <div class="form-group">
                    <label for="mail">Mail</label>
                    <input type="email" class="form-control" name="mail" id="mail" placeholder="Mail">
                </div>
                <div style="text-align: right;">
                    <button type="submit" class="btn btn-danger">Send</button>
                </div>
            </form>
        </div>
    </div>
</main>`

export const LOST_PASSWORD_CAPTCHA_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Lost password</h5>
        <div class="card-body">
            <p class="card-text">Enter the account name and the mail address it was registered with.</p>
            <form action="index.php?page=lostPassword" method="post" data-action="index.php?page=lostPassword" >
                <input type="hidden" value="send" name="mode">
                <div class="form-group">
                    <label for="universe">Universe</label>
                    ${CHANGE_ACTION_PICKER}
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" class="form-control" name="username" id="username" placeholder="Username">
                </div>
                <div class="form-group">
                    <label for="mail">Mail</label>
                    <input type="email" class="form-control" name="mail" id="mail" placeholder="Mail">
                </div>
                <div class="formRow" id="captchaRow">
                    <div>
                        <label>Captcha<p class="captchaButtons"></p></label>
                        <div class="g-recaptcha" data-sitekey="6Lc-password-key"></div>
                    </div>
                <div class="clear"></div>
                </div>
                <div style="text-align: right;">
                    <button type="submit" class="btn btn-danger">Send</button>
               </div>
            </form>
        </div>
    </div>
</main>
<script type="text/javascript" src="https://www.google.com/recaptcha/api.js?hl=en"></script>`

export const NEWS_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">News</h5>
        <div class="card-body">
            <p class="card-text"><a href="#1">Server move </a><a href="#2">Downtime</a></p>
        </div>
    </div>
    <div class="row">
        <div id="1" class="col-md-4">
            <div class="card mb-4 shadow-sm">
                <img src="./styles/resource/images/login/news/1.jpg" class="card-img img-thumbnail bg-primary border-primary" alt="Server move">
                <div class="card-body">
                    <h5 class="card-title">Server move</h5>
                    <p class="card-text overflow-auto" style="max-width: 1000px; max-height: 150px;">The server moved<br>
to a new host.</p>
                    <p class="card-text"><small class="text-muted">17.03.2024 12:00 - AdminBob</small></p>
                </div>
            </div>
        </div>
        <div id="2" class="col-md-4">
            <div class="card mb-4 shadow-sm">
                <img src="./styles/resource/images/login/news/2.jpg" class="card-img img-thumbnail bg-primary border-primary" alt="Downtime">
                <div class="card-body">
                    <h5 class="card-title">Downtime</h5>
                    <p class="card-text overflow-auto" style="max-width: 1000px; max-height: 150px;"></p>
                    <p class="card-text"><small class="text-muted">18.03.2024 09:00 - AdminAnn</small></p>
                </div>
            </div>
        </div>
    </div>
</main>`

export const REGISTER_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Register</h5>
        <div class="card-body">
            <form id="registerForm" method="post" action="index.php?page=register" data-action="index.php?page=register">
                <input type="hidden" value="send" name="mode">
                <input type="hidden" value="uid-1" name="externalAuth[account]">
                <input type="hidden" value="facebook" name="externalAuth[method]">
                <input type="hidden" value="9" name="referralID">
                <div class="form-group">
                    <label for="universe">Choose a universe</label>
                    ${CHANGE_ACTION_PICKER}
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" class="form-control" name="username" id="username" placeholder="Username">
                    <span class="inputDesc"><small>3 to 15 characters.</small></span>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" class="form-control" name="password" id="password" placeholder="Password">
                    <span class="inputDesc"><small>At least six characters.</small></span>
                </div>
                <div class="form-group">
                    <label for="passwordReplay">Repeat password</label>
                    <input type="password" class="form-control" name="passwordReplay" id="passwordReplay" placeholder="Repeat password">
                    <span class="inputDesc"><small>Once more.</small></span>
                </div>
                <div class="form-group">
                    <label for="email">Mail</label>
                    <input type="email" class="form-control" name="email" id="email" placeholder="Mail">
                    <span class="inputDesc"><small>A reachable address.</small></span>
                </div>
                <div class="form-group">
                    <label for="emailReplay">Repeat mail</label>
                    <input type="email" class="form-control" name="emailReplay" id="emailReplay" placeholder="Repeat mail">
                    <span class="inputDesc"><small>Once more.</small></span>
                </div>
                <div class="form-group">
                    <label for="language">Language</label>
                    <select name="lang" id="language" class="form-control"><option value="en" selected="selected">English</option><option value="de">German</option></select>
                </div>
                <div class="form-group">
                    <label for="username">Referral</label>
                    <span class="inputDesc">AhMisty</span>
                </div>
                <div class="rowForm" id="captchaRow">
                    <div>
                        <label>Captcha</label>
                        <div class="g-recaptcha" data-sitekey="6Lc-register-key"></div>
                    </div>
                </div>
                <div class="form-group checkbox">
                    <input type="checkbox" name="rules" id="rules" value="1"> I accept the rules.
                </div>
                <div style="text-align: right;">
                    <button type="submit" class="btn btn-danger">Register</button>
                </div>
            </form>
        </div>
    </div>
</main>`

export const REGISTER_MINIMAL_BODY: string = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Register</h5>
        <div class="card-body">
            <form id="registerForm" method="post" action="index.php?page=register" data-action="index.php?page=register">
                <input type="hidden" value="send" name="mode">
                <input type="hidden" value="0" name="externalAuth[account]">
                <input type="hidden" value="" name="externalAuth[method]">
                <input type="hidden" value="" name="referralID">
                <div class="form-group">
                    <label for="universe">Choose a universe</label>
                    ${CHANGE_ACTION_PICKER}
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" class="form-control" name="username" id="username" placeholder="Username">
                    <span class="inputDesc"><small>3 to 15 characters.</small></span>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" class="form-control" name="password" id="password" placeholder="Password">
                    <span class="inputDesc"><small>At least six characters.</small></span>
                </div>
                <div class="form-group">
                    <label for="passwordReplay">Repeat password</label>
                    <input type="password" class="form-control" name="passwordReplay" id="passwordReplay" placeholder="Repeat password">
                    <span class="inputDesc"><small>Once more.</small></span>
                </div>
                <div class="form-group">
                    <label for="email">Mail</label>
                    <input type="email" class="form-control" name="email" id="email" placeholder="Mail">
                    <span class="inputDesc"><small>A reachable address.</small></span>
                </div>
                <div class="form-group">
                    <label for="emailReplay">Repeat mail</label>
                    <input type="email" class="form-control" name="emailReplay" id="emailReplay" placeholder="Repeat mail">
                    <span class="inputDesc"><small>Once more.</small></span>
                </div>
                <div class="form-group checkbox">
                    <input type="checkbox" name="rules" id="rules" value="1"> I accept the rules.
                </div>
                <div style="text-align: right;">
                    <button type="submit" class="btn btn-danger">Register</button>
                </div>
            </form>
        </div>
    </div>
</main>`

export const RULES_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Rules</h5>
        <div class="card-body">
            <p class="card-text"><ul id="rules">
                <li>Do not cheat.</li>
                <li>One account per player.</li>
            </ul></p>
        </div>
    </div>
</main>`

export const SCREENS_BODY = `<main role="main" class="container">
    <div class="card mb-3">
        <h5 class="card-header">Screenshots</h5>
        <div class="card-body">
            <div class="row">
                <div class="col-lg-2 mb-3">
                    <a class="gallery" href="./styles/resource/images/login/screens/1.jpg" target="_blank" rel="gallery">
                        <img src="./styles/resource/images/login/screens/thumbnails/1.jpg" alt="" width="120" height="120" class="img-thumbnail bg-primary border-primary">
                    </a>
                </div>
                <div class="col-lg-2 mb-3">
                    <a class="gallery" href="./styles/resource/images/login/screens/2.jpg" target="_blank" rel="gallery">
                        <img src="./styles/resource/images/login/screens/2.jpg" alt="" width="120" height="120" class="img-thumbnail bg-primary border-primary">
                    </a>
                </div>
            </div>
        </div>
    </div>
</main>
<script>
$(function() {
    $(".gallery").fancybox();
});
</script>`

export const BATTLE_HALL_GAME_BODY = `<div id="page">
    <div id="content">
        <div id="ally_content" class="conteinership" style="margin-bottom: 15px;">
            <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom:5px">
                <tbody>
                    <tr class="torneo4">
                        <th style="width: 45px;min-width: 45px;">Rank</th>
                        <th style="text-align: center;min-width: 215px;width: 215px;">Sides</th>
                        <th style="text-align:center;width: 185px;"><a href="game.php?page=battleHall&order=date&sort=DESC" style="font-weight:bold;">Date</a></th>
                        <th style="text-align:right;width: 200px;"><a href="game.php?page=battleHall&order=units&sort=DESC">Units</a></th>
                    </tr>
                    <tr class="day0 week0 classificabarra">
                        <td class="classstat1">1</td>
                        <td class="classstat3" style="width: 200px;max-width: 200px;min-width: 200px;">
                            <div class="barracla classstat4"></div>
                            <a href="game.php?page=raport&amp;mode=battlehall&amp;raport=5" target="_blank">
                                <span style="color:#00FF00">Attacker One</span> VS <span style="color:#FF0000">Defender One</span>
                            </a>
                        </td>
                        <td class="classstat8" style="text-align: center;width: 190px;max-width: 190px;min-width: 190px;">
                            <div class="barracla" style="float: left;"></div>17.03.2024 20:15:00
                            <div class="barracla" style=""></div>
                        </td>
                        <td class="classstat10" style="text-align: right;width: 185px;min-width: 185px;">1.234.567</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>`

export const BAN_LIST_GAME_BODY = `<div id="page">
    <div id="content">
        <div id="ally_content" class="conteinership">
            <div class="gray_flettab" style="padding-right:0;">Players banned
            <span class="tornaindietro" style="height: 14px;line-height: 14px;">Players banned: 7 accounts banned</span>
            </div>
            <div class="fleettab8" style="margin-bottom: 0;"></div>
            <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom: 5px;">
                <tbody>
                    <tr class="torneo4">
                        <th style="width:170px;min-width:170px;">From</th>
                        <th style="width:155px;min-width:155px;">Until</th>
                        <th style="width:110px;min-width:110px;text-align: left;">Player</th>
                        <th style="width:125px;min-width:125px;text-align: left;">By</th>
                        <th style="width:75px;min-width:75px;">Reason</th>
                    </tr>
                    <tr class="classificabarra">
                        <td class="classstat3" style="text-align: left;width: 160px;">01.03.2024 10:00</td>
                        <td class="classstat8" style="text-align: left;width: 160px;">08.03.2024 10:00</td>
                        <td class="classstat8" style="text-align: left;width: 110px;">Rulebreaker</td>
                        <td class="classstat8" style="text-align: left;width: 110px;"><a href="mailto:admin@example.com" title="Write admin@example.com a mail">AdminBob</a></td>
                        <td class="classstat8" style="text-align: right;width: 100px;">Multi accounts</td>
                    </tr>
                </tbody>
            </table>
            <div class="alleanza57"></div>
            <div class="fleettab1" style="height:21px;">
                <div class="message_page_navigation" style="color: #ccc; padding: 4px 6px;">Page:
                    <a class="messagesnew2 messagesnew3" href="game.php?page=banList&amp;side=1"><span class="active_page">1</span></a>
                </div>
            </div>
        </div>
    </div>
</div>`
