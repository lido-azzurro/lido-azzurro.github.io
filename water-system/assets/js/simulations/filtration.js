export const filtration = {
  init(root){
    const CONSTANTS = {
      CHART_MAX_POINTS: 60,
      TURB_K: 0.085,
      FLOW_K: 0.055
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const fmt = (v, digits = 1) => Number.isFinite(v) ? v.toFixed(digits) : '—';

    const state = {
      turbidityInPct: 65,
      thicknessCm: 8
    };

    root.innerHTML = `
      <div class="sim-title-row">
        <div>
          <div class="sim-kicker">Simulation 3</div>
          <div class="sim-title">Mechanical Filtration</div>
        </div>
        <div class="sim-subtitle mono">Purity vs. flow resistance</div>
      </div>

      <div class="sim-grid">
        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Inputs</div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="turb">Initial turbidity</label>
                <div class="control__value"><span id="turbVal" class="mono"></span> %</div>
              </div>
              <input id="turb" class="range" type="range" min="0" max="100" step="1" value="65" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="thick">Filter thickness</label>
                <div class="control__value"><span id="thickVal" class="mono"></span> cm</div>
              </div>
              <input id="thick" class="range" type="range" min="1" max="25" step="1" value="8" />
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Outputs</div>
            <div class="metrics">
              <div class="metric">
                <div class="metric__label">Final turbidity</div>
                <div class="metric__value"><span id="turbOut" class="mono"></span> <span class="muted">%</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Flow reduction</div>
                <div class="metric__value"><span id="flowRed" class="mono"></span> <span class="muted">%</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Flow remaining</div>
                <div class="metric__value"><span id="flowRemain" class="mono"></span> <span class="muted">%</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Clarity gain</div>
                <div class="metric__value"><span id="clarity" class="mono"></span> <span class="muted">%</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Visualization</div>
            <div class="filter-scene">
              <div class="filter-cols">
                <div>
                  <div class="muted" style="font-size:12px;margin-bottom:8px">Inlet</div>
                  <div class="water-col">
                    <div id="waterIn" class="water-fill"></div>
                    <div id="shimmerIn" class="water-shimmer"></div>
                  </div>
                </div>

                <div class="filter-core">
                  <div id="layers" class="filter-layers"></div>
                  <div class="flow-bar"><div id="flowFill" class="flow-bar__fill"></div></div>
                </div>

                <div>
                  <div class="muted" style="font-size:12px;margin-bottom:8px">Outlet</div>
                  <div class="water-col">
                    <div id="waterOut" class="water-fill"></div>
                    <div id="shimmerOut" class="water-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Turbidity history</div>
            <canvas id="chart" width="600" height="300"></canvas>
            <div class="muted" style="margin-top:8px">Last ${CONSTANTS.CHART_MAX_POINTS} samples</div>
          </div>
        </section>
      </div>
    `;

    const $ = (sel) => root.querySelector(sel);
    const turbEl = $('#turb');
    const thickEl = $('#thick');
    const turbValEl = $('#turbVal');
    const thickValEl = $('#thickVal');
    const turbOutEl = $('#turbOut');
    const flowRedEl = $('#flowRed');
    const flowRemainEl = $('#flowRemain');
    const clarityEl = $('#clarity');
    const waterInEl = $('#waterIn');
    const waterOutEl = $('#waterOut');
    const shimmerInEl = $('#shimmerIn');
    const shimmerOutEl = $('#shimmerOut');
    const layersEl = $('#layers');
    const flowFillEl = $('#flowFill');

    function turbidityToColor(t){
      const t01 = clamp(t / 100, 0, 1);
      const alpha = 0.15 + 0.65 * t01;
      return `linear-gradient(180deg, rgba(124,155,255,${0.20 + 0.12*(1-t01)}), rgba(90,70,45,${alpha}))`;
    }

    function calc(){
      const turbIn = clamp(state.turbidityInPct, 0, 100);
      const thick = Math.max(0, state.thicknessCm);

      const turbOut = turbIn * Math.exp(-CONSTANTS.TURB_K * thick);
      const flowRemain01 = Math.exp(-CONSTANTS.FLOW_K * thick);
      const flowRemainPct = 100 * flowRemain01;
      const flowReductionPct = 100 - flowRemainPct;
      const clarityGainPct = turbIn <= 0 ? 0 : 100 * (1 - (turbOut / turbIn));

      return { turbIn, turbOut, flowRemainPct, flowReductionPct, clarityGainPct };
    }

    function rebuildLayers(){
      layersEl.innerHTML = '';
      const count = clamp(Math.round(state.thicknessCm / 3), 1, 8);
      layersEl.style.gridTemplateRows = `repeat(${count}, 1fr)`;
      for (let i = 0; i < count; i++){
        const d = document.createElement('div');
        d.className = 'filter-layer';
        const tint = 0.04 + 0.04 * (i / Math.max(1, count - 1));
        d.style.background = `rgba(255,255,255,${tint})`;
        layersEl.appendChild(d);
      }
    }

    function syncFromInputs(){
      state.turbidityInPct = Number(turbEl.value);
      state.thicknessCm = Number(thickEl.value);

      turbValEl.textContent = String(state.turbidityInPct);
      thickValEl.textContent = String(state.thicknessCm);

      const r = calc();
      turbOutEl.textContent = fmt(r.turbOut, 1);
      flowRedEl.textContent = fmt(r.flowReductionPct, 0);
      flowRemainEl.textContent = fmt(r.flowRemainPct, 0);
      clarityEl.textContent = fmt(r.clarityGainPct, 0);

      waterInEl.style.background = turbidityToColor(r.turbIn);
      waterOutEl.style.background = turbidityToColor(r.turbOut);

      rebuildLayers();

      const flow01 = clamp(r.flowRemainPct / 100, 0.05, 1);
      flowFillEl.style.width = `${flow01 * 100}%`;
      shimmerInEl.style.animationDuration = `${1.6 - 1.0 * flow01}s`;
      shimmerOutEl.style.animationDuration = `${1.8 - 1.1 * flow01}s`;
      shimmerInEl.style.opacity = String(0.25 + 0.35 * flow01);
      shimmerOutEl.style.opacity = String(0.25 + 0.35 * flow01);
    }

    turbEl.addEventListener('input', syncFromInputs);
    thickEl.addEventListener('input', syncFromInputs);

    const ctx = $('#chart');
    let chart = null;
    const series = { t: [], inT: [], outT: [] };
    const t0 = performance.now();
    let timerId = 0;

    function pushSample(tS, inT, outT){
      series.t.push(tS);
      series.inT.push(inT);
      series.outT.push(outT);
      while (series.t.length > CONSTANTS.CHART_MAX_POINTS){
        series.t.shift();
        series.inT.shift();
        series.outT.shift();
      }
    }

    if (window.Chart && ctx){
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: series.t,
          datasets: [
            { label: 'Inlet turbidity (%)', data: series.inT, borderColor: 'rgba(255,181,77,.9)', backgroundColor: 'rgba(255,181,77,.10)', fill: false, pointRadius: 0, tension: 0.28 },
            { label: 'Outlet turbidity (%)', data: series.outT, borderColor: '#6be4ff', backgroundColor: 'rgba(107,228,255,.12)', fill: true, pointRadius: 0, tension: 0.28 }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          animation: false,
          plugins: { legend: { labels: { color: 'rgba(255,255,255,.78)' } } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' } },
            y: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' }, suggestedMin: 0, suggestedMax: 100 }
          }
        }
      });
    }

    function sample(){
      const r = calc();
      const tS = Math.round((performance.now() - t0) / 1000);
      pushSample(tS, r.turbIn, r.turbOut);
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
