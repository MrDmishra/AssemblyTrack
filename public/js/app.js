/**
 * AssemblyTrack — app.js
 * Bootstrap, tab router, dynamic navbar, theme toggle, toast notifications.
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

  // ── Dynamic Navbar ────────────────────────────────────────────────────────
  // Called by employee.js and admin.js whenever auth state changes.

  /**
   * Render the navbar area for the Employee page.
   * @param {string|null} empId - null = gate showing, string = logged in
   */
  function setNavEmployee(empId) {
    const area = document.getElementById('topbar-nav-area');
    if (!area) return;

    if (!empId) {
      // At the gate — show minimal label
      area.innerHTML = `
        <span class="navbar-context-label">
          🏭 Production Floor
        </span>`;
    } else {
      // Logged in — show emp ID pill + tab link to admin + sign out
      area.innerHTML = `
        <div class="navbar-emp-info">
          <span class="navbar-emp-pill">
            <span class="navbar-emp-dot"></span>
            ${empId}
          </span>
          <a href="#admin" data-tab="admin" class="topbar-nav-link">📊 Admin</a>
        </div>
        <button class="btn btn-outline btn-sm" id="navbar-emp-signout" title="Sign out">
          ⎋ Sign Out
        </button>`;

      document.getElementById('navbar-emp-signout')?.addEventListener('click', () => {
        if (typeof EmployeePage !== 'undefined') EmployeePage.signOut();
      });

      // Re-wire tab link
      area.querySelector('[data-tab]')?.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(e.currentTarget.dataset.tab);
      });
    }
  }

  /**
   * Render the navbar area for the Admin page.
   * @param {boolean} loggedIn
   */
  function setNavAdmin(loggedIn) {
    const area = document.getElementById('topbar-nav-area');
    if (!area) return;

    if (!loggedIn) {
      area.innerHTML = `
        <div class="navbar-emp-info">
          <a href="#employee" data-tab="employee" class="topbar-nav-link">🏭 Production Floor</a>
          <span class="navbar-context-label">📊 Admin Login</span>
        </div>`;
    } else {
      area.innerHTML = `
        <div class="navbar-emp-info">
          <a href="#employee" data-tab="employee" class="topbar-nav-link">🏭 Production Floor</a>
          <span class="navbar-emp-pill navbar-admin-pill">
            🔐 Admin
          </span>
        </div>
        <button class="btn btn-outline btn-sm" id="navbar-admin-logout" title="Logout">
          ⎋ Logout
        </button>`;

      document.getElementById('navbar-admin-logout')?.addEventListener('click', () => {
        if (typeof AdminPage !== 'undefined') AdminPage.logout();
      });
    }

    // Re-wire tab links
    area.querySelectorAll('[data-tab]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(e.currentTarget.dataset.tab);
      });
    });
  }

  // ── Tab Router ────────────────────────────────────────────────────────────
  let currentTab = null;

  function navigateTo(tabName) {
    if (currentTab === tabName) return;
    currentTab = tabName;

    const pages = document.querySelectorAll('[data-page]');
    pages.forEach(p => p.classList.toggle('hidden', p.dataset.page !== tabName));

    if (tabName === 'employee' && typeof EmployeePage !== 'undefined') {
      EmployeePage.init();
    }
    if (tabName === 'admin' && typeof AdminPage !== 'undefined') {
      AdminPage.init();
    }

    history.replaceState(null, '', `#${tabName}`);
  }

  function initRouter() {
    // Read initial hash
    const hash = location.hash.replace('#', '') || 'employee';
    navigateTo(hash);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    if (typeof Store !== 'undefined') Store.seedDemo();
    initTheme();
    initRouter();
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { toast, setNavEmployee, setNavAdmin, navigateTo };
})();
