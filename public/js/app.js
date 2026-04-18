/**
 * AssemblyTrack — app.js
 * Bootstrap, tab router, theme toggle, toast notifications.
 */

'use strict';

const App = (() => {

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" title="Dismiss">×</button>`;

    container.appendChild(el);

    const remove = () => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, duration);
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('at_theme') || 'dark';
    applyTheme(saved);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next    = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('at_theme', next);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // ── Tab Router ────────────────────────────────────────────────────────────
  let currentTab = null;

  function initRouter() {
    const tabs = document.querySelectorAll('[data-tab]');
    const pages = document.querySelectorAll('[data-page]');

    function navigateTo(tabName) {
      if (currentTab === tabName) return;
      currentTab = tabName;

      // Update nav links
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

      // Show / hide pages
      pages.forEach(p => p.classList.toggle('hidden', p.dataset.page !== tabName));

      // Init page module on first visit
      if (tabName === 'employee' && typeof EmployeePage !== 'undefined') {
        EmployeePage.init();
      }
      if (tabName === 'admin' && typeof AdminPage !== 'undefined') {
        AdminPage.init();
      }

      // Update hash
      history.replaceState(null, '', `#${tabName}`);
    }

    tabs.forEach(t => {
      t.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(t.dataset.tab);
      });
    });

    // Read initial hash
    const hash = location.hash.replace('#', '') || 'employee';
    navigateTo(hash);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    // Seed demo data (only if empty)
    if (typeof Store !== 'undefined') Store.seedDemo();

    initTheme();
    initRouter();
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { toast };
})();
