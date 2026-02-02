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
                  <div id="ionsBefore" class="treat-ion-layer" aria-hidden="true"></div>
                </div>
                <div class="muted" style="font-size:12px;margin-top:10px">Hardness: <span class="mono">${CONSTANTS.INLET_HARDNESS_MG_L}</span> mg/L</div>
              </div>
              <div class="treat-card">
                <div class="viz-title">After</div>
                <div class="treat-water">
                  <div id="afterFill" class="treat-water__fill"></div>
                  <div id="ionsAfter" class="treat-ion-layer" aria-hidden="true"></div>
                  <div id="reaction" class="reaction" aria-hidden="true"></div>
                  <div id="sludge" class="sludge" aria-hidden="true"></div>
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
    const ionsBeforeEl = $('#ionsBefore');
    const ionsAfterEl = $('#ionsAfter');
    const reactionEl = $('#reaction');
    const sludgeEl = $('#sludge');
    const bubblesEl = $('#bubbles');

    const vizState = {
      before: [],
      after: [],
      rafId: 0,
      lastT: performance.now(),
      dropletTimer: 0
    };

    function makeIon(container, kind){
      const d = document.createElement('div');
      d.className = `treat-ion ${kind}`;
      container.appendChild(d);
      return {
        el: d,
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08
      };
    }

    function ensureIons(list, container, n, mix){
      while (list.length < n){
        const kind = Math.random() < mix ? 'ca is-on' : 'mg is-on';
        list.push(makeIon(container, kind));
      }
      while (list.length > n){
        const ion = list.pop();
        ion.el.remove();
      }
      for (const ion of list) ion.el.classList.add('is-on');
    }

    function dropOnce(intensity){
      const host = afterFillEl.parentElement;
      if (!host) return;
      const d = document.createElement('div');
      d.className = 'droplet';
      d.style.left = `${(10 + 80 * Math.random()).toFixed(1)}%`;
      d.style.opacity = String(0.55 + 0.35 * intensity);
      host.appendChild(d);
      window.setTimeout(() => d.remove(), 650);
    }

    function animate(){
      const now = performance.now();
      const dt = Math.min(0.05, (now - vizState.lastT) / 1000);
      vizState.lastT = now;

      const r = calc();
      const removal01 = clamp(1 - (r.hardOut / CONSTANTS.INLET_HARDNESS_MG_L), 0, 1);
      const afterRatio = clamp(r.hardOut / CONSTANTS.INLET_HARDNESS_MG_L, 0, 1);

      const beforeN = 42;
      const afterN = Math.round(beforeN * (0.22 + 0.78 * afterRatio));

      ensureIons(vizState.before, ionsBeforeEl, beforeN, 0.58);
      ensureIons(vizState.after, ionsAfterEl, afterN, 0.58);

      const move = (ion, speed, settle01) => {
        ion.x += ion.vx * dt * speed;
        ion.y += ion.vy * dt * speed;
        ion.y += dt * 0.05 * settle01;
        if (ion.x < 0) ion.x = 1;
        if (ion.x > 1) ion.x = 0;
        if (ion.y < 0) ion.y = 1;
        if (ion.y > 1) ion.y = 0;
        ion.el.style.left = `${(ion.x * 100).toFixed(2)}%`;
        ion.el.style.top = `${(ion.y * 100).toFixed(2)}%`;
      };

      const settle = clamp(removal01 * 0.8 + (r.overdose ? 0.35 : 0), 0, 1);
      for (const ion of vizState.before) move(ion, 0.65, 0.0);
      for (const ion of vizState.after) move(ion, 0.55, settle);

      const reacting = r.effectivenessPct > 5;
      bubblesEl.style.opacity = reacting ? '1' : '0';
      reactionEl.classList.toggle('is-on', reacting);

      const sludgeOn = r.overdose || r.sideEffect > 0.55;
      sludgeEl.classList.toggle('is-on', sludgeOn);
      sludgeEl.style.height = sludgeOn ? `${(6 + 22 * clamp(settle, 0, 1)).toFixed(0)}%` : '0%';

      vizState.rafId = requestAnimationFrame(animate);
    }

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
      reactionEl.classList.toggle('is-on', reacting);

      const intensity = clamp(state.dosePct / 100, 0, 1);
      window.clearInterval(vizState.dropletTimer);
      if (reacting && intensity > 0.05){
        const ms = 900 - 700 * intensity;
        vizState.dropletTimer = window.setInterval(() => dropOnce(intensity), clamp(ms, 180, 900));
        dropOnce(intensity);
      }

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
    vizState.lastT = performance.now();
    vizState.rafId = requestAnimationFrame(animate);

    return () => {
      window.clearInterval(timerId);
      window.clearInterval(vizState.dropletTimer);
      cancelAnimationFrame(vizState.rafId);
      if (chart) chart.destroy();
    };
  }
};
