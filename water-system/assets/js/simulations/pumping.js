export const pumping = {
  init(root){
    const CONSTANTS = {
      RHO_KG_M3: 1000,
      G_M_S2: 9.81,
      TANK_CAPACITY_L: 5000,
      MIN_FLOW_LPM: 2,
      BASE_RATED_HEAD_M: 110,
      CHART_WINDOW_S: 90
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const fmt = (v, digits = 1) => Number.isFinite(v) ? v.toFixed(digits) : '—';

    const state = {
      depthM: 40,
      powerW: 900,
      effPct: 62,
      pumpedL: 0
    };

    root.innerHTML = `
      <div class="sim-title-row">
        <div>
          <div class="sim-kicker">Simulation 1</div>
          <div class="sim-title">Water Pumping System</div>
        </div>
        <div class="sim-subtitle mono">P = ρ·g·h·Q/η</div>
      </div>

      <div class="sim-grid">
        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Inputs</div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="depth">Well depth</label>
                <div class="control__value"><span id="depthVal" class="mono"></span> m</div>
              </div>
              <input id="depth" class="range" type="range" min="5" max="180" step="1" value="40" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="power">Pump electrical power</label>
                <div class="control__value"><span id="powerVal" class="mono"></span> W</div>
              </div>
              <input id="power" class="range" type="range" min="150" max="2200" step="10" value="900" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="eff">Pump efficiency</label>
                <div class="control__value"><span id="effVal" class="mono"></span> %</div>
              </div>
              <input id="eff" class="range" type="range" min="20" max="85" step="1" value="62" />
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Outputs</div>
            <div class="metrics">
              <div class="metric">
                <div class="metric__label">Flow rate</div>
                <div class="metric__value"><span id="flowVal" class="mono"></span> <span class="muted">L/min</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Total pumped</div>
                <div class="metric__value"><span id="pumpedVal" class="mono"></span> <span class="muted">L</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Pump status</div>
                <div class="metric__value"><span id="statusBadge" class="badge"></span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Stress indicator</div>
                <div class="metric__value"><span id="stressVal" class="mono"></span> <span class="muted">(0–1)</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Visualization</div>
            <div class="pumping-viz">
              <div class="well" aria-label="Well and rising water">
                <div class="well__label">Well</div>
                <div class="well__shaft">
                  <div id="wellWater" class="well__water"></div>
                  <div id="pipe" class="pipe"></div>
                </div>
              </div>

              <div class="tank" aria-label="Storage tank filling">
                <div class="tank__label">Tank</div>
                <div class="tank__shell">
                  <div id="tankFill" class="tank__fill"></div>
                  <div class="tank__ticks">
                    <div class="tank__tick" style="bottom:25%"></div>
                    <div class="tank__tick" style="bottom:50%"></div>
                    <div class="tank__tick" style="bottom:75%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Flow history</div>
            <canvas id="chart" height="130"></canvas>
            <div class="muted" style="margin-top:8px">Window: last ${CONSTANTS.CHART_WINDOW_S}s</div>
          </div>
        </section>
      </div>
    `;

    const $ = (sel) => root.querySelector(sel);
    const depthEl = $('#depth');
    const powerEl = $('#power');
    const effEl = $('#eff');
    const depthValEl = $('#depthVal');
    const powerValEl = $('#powerVal');
    const effValEl = $('#effVal');
    const flowValEl = $('#flowVal');
    const pumpedValEl = $('#pumpedVal');
    const statusBadgeEl = $('#statusBadge');
    const stressValEl = $('#stressVal');
    const tankFillEl = $('#tankFill');
    const wellWaterEl = $('#wellWater');
    const pipeEl = $('#pipe');

    function calc(){
      const depthM = Math.max(1, state.depthM);
      const eff01 = clamp(state.effPct / 100, 0.05, 0.95);
      const powerW = Math.max(0, state.powerW);

      const ratedHeadM = CONSTANTS.BASE_RATED_HEAD_M * Math.pow(powerW / 1000, 0.55) * (eff01 / 0.6);
      const stress = clamp(depthM / Math.max(1, ratedHeadM), 0, 2);

      if (depthM > ratedHeadM * 1.12){
        return { flowLpm: 0, status: 'Overloaded', stress };
      }

      const qM3s = (powerW * eff01) / (CONSTANTS.RHO_KG_M3 * CONSTANTS.G_M_S2 * depthM);
      const flowLpm = qM3s * 60000;
      const status = flowLpm < CONSTANTS.MIN_FLOW_LPM ? 'Insufficient power' : 'Working';

      return { flowLpm, status, stress };
    }

    function setBadge(status){
      statusBadgeEl.textContent = status;
      statusBadgeEl.dataset.state = status;
    }

    function renderStatic(){
      depthValEl.textContent = String(state.depthM);
      powerValEl.textContent = String(state.powerW);
      effValEl.textContent = String(state.effPct);
    }

    function syncFromInputs(){
      state.depthM = Number(depthEl.value);
      state.powerW = Number(powerEl.value);
      state.effPct = Number(effEl.value);
      renderStatic();
    }

    depthEl.addEventListener('input', syncFromInputs);
    powerEl.addEventListener('input', syncFromInputs);
    effEl.addEventListener('input', syncFromInputs);
    renderStatic();

    const ctx = $('#chart');
    let chart = null;

    const startT = performance.now();
    let lastFrameT = startT;
    let lastSampleT = startT;
    let rafId = 0;

    const series = {
      t: [],
      flow: []
    };

    function pushSample(tS, flowLpm){
      series.t.push(tS);
      series.flow.push(flowLpm);
      while (series.t.length > CONSTANTS.CHART_WINDOW_S){
        series.t.shift();
        series.flow.shift();
      }
    }

    if (window.Chart && ctx){
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: series.t,
          datasets: [{
            label: 'Flow (L/min)',
            data: series.flow,
            borderColor: '#6be4ff',
            backgroundColor: 'rgba(107,228,255,.12)',
            fill: true,
            pointRadius: 0,
            tension: 0.28
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { labels: { color: 'rgba(255,255,255,.78)' } }
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' } },
            y: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' }, suggestedMin: 0 }
          }
        }
      });
    }

    function renderDynamic(result){
      flowValEl.textContent = fmt(result.flowLpm, 1);
      pumpedValEl.textContent = fmt(state.pumpedL, 0);
      setBadge(result.status);
      stressValEl.textContent = fmt(clamp(result.stress, 0, 1), 2);

      const fillFrac = clamp(state.pumpedL / CONSTANTS.TANK_CAPACITY_L, 0, 1);
      tankFillEl.style.height = `${fillFrac * 100}%`;

      const depthFrac = clamp(state.depthM / 180, 0.08, 1);
      wellWaterEl.style.height = `${(1 - depthFrac) * 100}%`;

      pipeEl.classList.toggle('is-flowing', result.flowLpm >= CONSTANTS.MIN_FLOW_LPM);
      pipeEl.dataset.stress = result.stress >= 0.9 ? 'high' : result.stress >= 0.7 ? 'mid' : 'low';
    }

    function loop(now){
      const dtS = Math.max(0, (now - lastFrameT) / 1000);
      lastFrameT = now;

      const result = calc();
      const pumping = result.status === 'Working';
      const flowLpm = pumping ? result.flowLpm : 0;

      state.pumpedL = Math.min(CONSTANTS.TANK_CAPACITY_L, state.pumpedL + (flowLpm * (dtS / 60)));
      renderDynamic({ ...result, flowLpm });

      if (chart && now - lastSampleT >= 1000){
        lastSampleT = now;
        const tS = Math.round((now - startT) / 1000);
        pushSample(tS, flowLpm);
        chart.update('none');
      }

      rafId = requestAnimationFrame(loop);
    }

    pushSample(0, 0);
    if (chart) chart.update('none');
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (chart) chart.destroy();
    };
  }
};
