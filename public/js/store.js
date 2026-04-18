/**
 * AssemblyTrack — store.js
 * Data layer: all reads and writes go through this module.
 * Swap the localStorage calls here for fetch() when you have a real backend.
 */

'use strict';

const KEYS = {
  RUNS:    'at_runs',
  COUNTER: 'at_run_counter',
};

/* ─────────────────────────────────────────────
   Run Schema
   {
     id:              string  (RUN-0001)
     employeeId:      string  (EMP-042)
     productName:     string
     category:        string  (assembly|welding|painting|testing|packaging|machining|inspection|other)
     station:         string
     tools:           string[]
     expectedMinutes: number
     startedAt:       ISO string
     stoppedAt:       ISO string | null
     status:          'running' | 'completed' | 'delayed'
     units:           number | null
     qualityCheck:    'pass' | 'fail' | 'rework' | 'partial' | 'pending' | null
     notes:           string
     delayJustification: string
     actualMinutes:   number | null   (filled on stop)
     isDelayed:       boolean
   }
───────────────────────────────────────────── */

const Store = (() => {

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.RUNS) || '[]');
    } catch {
      return [];
    }
  }

  function _save(runs) {
    localStorage.setItem(KEYS.RUNS, JSON.stringify(runs));
  }

  function _nextId() {
    const n = (parseInt(localStorage.getItem(KEYS.COUNTER) || '0', 10)) + 1;
    localStorage.setItem(KEYS.COUNTER, String(n));
    return `RUN-${String(n).padStart(4, '0')}`;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  function getAllRuns() {
    return _load();
  }

  function getRunById(id) {
    return _load().find(r => r.id === id) || null;
  }

  function getRunsByEmployee(empId) {
    return _load().filter(r => r.employeeId === empId);
  }

  function getActiveRuns() {
    return _load().filter(r => r.status === 'running');
  }

  function getCompletedRuns() {
    return _load().filter(r => r.status === 'completed' || r.status === 'delayed');
  }

  /**
   * Start a new production run.
   * @param {object} data
   */
  function startRun(data) {
    const runs = _load();
    const run = {
      id:                  _nextId(),
      employeeId:          data.employeeId,
      productName:         data.productName.trim(),
      category:            data.category,
      station:             data.station.trim(),
      tools:               Array.isArray(data.tools) ? data.tools : [],
      expectedMinutes:     Number(data.expectedMinutes),
      startedAt:           new Date().toISOString(),
      stoppedAt:           null,
      status:              'running',
      units:               null,
      qualityCheck:        null,
      notes:               '',
      delayJustification:  '',
      actualMinutes:       null,
      isDelayed:           false,
    };
    runs.push(run);
    _save(runs);
    return run;
  }

  /**
   * Stop a production run and record completion data.
   * @param {string} id
   * @param {object} completionData
   */
  function stopRun(id, completionData) {
    const runs = _load();
    const idx  = runs.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const run = runs[idx];
    const now          = new Date();
    const startedAt    = new Date(run.startedAt);
    const actualMins   = (now - startedAt) / 60000;
    const isDelayed    = actualMins > run.expectedMinutes;

    runs[idx] = {
      ...run,
      stoppedAt:          now.toISOString(),
      status:             isDelayed ? 'delayed' : 'completed',
      units:              Number(completionData.units) || 0,
      qualityCheck:       completionData.qualityCheck || 'pending',
      notes:              (completionData.notes || '').trim(),
      delayJustification: (completionData.delayJustification || '').trim(),
      actualMinutes:      parseFloat(actualMins.toFixed(2)),
      isDelayed,
    };
    _save(runs);
    return runs[idx];
  }

  /**
   * Soft-delete a run (admin only).
   */
  function deleteRun(id) {
    const runs = _load().filter(r => r.id !== id);
    _save(runs);
  }

  /**
   * Seed some demo data (dev only, called once).
   */
  function seedDemo() {
    if (_load().length > 0) return; // already has data

    const categories = ['assembly', 'welding', 'painting', 'testing', 'packaging', 'machining'];
    const products   = ['Gear Housing A', 'Pump Valve B', 'Control Panel C', 'Bracket D', 'Engine Cover E', 'Circuit Board F'];
    const stations   = ['STA-01', 'STA-02', 'STA-03', 'STA-04', 'STA-05'];
    const employees  = ['EMP-001', 'EMP-007', 'EMP-042', 'EMP-100', 'EMP-215'];
    const toolSets   = [
      ['Torque Wrench', 'Socket Set'],
      ['Welder MIG-200', 'Grinding Disc'],
      ['Spray Gun', 'Masking Tape'],
      ['Multimeter', 'Oscilloscope'],
      ['Packaging Machine', 'Label Printer'],
      ['CNC Mill', 'Micrometer'],
    ];

    const now = Date.now();
    const day = 86400000;

    const demoRuns = [];
    for (let i = 0; i < 30; i++) {
      const catIdx   = i % categories.length;
      const expected = [30, 45, 60, 90, 120][i % 5];
      const offset   = Math.random() * 0.4 - 0.1; // -10% to +30% variance
      const actual   = expected * (1 + offset);
      const isDelayed = actual > expected;
      const daysAgo  = Math.floor(i / 4);
      const startTs  = new Date(now - daysAgo * day - Math.random() * day * 0.5);
      const stopTs   = new Date(startTs.getTime() + actual * 60000);

      demoRuns.push({
        id:                  `RUN-${String(i + 1).padStart(4, '0')}`,
        employeeId:          employees[i % employees.length],
        productName:         products[catIdx],
        category:            categories[catIdx],
        station:             stations[i % stations.length],
        tools:               toolSets[catIdx],
        expectedMinutes:     expected,
        startedAt:           startTs.toISOString(),
        stoppedAt:           stopTs.toISOString(),
        status:              isDelayed ? 'delayed' : 'completed',
        units:               Math.floor(Math.random() * 40) + 10,
        qualityCheck:        ['pass', 'pass', 'pass', 'rework', 'fail'][i % 5],
        notes:               i % 3 === 0 ? 'Routine check complete.' : '',
        delayJustification:  isDelayed ? 'Material shortage caused brief stoppage.' : '',
        actualMinutes:       parseFloat(actual.toFixed(2)),
        isDelayed,
      });
    }

    localStorage.setItem(KEYS.COUNTER, '30');
    _save(demoRuns);
  }

  /**
   * Export all completed runs as CSV string.
   * @param {object[]} [rows] - subset to export (filtered). Defaults to all completed.
   */
  function toCSV(rows) {
    const data = rows || getCompletedRuns();
    const headers = [
      'Run ID', 'Employee ID', 'Product', 'Category', 'Station',
      'Tools', 'Expected (min)', 'Actual (min)', 'Units',
      'Quality', 'Delayed', 'Delay Justification',
      'Started At', 'Stopped At', 'Notes',
    ];

    const escape = v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = [
      headers.join(','),
      ...data.map(r => [
        r.id,
        r.employeeId,
        r.productName,
        r.category,
        r.station,
        (r.tools || []).join('; '),
        r.expectedMinutes,
        r.actualMinutes ?? '',
        r.units ?? '',
        r.qualityCheck ?? '',
        r.isDelayed ? 'Yes' : 'No',
        r.delayJustification,
        r.startedAt,
        r.stoppedAt ?? '',
        r.notes,
      ].map(escape).join(',')),
    ];

    return '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM
  }

  // ── Stats helpers (used by admin dashboard) ─────────────────────────────────

  function getStats(runs) {
    runs = runs || getCompletedRuns();
    const total    = runs.length;
    const delayed  = runs.filter(r => r.isDelayed).length;
    const units    = runs.reduce((s, r) => s + (r.units || 0), 0);
    const onTime   = total - delayed;
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return { total, delayed, units, onTime, onTimeRate };
  }

  /**
   * Group completed runs by calendar day for the line chart.
   * Returns [{date, units, runs}]
   */
  function getDailyTrend(runs, days = 14) {
    runs = runs || getCompletedRuns();
    const map = {};
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, units: 0, runs: 0 };
    }

    runs.forEach(r => {
      const key = r.startedAt.slice(0, 10);
      if (map[key]) {
        map[key].units += (r.units || 0);
        map[key].runs  += 1;
      }
    });

    return Object.values(map);
  }

  return {
    getAllRuns,
    getRunById,
    getRunsByEmployee,
    getActiveRuns,
    getCompletedRuns,
    startRun,
    stopRun,
    deleteRun,
    seedDemo,
    toCSV,
    getStats,
    getDailyTrend,
  };
})();
