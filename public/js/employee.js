/**
 * AssemblyTrack — employee.js
 * Employee-facing page: ID gate, live runs table, Start/Stop modals.
 */

'use strict';

const EmployeePage = (() => {

  // ── State ──────────────────────────────────────────────────────────────────
  let currentEmpId = null;
  let timerInterval = null;
  let toolPicker = null;

  const CATEGORIES = [
    'assembly', 'welding', 'painting', 'testing',
    'packaging', 'machining', 'inspection', 'other',
  ];

  const QUALITY_OPTIONS = [
    { value: 'pass',    icon: '✅', label: 'Pass',    cls: 'q-pass'    },
    { value: 'fail',    icon: '❌', label: 'Fail',    cls: 'q-fail'    },
    { value: 'rework',  icon: '🔧', label: 'Rework',  cls: 'q-rework'  },
    { value: 'partial', icon: '🔶', label: 'Partial', cls: 'q-partial' },
    { value: 'pending', icon: '⏳', label: 'Pending', cls: 'q-pending' },
  ];

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Gate ───────────────────────────────────────────────────────────────────
  function initGate() {
    const gate     = $('emp-gate');
    const dashboard = $('emp-dashboard');
    const input    = $('gate-emp-input');
    const btn      = $('gate-submit-btn');
    const errEl    = $('gate-error');

    if (!gate) return;

    // Check session
    const saved = sessionStorage.getItem('at_emp_id');
    if (saved && /^EMP-\d{3}$/.test(saved)) {
      currentEmpId = saved;
      showDashboard();
      return;
    }

    btn.addEventListener('click', attemptLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

    input.addEventListener('input', () => {
      let v = input.value.toUpperCase().replace(/[^0-9]/g, '');
      if (v.length > 3) v = v.slice(0, 3);
      input.value = v;
      errEl.textContent = '';
      input.classList.remove('error');
    });

    function attemptLogin() {
      const raw = input.value.trim();
      const empId = `EMP-${raw.padStart(3, '0')}`;

      if (!/^EMP-\d{3}$/.test(empId) || parseInt(raw, 10) < 1 || parseInt(raw, 10) > 999) {
        errEl.textContent = 'Enter a valid employee number (001 – 999).';
        input.classList.add('error');
        input.focus();
        return;
      }

      currentEmpId = empId;
      sessionStorage.setItem('at_emp_id', empId);
      showDashboard();
    }

    function showDashboard() {
      gate.classList.add('hidden');
      dashboard.classList.remove('hidden');
      initDashboard();
    }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function initDashboard() {
    // Fill avatar / welcome
    const parts  = currentEmpId.split('-');
    const num    = parts[1] || '000';
    const initials = num.replace(/^0+/, '') || '?';
    const avatarEl = $('emp-avatar');
    const nameEl   = $('emp-name');
    const idEl     = $('emp-id-label');

    if (avatarEl)  avatarEl.textContent = initials;
    if (nameEl)    nameEl.textContent   = `Employee ${num.replace(/^0+/, '') || '0'}`;
    if (idEl)      idEl.textContent     = currentEmpId;

    // Logout
    const logoutBtn = $('emp-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('at_emp_id');
        currentEmpId = null;
        clearInterval(timerInterval);
        $('emp-gate').classList.remove('hidden');
        $('emp-dashboard').classList.add('hidden');
        $('gate-emp-input').value = '';
        $('gate-error').textContent = '';
      });
    }

    // Start button
    const startBtn = $('start-run-btn');
    if (startBtn) startBtn.addEventListener('click', () => openStartModal());

    // Render table & start timer
    renderRunsTable();
    startTimerTick();
  }

  // ── Live Runs Table ────────────────────────────────────────────────────────
  function renderRunsTable() {
    const tbody = $('live-runs-tbody');
    if (!tbody) return;

    const allActive = Store.getActiveRuns();
    const empActive = allActive.filter(r => r.employeeId === currentEmpId);
    const others    = allActive.filter(r => r.employeeId !== currentEmpId);
    const runs      = [...empActive, ...others];

    if (runs.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="table-empty">
            <div class="table-empty-icon">🏭</div>
            <div class="table-empty-text">No active production runs. Start one!</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = runs.map(r => {
      const isOwn  = r.employeeId === currentEmpId;
      const elapsed = elapsedSince(r.startedAt);
      const pct    = Math.min((elapsed / r.expectedMinutes) * 100, 100);
      const overdue = elapsed > r.expectedMinutes;
      const warn   = elapsed > r.expectedMinutes * 0.85 && !overdue;
      const timerCls = overdue ? 'exceeded' : warn ? 'warning' : 'running';
      const barCls   = overdue ? 'danger' : warn ? 'warning' : '';

      return `
        <tr data-run-id="${r.id}">
          <td>
            <span class="font-mono text-sm font-bold">${r.id}</span>
            ${isOwn ? '<span class="badge badge-accent ml-1" style="margin-left:0.4rem">Mine</span>' : ''}
          </td>
          <td>
            <div class="font-bold">${esc(r.productName)}</div>
            <div class="text-xs text-muted mt-1">${esc(r.station)}</div>
          </td>
          <td><span class="category-pill cat-${r.category}">${cap(r.category)}</span></td>
          <td>
            <span class="timer ${timerCls}" data-started="${r.startedAt}">${formatDuration(elapsed)}</span>
            <div class="progress-bar-wrapper">
              <div class="progress-bar ${barCls}" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <div class="text-xs text-muted mt-1">Expected: ${r.expectedMinutes} min</div>
          </td>
          <td>
            ${overdue
              ? `<span class="badge badge-danger">⚠ Overdue ${formatDuration(elapsed - r.expectedMinutes)}</span>`
              : `<span class="badge badge-success">On Track</span>`
            }
          </td>
          <td class="font-mono text-sm text-secondary">${r.employeeId}</td>
          <td>
            ${isOwn
              ? `<button class="btn btn-danger btn-sm stop-btn" data-id="${r.id}">⏹ Stop</button>`
              : '<span class="text-muted text-xs">—</span>'
            }
          </td>
        </tr>`;
    }).join('');

    // Attach stop button events
    tbody.querySelectorAll('.stop-btn').forEach(btn => {
      btn.addEventListener('click', () => openStopModal(btn.dataset.id));
    });

    // Count badge
    const countEl = $('active-run-count');
    if (countEl) countEl.textContent = allActive.length;
  }

  function startTimerTick() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      // Update timers in place (avoid full re-render for smoother UX)
      const rows = document.querySelectorAll('#live-runs-tbody tr[data-run-id]');
      if (rows.length === 0) return renderRunsTable();

      let needsFullRender = false;
      rows.forEach(row => {
        const timerEl = row.querySelector('.timer');
        const barEl   = row.querySelector('.progress-bar');
        if (!timerEl) return;

        const startedAt = timerEl.dataset.started;
        const runId     = row.dataset.runId;
        const run       = Store.getRunById(runId);
        if (!run || run.status !== 'running') { needsFullRender = true; return; }

        const elapsed = elapsedSince(startedAt);
        const pct     = Math.min((elapsed / run.expectedMinutes) * 100, 100);
        const overdue = elapsed > run.expectedMinutes;
        const warn    = elapsed > run.expectedMinutes * 0.85 && !overdue;

        timerEl.textContent = formatDuration(elapsed);
        timerEl.className   = `timer ${overdue ? 'exceeded' : warn ? 'warning' : 'running'}`;
        if (barEl) {
          barEl.style.width = pct.toFixed(1) + '%';
          barEl.className   = `progress-bar ${overdue ? 'danger' : warn ? 'warning' : ''}`;
        }
      });

      if (needsFullRender) renderRunsTable();
    }, 1000);
  }

  // ── Start Modal ────────────────────────────────────────────────────────────
  function openStartModal() {
    const overlay = $('start-modal-overlay');
    overlay.classList.add('active');
    buildStartModalContent();
  }

  function closeStartModal() {
    const overlay = $('start-modal-overlay');
    overlay.classList.remove('active');
    if (toolPicker) toolPicker.reset();
  }

  function buildStartModalContent() {
    const body = $('start-modal-body');
    if (!body) return;

    const catOptions = CATEGORIES.map(c =>
      `<option value="${c}">${cap(c)}</option>`
    ).join('');

    body.innerHTML = `
      <div class="form-group">
        <label for="sm-product">Product Name <span class="required">*</span></label>
        <input type="text" id="sm-product" placeholder="e.g. Gear Housing Assembly A-12" maxlength="80">
        <div class="field-error" id="sm-product-err">Please enter a product name.</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="sm-category">Category <span class="required">*</span></label>
          <select id="sm-category">
            <option value="">Select category…</option>
            ${catOptions}
          </select>
          <div class="field-error" id="sm-category-err">Please select a category.</div>
        </div>
        <div class="form-group">
          <label for="sm-expected">Expected Duration (min) <span class="required">*</span></label>
          <input type="number" id="sm-expected" min="1" max="600" placeholder="e.g. 60">
          <div class="field-error" id="sm-expected-err">Enter a duration (1–600 min).</div>
        </div>
      </div>
      <div class="form-group">
        <label for="sm-station">Work Station <span class="required">*</span></label>
        <input type="text" id="sm-station" placeholder="e.g. STA-03" maxlength="30">
        <div class="field-error" id="sm-station-err">Please enter a station.</div>
      </div>
      <div class="form-group">
        <label>Tools Used</label>
        <div id="sm-tools-wrapper" class="tag-input-wrapper"></div>
        <div class="form-hint">Type to search or add custom tools. Press Enter or click to add.</div>
      </div>
    `;

    // Init tool picker
    const toolWrapper = $('sm-tools-wrapper');
    toolPicker = ToolPicker.create(toolWrapper, () => {});
  }

  function submitStartModal() {
    const product  = $('sm-product')?.value.trim();
    const category = $('sm-category')?.value;
    const expected = parseInt($('sm-expected')?.value, 10);
    const station  = $('sm-station')?.value.trim();
    const tools    = toolPicker ? toolPicker.getTags() : [];

    let valid = true;

    const validate = (val, errId, cond) => {
      const err = $(errId);
      if (!err) return;
      const fail = !cond(val);
      err.classList.toggle('visible', fail);
      const input = err.previousElementSibling;
      if (input) input.classList.toggle('error', fail);
      if (fail) valid = false;
    };

    validate(product,  'sm-product-err',  v => v && v.length >= 2);
    validate(category, 'sm-category-err', v => !!v);
    validate(expected, 'sm-expected-err', v => v >= 1 && v <= 600 && !isNaN(v));
    validate(station,  'sm-station-err',  v => v && v.length >= 1);

    if (!valid) return;

    Store.startRun({ employeeId: currentEmpId, productName: product, category, expectedMinutes: expected, station, tools });
    closeStartModal();
    renderRunsTable();
    App.toast('Production run started! ⏱', 'success');
  }

  // ── Stop Modal ─────────────────────────────────────────────────────────────
  function openStopModal(runId) {
    const run = Store.getRunById(runId);
    if (!run) return;

    const overlay = $('stop-modal-overlay');
    overlay.classList.add('active');
    buildStopModalContent(run);
  }

  function closeStopModal() {
    $('stop-modal-overlay').classList.remove('active');
  }

  function buildStopModalContent(run) {
    const body = $('stop-modal-body');
    if (!body) return;

    const elapsed  = elapsedSince(run.startedAt);
    const isDelayed = elapsed > run.expectedMinutes;
    const excess   = elapsed - run.expectedMinutes;

    const qualityBtns = QUALITY_OPTIONS.map(q =>
      `<button type="button" class="quality-btn ${q.cls}" data-value="${q.value}">
        <span class="q-icon">${q.icon}</span>
        <span>${q.label}</span>
      </button>`
    ).join('');

    body.innerHTML = `
      <div class="card mb-3" style="background:var(--bg-primary);padding:1rem;border-radius:var(--radius-sm);">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div class="font-bold">${esc(run.productName)}</div>
            <div class="text-xs text-muted mt-1">${run.id} · ${run.employeeId} · <span class="category-pill cat-${run.category}">${cap(run.category)}</span></div>
          </div>
          <div class="text-right">
            <div class="text-xs text-muted">Elapsed</div>
            <div class="font-mono font-bold ${isDelayed ? 'text-danger' : 'text-success'}" style="font-size:1.15rem">${formatDuration(elapsed)}</div>
            <div class="text-xs text-muted">Expected: ${run.expectedMinutes} min</div>
          </div>
        </div>
      </div>

      ${isDelayed ? `
      <div class="delay-box mb-3">
        <div class="delay-box-title">⚠ Run Exceeded Expected Time</div>
        <div class="text-sm" style="color:var(--text-secondary)">
          This run is <strong style="color:var(--warning)">${formatDuration(excess)} over schedule</strong>.
          A justification is required before completing.
        </div>
      </div>
      <div class="form-group">
        <label for="stop-delay-reason">Delay Justification <span class="required">*</span></label>
        <textarea id="stop-delay-reason" placeholder="Describe the reason for the delay…" rows="3"></textarea>
        <div class="field-error" id="stop-delay-err">Please provide a justification for the delay.</div>
      </div>
      ` : ''}

      <div class="form-row">
        <div class="form-group">
          <label for="stop-units">Units Completed <span class="required">*</span></label>
          <input type="number" id="stop-units" min="0" max="99999" placeholder="0">
          <div class="field-error" id="stop-units-err">Enter completed units (0 or more).</div>
        </div>
        <div class="form-group">
          <label>Quality Check <span class="required">*</span></label>
          <div class="quality-grid" id="quality-grid">
            ${qualityBtns}
          </div>
          <div class="field-error" id="stop-quality-err">Please select a quality result.</div>
        </div>
      </div>

      <div class="form-group">
        <label for="stop-notes">Logbook Notes</label>
        <textarea id="stop-notes" placeholder="Any observations, issues, or remarks…" rows="2"></textarea>
      </div>
    `;

    // Quality button selection
    let selectedQuality = null;
    body.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedQuality = btn.dataset.value;
        $('stop-quality-err')?.classList.remove('visible');
      });
    });

    // Attach submit (store ref for submit handler)
    $('stop-confirm-btn').onclick = () => {
      submitStopModal(run.id, selectedQuality, isDelayed);
    };
  }

  function submitStopModal(runId, selectedQuality, isDelayed) {
    const units   = parseInt($('stop-units')?.value, 10);
    const notes   = $('stop-notes')?.value.trim() || '';
    const delayJustification = isDelayed ? ($('stop-delay-reason')?.value.trim() || '') : '';

    let valid = true;

    // Validate units
    const unitsErr = $('stop-units-err');
    const unitsInput = $('stop-units');
    const unitsFail = isNaN(units) || units < 0;
    if (unitsErr) unitsErr.classList.toggle('visible', unitsFail);
    if (unitsInput) unitsInput.classList.toggle('error', unitsFail);
    if (unitsFail) valid = false;

    // Validate quality
    const qErr = $('stop-quality-err');
    if (!selectedQuality) { if (qErr) qErr.classList.add('visible'); valid = false; }

    // Validate delay justification
    if (isDelayed && !delayJustification) {
      const delErr = $('stop-delay-err');
      const delInput = $('stop-delay-reason');
      if (delErr) delErr.classList.add('visible');
      if (delInput) delInput.classList.add('error');
      valid = false;
    }

    if (!valid) return;

    const run = Store.stopRun(runId, { units, qualityCheck: selectedQuality, notes, delayJustification });
    closeStopModal();
    renderRunsTable();

    if (run.isDelayed) {
      App.toast(`Run ${runId} completed (delayed). ⚠`, 'warning');
    } else {
      App.toast(`Run ${runId} completed successfully! ✅`, 'success');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function elapsedSince(isoStr) {
    return (Date.now() - new Date(isoStr).getTime()) / 60000; // minutes
  }

  function formatDuration(minutes) {
    const m = Math.floor(Math.abs(minutes));
    const s = Math.floor((Math.abs(minutes) * 60) % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${String(s).padStart(2, '0')}s`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function init() {
    // Wire up modal close buttons
    $('start-modal-overlay')?.addEventListener('click', e => {
      if (e.target === $('start-modal-overlay')) closeStartModal();
    });
    $('start-modal-close')?.addEventListener('click', closeStartModal);
    $('start-modal-cancel')?.addEventListener('click', closeStartModal);
    $('start-modal-submit')?.addEventListener('click', submitStartModal);

    $('stop-modal-overlay')?.addEventListener('click', e => {
      if (e.target === $('stop-modal-overlay')) closeStopModal();
    });
    $('stop-modal-close')?.addEventListener('click', closeStopModal);
    $('stop-modal-cancel')?.addEventListener('click', closeStopModal);

    initGate();
  }

  return { init };
})();
