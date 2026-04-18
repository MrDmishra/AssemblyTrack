/**
 * AssemblyTrack — admin.js
 * Admin dashboard: login, metrics, charts, table, CSV export.
 *
 * ⚠ CHANGE BEFORE DEPLOYING:
 *   Update the CREDENTIALS object below with a strong password.
 */

'use strict';

const AdminPage = (() => {

  // ── Credentials ──────────────────────────────────────────────────────────
  const CREDENTIALS = {
    username: 'admin',
    password: 'admin123',
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let isLoggedIn    = false;
  let charts        = {};
  let filterState   = {
    dateFrom: '', dateTo: '', category: '', status: '', search: '',
  };
  let sortState     = { col: 'startedAt', dir: 'desc' };
  let filteredRows  = [];
  let pageState     = { current: 1, size: 25 };

  const $ = id => document.getElementById(id);

  // ── Init ──────────────────────────────────────────────────────────────────
  let filtersBound = false;

  function init() {
    if (sessionStorage.getItem('at_admin') === '1') {
      isLoggedIn = true;
      showDashboard();
    } else {
      showLogin();
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  function showLogin() {
    $('admin-login').classList.remove('hidden');
    $('admin-dashboard').classList.add('hidden');

    // Update navbar to show login state
    App.setNavAdmin(false);

    const btn    = $('admin-login-btn');
    const userEl = $('admin-user');
    const passEl = $('admin-pass');
    const errEl  = $('admin-login-err');

    const attempt = () => {
      errEl.textContent = '';
      userEl.classList.remove('error');
      passEl.classList.remove('error');

      if (userEl.value === CREDENTIALS.username && passEl.value === CREDENTIALS.password) {
        sessionStorage.setItem('at_admin', '1');
        isLoggedIn = true;
        showDashboard();
      } else {
        errEl.textContent = 'Invalid username or password.';
        passEl.classList.add('error');
        passEl.value = '';
        passEl.focus();
      }
    };

    btn.onclick = attempt;
    passEl.onkeydown = e => { if (e.key === 'Enter') attempt(); };
    userEl.onkeydown = e => { if (e.key === 'Enter') passEl.focus(); };
  }

  function logout() {
    sessionStorage.removeItem('at_admin');
    isLoggedIn = false;
    filtersBound = false;
    destroyCharts();
    $('admin-login').classList.remove('hidden');
    $('admin-dashboard').classList.add('hidden');
    $('admin-user').value = '';
    $('admin-pass').value = '';
    $('admin-login-err').textContent = '';
    App.setNavAdmin(false);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  function showDashboard() {
    $('admin-login').classList.add('hidden');
    $('admin-dashboard').classList.remove('hidden');

    // Update navbar to show logged-in state + logout button
    App.setNavAdmin(true);

    if (!filtersBound) {
      filtersBound = true;
      initFilters();
    }
    refresh();
  }

  function refresh() {
    const completed = Store.getCompletedRuns();
    filteredRows    = applyFilters(completed);
    // Reset to page 1 when filters change
    pageState.current = 1;
    renderMetrics(filteredRows);
    renderCharts(filteredRows);
    renderTable(filteredRows);
  }

  // ── Metrics ───────────────────────────────────────────────────────────────
  function renderMetrics(rows) {
    const stats = Store.getStats(rows);
    const active = Store.getActiveRuns().length;

    setText('m-total',   stats.total);
    setText('m-active',  active);
    setText('m-delayed', stats.delayed);
    setText('m-units',   stats.units.toLocaleString());
    setText('m-ontime',  `${stats.onTimeRate}%`);

    // Sub-labels
    const sub = $('m-ontime-sub');
    if (sub) sub.textContent = `${stats.onTime} on-time / ${stats.total} total`;
  }

  function setText(id, val) {
    const el = $(id);
    if (el) el.textContent = val;
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  function initFilters() {
    const fields = ['filter-date-from', 'filter-date-to', 'filter-category', 'filter-status', 'filter-search'];
    fields.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        filterState.dateFrom = $('filter-date-from')?.value || '';
        filterState.dateTo   = $('filter-date-to')?.value   || '';
        filterState.category = $('filter-category')?.value  || '';
        filterState.status   = $('filter-status')?.value    || '';
        filterState.search   = $('filter-search')?.value.toLowerCase().trim() || '';
        refresh();
      });
    });

    $('filter-reset-btn')?.addEventListener('click', () => {
      fields.forEach(id => { const el = $(id); if (el) el.value = ''; });
      filterState = { dateFrom: '', dateTo: '', category: '', status: '', search: '' };
      refresh();
    });

    $('export-csv-btn')?.addEventListener('click', exportCSV);

    // Page size selector
    $('page-size-select')?.addEventListener('change', e => {
      pageState.size    = parseInt(e.target.value, 10);
      pageState.current = 1;
      renderTable(filteredRows);
    });
  }

  function applyFilters(runs) {
    let rows = [...runs];

    if (filterState.dateFrom) {
      rows = rows.filter(r => r.startedAt.slice(0, 10) >= filterState.dateFrom);
    }
    if (filterState.dateTo) {
      rows = rows.filter(r => r.startedAt.slice(0, 10) <= filterState.dateTo);
    }
    if (filterState.category) {
      rows = rows.filter(r => r.category === filterState.category);
    }
    if (filterState.status) {
      if (filterState.status === 'delayed')   rows = rows.filter(r => r.isDelayed);
      if (filterState.status === 'completed') rows = rows.filter(r => !r.isDelayed);
    }
    if (filterState.search) {
      const q = filterState.search;
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.station.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }

    return sortRows(rows);
  }

  function sortRows(rows) {
    const { col, dir } = sortState;
    return [...rows].sort((a, b) => {
      let va = a[col], vb = b[col];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 :  1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
    charts = {};
  }

  function renderCharts(rows) {
    destroyCharts();

    // Chart.js global defaults for dark mode
    if (window.Chart) {
      Chart.defaults.color          = '#94a3b8';
      Chart.defaults.borderColor    = '#334155';
      Chart.defaults.backgroundColor = 'rgba(59,130,246,0.6)';
    }

    renderDurationChart(rows);
    renderOnTimeChart(rows);
    renderDailyChart(rows);
  }

  function renderDurationChart(rows) {
    const el = $('chart-duration');
    if (!el || !window.Chart) return;

    // Take last 10 completed runs for the bar chart
    const data = [...rows].slice(-12);
    charts.duration = new Chart(el, {
      type: 'bar',
      data: {
        labels: data.map(r => r.id),
        datasets: [
          {
            label: 'Actual (min)',
            data: data.map(r => r.actualMinutes || 0),
            backgroundColor: data.map(r => r.isDelayed ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'),
            borderColor:     data.map(r => r.isDelayed ? '#ef4444' : '#22c55e'),
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Expected (min)',
            data: data.map(r => r.expectedMinutes),
            backgroundColor: 'rgba(59,130,246,0.25)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4,
            type: 'line',
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} min`,
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 45, font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  function renderOnTimeChart(rows) {
    const el = $('chart-ontime');
    if (!el || !window.Chart) return;

    const onTime  = rows.filter(r => !r.isDelayed).length;
    const delayed = rows.filter(r => r.isDelayed).length;

    charts.ontime = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['On-Time', 'Delayed'],
        datasets: [{
          data: [onTime, delayed],
          backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)'],
          borderColor:     ['#22c55e', '#ef4444'],
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed} (${rows.length ? Math.round(ctx.parsed / rows.length * 100) : 0}%)`,
            },
          },
        },
      },
    });
  }

  function renderDailyChart(rows) {
    const el = $('chart-daily');
    if (!el || !window.Chart) return;

    const trend = Store.getDailyTrend(rows, 14);

    charts.daily = new Chart(el, {
      type: 'line',
      data: {
        labels: trend.map(d => {
          const dt = new Date(d.date + 'T00:00:00');
          return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Units',
            data: trend.map(d => d.units),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.12)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#06b6d4',
            tension: 0.4,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Runs',
            data: trend.map(d => d.runs),
            borderColor: '#a78bfa',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#a78bfa',
            borderDash: [4, 4],
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        },
        scales: {
          x: { ticks: { maxRotation: 35, font: { size: 10 } } },
          y:  { beginAtZero: true, ticks: { font: { size: 10 } }, title: { display: true, text: 'Units', font: { size: 10 } } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } }, title: { display: true, text: 'Runs', font: { size: 10 } } },
        },
      },
    });
  }

  // ── Records Table ─────────────────────────────────────────────────────────
  function renderTable(rows) {
    const tbody   = $('admin-records-tbody');
    const countEl = $('admin-record-count');
    if (!tbody) return;

    const total      = rows.length;
    const pageSize   = pageState.size;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Clamp current page
    if (pageState.current > totalPages) pageState.current = totalPages;
    if (pageState.current < 1)          pageState.current = 1;

    const start    = (pageState.current - 1) * pageSize;
    const end      = Math.min(start + pageSize, total);
    const pageRows = rows.slice(start, end);

    // Record count label
    if (countEl) {
      countEl.textContent = total === 0
        ? '0 records'
        : `${start + 1}–${end} of ${total} record${total !== 1 ? 's' : ''}`;
    }

    if (total === 0) {
      tbody.innerHTML = `
        <tr><td colspan="10">
          <div class="table-empty">
            <div class="table-empty-icon">📋</div>
            <div class="table-empty-text">No records match your filters.</div>
          </div>
        </td></tr>`;
      renderPagination(total, totalPages);
      return;
    }

    tbody.innerHTML = pageRows.map(r => {
      const qualBadge = {
        pass:    '<span class="badge badge-success">✅ Pass</span>',
        fail:    '<span class="badge badge-danger">❌ Fail</span>',
        rework:  '<span class="badge badge-warning">🔧 Rework</span>',
        partial: '<span class="badge badge-warning">🔶 Partial</span>',
        pending: '<span class="badge badge-neutral">⏳ Pending</span>',
      }[r.qualityCheck] || '<span class="badge badge-neutral">—</span>';

      const statusBadge = r.isDelayed
        ? '<span class="badge badge-danger">⚠ Delayed</span>'
        : '<span class="badge badge-success">✅ On Time</span>';

      const actualMin = r.actualMinutes != null ? r.actualMinutes.toFixed(1) : '—';
      const diff      = r.actualMinutes != null
        ? (r.actualMinutes - r.expectedMinutes).toFixed(1)
        : '—';
      const diffStr   = r.actualMinutes != null
        ? `<span class="${r.isDelayed ? 'text-danger' : 'text-success'}">${r.isDelayed ? '+' : ''}${diff} min</span>`
        : '—';

      return `
        <tr>
          <td><span class="font-mono text-sm font-bold">${r.id}</span></td>
          <td><span class="font-mono text-sm">${r.employeeId}</span></td>
          <td>
            <div class="font-bold truncate" style="max-width:160px" title="${esc(r.productName)}">${esc(r.productName)}</div>
            <div class="text-xs text-muted">${esc(r.station)}</div>
          </td>
          <td><span class="category-pill cat-${r.category}">${cap(r.category)}</span></td>
          <td>${statusBadge}</td>
          <td class="text-right">
            <span class="font-mono">${actualMin}</span>
            <div class="text-xs">${diffStr}</div>
          </td>
          <td class="text-right font-mono">${r.expectedMinutes}</td>
          <td class="text-right">${r.units != null ? r.units : '—'}</td>
          <td>${qualBadge}</td>
          <td class="text-xs text-muted">${formatDate(r.startedAt)}</td>
        </tr>`;
    }).join('');

    // Sortable headers
    document.querySelectorAll('#admin-records-table th.sortable').forEach(th => {
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortState.col === col) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.col = col;
          sortState.dir = 'desc';
        }
        document.querySelectorAll('#admin-records-table th').forEach(t => {
          t.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        pageState.current = 1;
        refresh();
      };
    });

    renderPagination(total, totalPages);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function renderPagination(total, totalPages) {
    const infoEl     = $('pagination-info');
    const controlsEl = $('pagination-controls');
    const barEl      = $('pagination-bar');

    if (!controlsEl) return;

    // Hide bar when nothing to paginate
    if (barEl) barEl.classList.toggle('hidden', total === 0);
    if (total === 0) return;

    const cur = pageState.current;

    // Build page buttons — show window of 5 around current
    const btns = [];

    // Prev
    btns.push(`<button class="page-btn" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} title="Previous page">‹</button>`);

    // First page
    if (cur > 3) {
      btns.push(`<button class="page-btn" data-page="1">1</button>`);
      if (cur > 4) btns.push(`<span class="page-ellipsis">…</span>`);
    }

    // Window
    for (let p = Math.max(1, cur - 2); p <= Math.min(totalPages, cur + 2); p++) {
      btns.push(`<button class="page-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`);
    }

    // Last page
    if (cur < totalPages - 2) {
      if (cur < totalPages - 3) btns.push(`<span class="page-ellipsis">…</span>`);
      btns.push(`<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    // Next
    btns.push(`<button class="page-btn" data-page="${cur + 1}" ${cur === totalPages ? 'disabled' : ''} title="Next page">›</button>`);

    controlsEl.innerHTML = btns.join('');

    // Wire clicks
    controlsEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (p < 1 || p > totalPages || p === pageState.current) return;
        pageState.current = p;
        renderTable(filteredRows);
        // Scroll table into view smoothly
        document.getElementById('admin-records-table')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    // Sync page-size select value (in case state differs from DOM)
    const sel = $('page-size-select');
    if (sel && sel.value !== String(pageState.size)) {
      sel.value = String(pageState.size);
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const csv  = Store.toCSV(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ts   = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `assembly-track-export-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast(`Exported ${filteredRows.length} records to CSV 📥`, 'success');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  return { init, logout };
})();
