export const buildingsPageBody = `
    <div class="fildes_band_text">Fields taken: <span>12</span> of <span>163</span> Free: <span>151</span></div>
    <div id="build_process" class="bui4era">
      <div class="element_row active_row" style="background:url(styles/theme/nsc/gebaeude/31.gif)">
        <div class="right_hand">
          <span class="onlistretit">Research Lab</span>
          <div id="time" data-time="3600"></div>
          <span class="data_scad">01.01.2026 12:00:00</span>
          <span class="onlistrenum">1</span>
          <span class="onlistremov ">5</span>
        </div>
        <div class="band_process" id="progressbar" data-time="900"></div>
      </div>
      <div class="element_row" style="background:url(styles/theme/nsc/gebaeude/23.gif)">
        <div class="right_hand">
          <span class="onlistrenum">2</span>
          <span class="onlistremov">2</span>
        </div>
      </div>
    </div>
    <script>var DatatList = {"31":{"level":"5","maxLevel":"40"},"23":{"level":"2"}};</script>
    `

export const researchPageBody = `
    <div id="build_process" class="ric4era">
      <div class="element_row active_row" style="background:url(styles/theme/nsc/gebaeude/113.gif)">
        <div class="right_hand">
          <div id="time" data-time="600"></div>
          <span class="data_scad">01.01.2026 12:10:00</span>
          <span class="onlistremov">3</span>
        </div>
        <div class="band_process" id="progressbar" data-time="600"></div>
      </div>
    </div>
    <script>
      DatatList = {
        "113":{ "id":"113","elvl":"0 ","level":"3","maxLevel":"20", "elementTime":600,"buyable":true }
      };
    </script>
    `

export function buildingsEnergyBody(): string {
  return (
    '<div class="fildes_band_text">Fields taken: <span>12</span> of <span>163</span> Free: <span>151</span></div>' +
    '<script>var DatatList = {"31":{"level":"5"}};</script>'
  )
}

export const buildingsInvalidLevelScriptBody = `
    <script>var DatatList = {"31": {"level": oops(};</script>
    `

export const researchMismatchedElementIdBody = `
    <div id="build_process" class="ric4era"></div>
    <script>DatatList = { "113":{ "id":"114","level":"3" } };</script>
    `

export const buildingsQueueWithoutRowsBody = `
    <div id="build_process" class="bui4era">
      <div class="element_row"><div class="right_hand"><span class="onlistrenum">1</span></div></div>
    </div>
    <script>var DatatList = {"31":{"level":"5"}};</script>
    `

export const buildingsWithoutQueueBody = `
    <div class="fildes_band_text">x <span>1</span> <span>2</span> <span>1</span></div>
    <script>var DatatList = {"31":{"level":"5"}};</script>
    `

export const shipyardPageBody = `
    <script>DatatList = {"202":{"id":"202","costResources":{"901":2000,"902":2000},"elementTime":1200,"maxBuildable":"12"},"203":{"id":"203","costResources":{"901":6000,"902":6000},"elementTime":3000,"maxBuildable":"0"}};</script>
    <div id="build_elements">
      <div class="build_elements">
        <div id="s_202" class="build_box"><div class="content_box">
          <div class="hang4" id="val_202"> (1.234)</div>
        </div></div>
        <div id="s_203" class="build_box"><div class="content_box">
          <div class="hang4" id="val_203"></div>
        </div></div>
      </div>
    </div>
    <script>
      data = {"Queue":[["Small Cargo",5,1200,202],["Large Cargo",2,3000,203]],
              "b_hangar_id_plus":300,"pretty_time_b_hangar":"1h"};
    </script>
    `

export const shipyardDefenseBody = `
    <script>DatatList = {"401":{"id":"401","costResources":{"901":2000},"elementTime":30,"maxBuildable":"250"}};</script>
    <div id="build_elements"><div class="build_elements">
      <div id="s_401" class="build_box"><div class="content_box">
        <div class="hang4" id="val_401"> (40)</div>
      </div></div>
    </div></div>
    <script>data = {"Queue":[["Rocket Launcher",40,30,401]],"b_hangar_id_plus":0};</script>
    `

export const shipyardEmptyQueueBody = `
    <script>DatatList = {};</script>
    <div id="build_elements"><div class="build_elements"></div></div>
    <script>data = [];</script>
    `

export const shipyardUnbracketedInventoryBody = `
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202">1.234</div>
      </div></div>
    </div></div>
    <script>data = [];</script>
    `

export const shipyardElapsedBeyondUnitBody = `
    <script>DatatList = {"202":{"costResources":{"901":2000,"902":2000},"elementTime":1200,"maxBuildable":"10"}};</script>
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202">(1)</div>
      </div></div>
    </div></div>
    <script>data = {"Queue":[["Small Cargo",1,1200,202]],"b_hangar_id_plus":5000};</script>
    `

export const shipyardZeroDurationBody = `
    <script>DatatList = {"202":{"costResources":{"901":2000,"902":2000},"elementTime":0,"maxBuildable":"10"}};</script>
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202">(1)</div>
      </div></div>
    </div></div>
    <script>data = {"Queue":[["Small Cargo",1,0,202]],"b_hangar_id_plus":0};</script>
    `

export const shipyardUnformattedQuantityBody = `
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202">(n/a)</div>
      </div></div>
    </div></div>
    <script>data = [];</script>
    `

export const buildingsEmptyLevelDataBody = `<script>var DatatList = {};</script>`

export const buildingsTwoQueueBlocksBody = `
    <div id="build_process"></div>
    <div id="build_process"></div>
    <script>var DatatList = {"31":{"level":"5"}};</script>
    `

export const buildingsQueueRemovalWithoutElementBody = `
    <div id="build_process">
      <div class="element_row"><span class="onlistremov">5</span></div>
    </div>
    <script>var DatatList = {"31":{"level":"5"}};</script>
    `

export const buildingsQueueElementWithoutLevelBody = `
    <div id="build_process">
      <div class="element_row" style="background:url(gebaeude/31.gif)"></div>
    </div>
    <script>var DatatList = {"31":{"level":"5"}};</script>
    `

export const shipyardMissingInventoryCellBody = `
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box"></div></div>
    </div></div>
    <script>data = [];</script>
    `

export const shipyardRepeatedInventoryCellBody = `
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202"> (1)</div>
      </div></div>
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202"> (2)</div>
      </div></div>
    </div></div>
    <script>data = [];</script>
    `

export const shipyardEmptyQueueObjectBody = `
    <div id="build_elements"><div class="build_elements">
      <div id="s_202" class="build_box"><div class="content_box">
        <div class="hang4" id="val_202"> (1)</div>
      </div></div>
    </div></div>
    <script>data = {"Queue":[],"b_hangar_id_plus":0,"pretty_time_b_hangar":"0s"};</script>
    `

export const shipyardShortQueueTupleBody = `
    <div id="build_elements"><div class="build_elements"></div></div>
    <script>data = {"Queue":[["Small Cargo",5,1200]],"b_hangar_id_plus":0};</script>
    `

export const shipyardUnnamedQueueTupleBody = `
    <div id="build_elements"><div class="build_elements"></div></div>
    <script>data = {"Queue":[["Small Cargo",null,1200,202]],"b_hangar_id_plus":0};</script>
    `
