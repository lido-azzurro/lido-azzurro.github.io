export const solar = {
  init(root){
    const CONSTANTS = {
      REQUIRED_PUMP_W: 900,
      CHART_MAX_POINTS: 60
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const fmt = (v, digits = 0) => Number.isFinite(v) ? v.toFixed(digits) : '—';

    const state = {
      irradiance: 700,
      area: 6,
      effPct: 20
    };

    root.innerHTML = `
      <div class="sim-title-row">
        <div>
          <div class="sim-kicker">Simulation 2</div>
          <div class="sim-title">Solar Energy Supply</div>
        </div>
        <div class="sim-subtitle mono">P = G · A · η</div>
      </div>

      <div class="sim-grid">
        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Inputs</div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="irr">Solar irradiance</label>
                <div class="control__value"><span id="irrVal" class="mono"></span> W/m²</div>
              </div>
              <input id="irr" class="range" type="range" min="0" max="1100" step="10" value="700" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="area">Panel surface area</label>
                <div class="control__value"><span id="areaVal" class="mono"></span> m²</div>
              </div>
              <input id="area" class="range" type="range" min="1" max="20" step="0.5" value="6" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="eff">Panel efficiency</label>
                <div class="control__value"><span id="effVal" class="mono"></span> %</div>
              </div>
              <input id="eff" class="range" type="range" min="8" max="28" step="1" value="20" />
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Outputs</div>
            <div class="metrics">
              <div class="metric">
                <div class="metric__label">Generated power</div>
                <div class="metric__value"><span id="pVal" class="mono"></span> <span class="muted">W</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Required pump power</div>
                <div class="metric__value"><span class="mono">${CONSTANTS.REQUIRED_PUMP_W}</span> <span class="muted">W</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Pump status</div>
                <div class="metric__value"><span id="status" class="badge"></span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Power margin</div>
                <div class="metric__value"><span id="margin" class="mono"></span> <span class="muted">W</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Visualization</div>
            <div class="solar-scene">
              <div id="sun" class="solar-sun" aria-hidden="true"></div>
              <div id="cloud" class="solar-cloud" aria-hidden="true"></div>
              <div class="solar-panel" aria-hidden="true">
                <div class="solar-panel__glow" id="panelGlow"></div>
                <div class="solar-panel__grid"></div>
              </div>
              <div class="energy-link" aria-hidden="true">
                <div id="energyFlow" class="energy-link__flow"></div>
              </div>
              <div class="pump-indicator">
                <div>
                  <div class="muted" style="font-size:12px">Pump</div>
                  <div id="pumpLabel" style="font-weight:800">Offline</div>
                </div>
                <div id="pumpLight" class="pump-light" aria-hidden="true"></div>
              </div>
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Power history</div>
            <canvas id="chart" width="600" height="300"></canvas>
            <div class="muted" style="margin-top:8px">Last ${CONSTANTS.CHART_MAX_POINTS} samples</div>
          </div>
        </section>
      </div>
    `;

    const $ = (sel) => root.querySelector(sel);
    const irrEl = $('#irr');
    const areaEl = $('#area');
    const effEl = $('#eff');
    const irrValEl = $('#irrVal');
    const areaValEl = $('#areaVal');
    const effValEl = $('#effVal');
    const pValEl = $('#pVal');
    const marginEl = $('#margin');
    const statusEl = $('#status');
    const sunEl = $('#sun');
    const cloudEl = $('#cloud');
    const panelGlowEl = $('#panelGlow');
    const energyFlowEl = $('#energyFlow');
    const pumpLightEl = $('#pumpLight');
    const pumpLabelEl = $('#pumpLabel');

    function calc(){
      const eff01 = clamp(state.effPct / 100, 0, 1);
      const powerW = state.irradiance * state.area * eff01;
      const marginW = powerW - CONSTANTS.REQUIRED_PUMP_W;
      const status = powerW >= CONSTANTS.REQUIRED_PUMP_W ? 'Operating' : 'Insufficient power';
      return { powerW, marginW, status };
    }

    function setBadge(status){
      statusEl.textContent = status;
      statusEl.dataset.state = status;
    }

    function syncFromInputs(){
      state.irradiance = Number(irrEl.value);
      state.area = Number(areaEl.value);
      state.effPct = Number(effEl.value);

      irrValEl.textContent = String(state.irradiance);
      areaValEl.textContent = state.area.toFixed(1);
      effValEl.textContent = String(state.effPct);

      const r = calc();
      pValEl.textContent = fmt(r.powerW, 0);
      marginEl.textContent = fmt(r.marginW, 0);
      setBadge(r.status);

      const irr01 = clamp(state.irradiance / 1100, 0, 1);
      const p01 = clamp(r.powerW / (CONSTANTS.REQUIRED_PUMP_W * 1.6), 0, 1);

      sunEl.style.opacity = String(0.25 + 0.75 * irr01);
      sunEl.style.transform = `scale(${0.88 + 0.18 * irr01})`;

      const cloudy = state.irradiance < 250;
      cloudEl.style.opacity = cloudy ? '1' : '0';
      cloudEl.style.transform = cloudy ? 'translateX(0px)' : 'translateX(-10px)';

      panelGlowEl.style.opacity = String(0.05 + 0.65 * p01);

      const on = r.status === 'Operating';
      pumpLightEl.classList.toggle('is-on', on);
      pumpLabelEl.textContent = on ? 'Online' : 'Offline';

      energyFlowEl.style.opacity = on ? '1' : '0';
      energyFlowEl.style.width = on ? '100%' : '0%';
    }

    irrEl.addEventListener('input', syncFromInputs);
    areaEl.addEventListener('input', syncFromInputs);
    effEl.addEventListener('input', syncFromInputs);

    const ctx = $('#chart');
    let chart = null;
    const series = { t: [], p: [] };
    const t0 = performance.now();
    let timerId = 0;

    function pushSample(tS, pW){
      series.t.push(tS);
      series.p.push(pW);
      while (series.t.length > CONSTANTS.CHART_MAX_POINTS){
        series.t.shift();
        series.p.shift();
      }
    }

    if (window.Chart && ctx){
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: series.t,
          datasets: [{
            label: 'Generated power (W)',
            data: series.p,
            borderColor: '#7c9bff',
            backgroundColor: 'rgba(124,155,255,.12)',
            fill: true,
            pointRadius: 0,
            tension: 0.28
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          animation: false,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,.78)' } } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' } },
            y: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' }, suggestedMin: 0 }
          }
        }
      });
    }

    function sample(){
      const r = calc();
      const tS = Math.round((performance.now() - t0) / 1000);
      pushSample(tS, r.powerW);
      if (chart) chart.update('none');
    }

    syncFromInputs();
    sample();
    timerId = window.setInterval(sample, 1000);

    return () => {
      window.clearInterval(timerId);
      if (chart) chart.destroy();
    };
  }
};
