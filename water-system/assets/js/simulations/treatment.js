export const treatment = {
  init(root){
    const CONSTANTS = {
      CHART_MAX_POINTS: 60,
      INLET_HARDNESS_MG_L: 220,
      INLET_PH: 7.4
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const fmt = (v, digits = 0) => Number.isFinite(v) ? v.toFixed(digits) : '—';

    const METHODS = {
      lime: { name: 'Lime treatment', maxRemoval: 0.60 },
      ion: { name: 'Ion exchange', maxRemoval: 0.90 },
      neutral: { name: 'Chemical neutralization', maxRemoval: 0.35 }
    };

    const state = {
      method: 'lime',
      dosePct: 45
    };

    root.innerHTML = `
      <div class="sim-title-row">
        <div>
          <div class="sim-kicker">Simulation 5</div>
          <div class="sim-title">Chemical Treatment</div>
        </div>
        <div class="sim-subtitle mono">Controlled dosing, measurable side‑effects</div>
      </div>

      <div class="sim-grid">
        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Inputs</div>

            <div class="control" style="border-top:none;padding-top:0">
              <div class="control__row">
                <label class="control__label" for="method">Treatment method</label>
                <div class="control__value muted">Select</div>
              </div>
              <select id="method" class="range" style="height:38px">
                <option value="lime">Lime treatment</option>
                <option value="ion">Ion exchange</option>
                <option value="neutral">Chemical neutralization</option>
              </select>
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="dose">Dosage level</label>
                <div class="control__value"><span id="doseVal" class="mono"></span> %</div>
              </div>
              <input id="dose" class="range" type="range" min="0" max="100" step="1" value="45" />
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Outputs</div>
            <div class="metrics">
              <div class="metric">
                <div class="metric__label">New hardness</div>
                <div class="metric__value"><span id="hardOut" class="mono"></span> <span class="muted">mg/L as CaCO₃</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Effectiveness</div>
                <div class="metric__value"><span id="eff" class="mono"></span> <span class="muted">%</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">pH change</div>
                <div class="metric__value"><span id="phDelta" class="mono"></span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Stability</div>
                <div class="metric__value">
                  <div class="meter" style="margin-top:2px"><div id="stabFill" class="meter__fill"></div></div>
                </div>
              </div>
            </div>
            <div id="warn" class="warn is-muted" style="margin-top:12px">Within normal dosing range</div>
          </div>
        </section>

        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Visualization</div>
            <div class="treat-scene">
              <div class="treat-card">
                <div class="viz-title">Before</div>
                <div class="treat-water">
                  <div id="beforeFill" class="treat-water__fill"></div>
                </div>
                <div class="muted" style="font-size:12px;margin-top:10px">Hardness: <span class="mono">${CONSTANTS.INLET_HARDNESS_MG_L}</span> mg/L</div>
              </div>
              <div class="treat-card">
                <div class="viz-title">After</div>
                <div class="treat-water">
                  <div id="afterFill" class="treat-water__fill"></div>
                  <div id="bubbles" class="bubbles"></div>
                </div>
                <div class="muted" style="font-size:12px;margin-top:10px">pH: <span class="mono">${CONSTANTS.INLET_PH.toFixed(1)}</span> → <span id="phOut" class="mono"></span></div>
              </div>
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Hardness after treatment (history)</div>
            <canvas id="chart" width="600" height="300"></canvas>
            <div class="muted" style="margin-top:8px">Last ${CONSTANTS.CHART_MAX_POINTS} samples</div>
          </div>
        </section>
      </div>
    `;

    const $ = (sel) => root.querySelector(sel);
    const methodEl = $('#method');
    const doseEl = $('#dose');
    const doseValEl = $('#doseVal');
    const hardOutEl = $('#hardOut');
    const effEl = $('#eff');
    const phDeltaEl = $('#phDelta');
    const phOutEl = $('#phOut');
    const stabFillEl = $('#stabFill');
    const warnEl = $('#warn');
    const beforeFillEl = $('#beforeFill');
    const afterFillEl = $('#afterFill');
    const bubblesEl = $('#bubbles');

    function calc(){
      const method = METHODS[state.method] || METHODS.lime;
      const dose01 = clamp(state.dosePct / 100, 0, 1);

      const doseCurve = 1 - Math.exp(-3.2 * dose01);
      const removalFrac = clamp(method.maxRemoval * doseCurve, 0, 0.95);
      const hardOut = CONSTANTS.INLET_HARDNESS_MG_L * (1 - removalFrac);
      const effectivenessPct = 100 * (1 - hardOut / CONSTANTS.INLET_HARDNESS_MG_L);

      let phOut = CONSTANTS.INLET_PH;
      let sideEffect = 0;

      if (state.method === 'lime'){
        phOut = CONSTANTS.INLET_PH + 1.6 * dose01;
        sideEffect = dose01;
      } else if (state.method === 'neutral'){
        phOut = CONSTANTS.INLET_PH + (-0.9 * clamp(dose01 - 0.55, 0, 1)) + (0.25 * clamp(0.35 - dose01, 0, 1));
        sideEffect = clamp(dose01 - 0.65, 0, 1);
      } else {
        phOut = CONSTANTS.INLET_PH + 0.05 * dose01;
        sideEffect = 0.55 * dose01;
      }

      const phDelta = phOut - CONSTANTS.INLET_PH;
      const overdose = dose01 > 0.85;
      const stability = clamp(1 - (Math.abs(phDelta) / 1.6) - 0.55 * sideEffect - (overdose ? 0.25 : 0), 0, 1);

      return { hardOut, effectivenessPct, phOut, phDelta, stability, overdose, sideEffect };
    }

    function hardnessColor(h){
      const h01 = clamp(h / 220, 0, 1);
      const hue = 120 - 120 * h01;
      return `linear-gradient(180deg, hsla(${hue}, 85%, 60%, .32), hsla(${hue}, 85%, 55%, .16))`;
    }

    function syncFromInputs(){
      state.method = String(methodEl.value);
      state.dosePct = Number(doseEl.value);
      doseValEl.textContent = String(state.dosePct);

      const r = calc();
      hardOutEl.textContent = fmt(r.hardOut, 0);
      effEl.textContent = fmt(r.effectivenessPct, 0);
      phDeltaEl.textContent = `${r.phDelta >= 0 ? '+' : ''}${r.phDelta.toFixed(2)}`;
      phOutEl.textContent = r.phOut.toFixed(2);

      stabFillEl.style.width = `${(r.stability * 100).toFixed(0)}%`;
      stabFillEl.classList.toggle('is-warn', r.stability < 0.55 && r.stability >= 0.35);
      stabFillEl.classList.toggle('is-danger', r.stability < 0.35);

      beforeFillEl.style.background = hardnessColor(CONSTANTS.INLET_HARDNESS_MG_L);
      afterFillEl.style.background = hardnessColor(r.hardOut);

      const reacting = r.effectivenessPct > 5;
      bubblesEl.style.opacity = reacting ? '1' : '0';

      const warn = r.overdose || r.sideEffect > 0.45;
      warnEl.classList.toggle('is-muted', !warn);
      warnEl.textContent = warn
        ? (r.overdose ? 'Overdosing: stability risk / side effects' : 'Noticeable side effects: monitor pH & byproducts')
        : 'Within normal dosing range';
    }

    methodEl.value = state.method;
    methodEl.addEventListener('change', syncFromInputs);
    doseEl.addEventListener('input', syncFromInputs);

    const ctx = $('#chart');
    let chart = null;
    const series = { t: [], h: [] };
    const t0 = performance.now();
    let timerId = 0;

    function pushSample(tS, h){
      series.t.push(tS);
      series.h.push(h);
      while (series.t.length > CONSTANTS.CHART_MAX_POINTS){
        series.t.shift();
        series.h.shift();
      }
    }

    if (window.Chart && ctx){
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: series.t,
          datasets: [{
            label: 'Hardness after treatment (mg/L as CaCO₃)',
            data: series.h,
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
            y: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.08)' }, suggestedMin: 0, suggestedMax: CONSTANTS.INLET_HARDNESS_MG_L }
          }
        }
      });
    }

    function sample(){
      const r = calc();
      const tS = Math.round((performance.now() - t0) / 1000);
      pushSample(tS, r.hardOut);
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
