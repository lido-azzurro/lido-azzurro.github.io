export const hardness = {
  init(root){
    const CONSTANTS = {
      CHART_MAX_POINTS: 60,
      CA_TO_CACO3: 2.497,
      MG_TO_CACO3: 4.118
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const fmt = (v, digits = 0) => Number.isFinite(v) ? v.toFixed(digits) : '—';

    const state = {
      caMgL: 90,
      mgMgL: 35,
      ph: 7.6
    };

    root.innerHTML = `
      <div class="sim-title-row">
        <div>
          <div class="sim-kicker">Simulation 4</div>
          <div class="sim-title">Hard Water Analysis</div>
        </div>
        <div class="sim-subtitle mono">Ca²⁺ + Mg²⁺ → hardness (as CaCO₃)</div>
      </div>

      <div class="sim-grid">
        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Inputs</div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="ca">Ca²⁺ concentration</label>
                <div class="control__value"><span id="caVal" class="mono"></span> mg/L</div>
              </div>
              <input id="ca" class="range" type="range" min="0" max="250" step="1" value="90" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="mg">Mg²⁺ concentration</label>
                <div class="control__value"><span id="mgVal" class="mono"></span> mg/L</div>
              </div>
              <input id="mg" class="range" type="range" min="0" max="150" step="1" value="35" />
            </div>

            <div class="control">
              <div class="control__row">
                <label class="control__label" for="ph">pH</label>
                <div class="control__value"><span id="phVal" class="mono"></span></div>
              </div>
              <input id="ph" class="range" type="range" min="6.0" max="9.2" step="0.1" value="7.6" />
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Outputs</div>
            <div class="metrics">
              <div class="metric">
                <div class="metric__label">Total hardness</div>
                <div class="metric__value"><span id="hardVal" class="mono"></span> <span class="muted">mg/L as CaCO₃</span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Water classification</div>
                <div class="metric__value"><span id="classBadge" class="badge"></span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Scaling risk</div>
                <div class="metric__value"><span id="riskBadge" class="badge"></span></div>
              </div>
              <div class="metric">
                <div class="metric__label">Risk score</div>
                <div class="metric__value"><span id="riskScore" class="mono"></span> <span class="muted">(0–1)</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="sim-stack">
          <div class="sim-card">
            <div class="sim-card__title">Visualization</div>
            <div class="lab-scene">
              <div style="display:flex;gap:14px;align-items:center;height:100%">
                <div>
                  <div class="viz-title">Beaker</div>
                  <div class="beaker">
                    <div id="solution" class="beaker__solution"></div>
                    <div id="ions" class="ion-layer" aria-hidden="true"></div>
                    <div class="beaker__meniscus"></div>
                  </div>
                </div>
                <div class="hard-scale" style="display:flex;flex-direction:column;gap:12px">
                  <div>
                    <div class="viz-title">Hardness scale</div>
                    <div class="hard-scale__bar"><div id="pin" class="hard-scale__pin"></div></div>
                    <div class="muted" style="font-size:12px;margin-top:8px">Soft &lt; 60 | Moderate 60–120 | Hard 120–180 | Very hard &gt; 180</div>
                  </div>
                  <div>
                    <div class="viz-title">Equipment alert</div>
                    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                      <div class="equip">
                        <div class="pipe-icon" aria-hidden="true"><div id="scale" class="pipe-scale"></div></div>
                      </div>
                      <div id="alert" class="warn is-muted">Stable</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="sim-card">
            <div class="sim-card__title">Hardness history</div>
            <canvas id="chart" width="600" height="300"></canvas>
            <div class="muted" style="margin-top:8px">Last ${CONSTANTS.CHART_MAX_POINTS} samples</div>
          </div>
        </section>
      </div>
    `;

    const $ = (sel) => root.querySelector(sel);
    const caEl = $('#ca');
    const mgEl = $('#mg');
    const phEl = $('#ph');
    const caValEl = $('#caVal');
    const mgValEl = $('#mgVal');
    const phValEl = $('#phVal');
    const hardValEl = $('#hardVal');
    const classBadgeEl = $('#classBadge');
    const riskBadgeEl = $('#riskBadge');
    const riskScoreEl = $('#riskScore');
    const solutionEl = $('#solution');
    const ionsEl = $('#ions');
    const pinEl = $('#pin');
    const scaleEl = $('#scale');
    const alertEl = $('#alert');

    const ionState = {
      ca: [],
      mg: [],
      rafId: 0,
      lastT: performance.now()
    };

    function makeIon(kind){
      const d = document.createElement('div');
      d.className = `ion ${kind}`;
      ionsEl.appendChild(d);
      return {
        el: d,
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06
      };
    }

    function ensureIons(list, kind, n){
      while (list.length < n) list.push(makeIon(kind));
      while (list.length > n){
        const ion = list.pop();
        ion.el.remove();
      }
    }

    function stepIons(speed){
      const now = performance.now();
      const dt = Math.min(0.05, (now - ionState.lastT) / 1000);
      ionState.lastT = now;

      const move = (ion) => {
        ion.x += ion.vx * dt * speed;
        ion.y += ion.vy * dt * speed;
        if (ion.x < 0) ion.x = 1;
        if (ion.x > 1) ion.x = 0;
        if (ion.y < 0) ion.y = 1;
        if (ion.y > 1) ion.y = 0;
        ion.el.style.left = `${(ion.x * 100).toFixed(2)}%`;
        ion.el.style.top = `${(ion.y * 100).toFixed(2)}%`;
      };

      for (const ion of ionState.ca) move(ion);
      for (const ion of ionState.mg) move(ion);

      ionState.rafId = requestAnimationFrame(() => stepIons(speed));
    }

    function classifyHardness(h){
      if (h < 60) return 'Soft';
      if (h < 120) return 'Moderately hard';
      if (h < 180) return 'Hard';
      return 'Very hard';
    }

    function riskLevel(score){
      if (score < 0.4) return 'Low risk';
      if (score < 0.7) return 'Medium risk';
      return 'High risk';
    }

    function calc(){
      const hardness = state.caMgL * CONSTANTS.CA_TO_CACO3 + state.mgMgL * CONSTANTS.MG_TO_CACO3;
      const hardClass = classifyHardness(hardness);

      const phFactor = 1 + (clamp(state.ph, 6, 9.2) - 7) / 2.2;
      const score = clamp((hardness / 220) * phFactor, 0, 1);
      const risk = riskLevel(score);

      return { hardness, hardClass, score, risk };
    }

    function setBadge(el, text){
      el.textContent = text;
      el.dataset.state = text;
    }

    function syncFromInputs(){
      state.caMgL = Number(caEl.value);
      state.mgMgL = Number(mgEl.value);
      state.ph = Number(phEl.value);

      caValEl.textContent = String(state.caMgL);
      mgValEl.textContent = String(state.mgMgL);
      phValEl.textContent = state.ph.toFixed(1);

      const r = calc();
      hardValEl.textContent = fmt(r.hardness, 0);
      setBadge(classBadgeEl, r.hardClass);
      setBadge(riskBadgeEl, r.risk);
      riskScoreEl.textContent = r.score.toFixed(2);

      const pinPct = clamp(r.hardness / 260, 0, 1) * 100;
      pinEl.style.left = `${pinPct}%`;

      const hue = 120 - 120 * clamp(r.hardness / 220, 0, 1);
      solutionEl.style.background = `linear-gradient(180deg, hsla(${hue}, 85%, 65%, .45), hsla(${hue}, 85%, 55%, .18))`;
      const ph01 = clamp((state.ph - 6) / (9.2 - 6), 0, 1);
      solutionEl.style.filter = `saturate(${1 + 0.35 * r.score}) brightness(${0.95 + 0.12 * ph01})`;

      const caN = Math.round(clamp((state.caMgL / 250) * 42, 0, 42));
      const mgN = Math.round(clamp((state.mgMgL / 150) * 32, 0, 32));
      ensureIons(ionState.ca, 'ca', caN);
      ensureIons(ionState.mg, 'mg', mgN);

      scaleEl.classList.toggle('is-on', r.score > 0.35);
      scaleEl.style.opacity = String(clamp(r.score, 0, 1));

      const high = r.risk === 'High risk';
      alertEl.classList.toggle('is-muted', !high);
      alertEl.textContent = high ? 'Scale buildup risk' : 'Stable';
    }

    caEl.addEventListener('input', syncFromInputs);
    mgEl.addEventListener('input', syncFromInputs);
    phEl.addEventListener('input', syncFromInputs);

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
            label: 'Hardness (mg/L as CaCO₃)',
            data: series.h,
            borderColor: '#6be4ff',
            backgroundColor: 'rgba(107,228,255,.12)',
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
      pushSample(tS, r.hardness);
      if (chart) chart.update('none');
    }

    syncFromInputs();
    sample();
    timerId = window.setInterval(sample, 1000);
    ionState.lastT = performance.now();
    ionState.rafId = requestAnimationFrame(() => stepIons(0.7));

    return () => {
      window.clearInterval(timerId);
      cancelAnimationFrame(ionState.rafId);
      if (chart) chart.destroy();
    };
  }
};
