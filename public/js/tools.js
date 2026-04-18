/**
 * AssemblyTrack — tools.js
 * Tool tag autocomplete widget.
 * Usage:
 *   const picker = ToolPicker.create(wrapperEl, inputEl, onChangeCallback);
 *   picker.getTags()   → string[]
 *   picker.reset()
 */

'use strict';

const TOOL_CATALOG = [
  // Hand tools
  { name: 'Torque Wrench',        category: 'Hand Tools' },
  { name: 'Socket Set',           category: 'Hand Tools' },
  { name: 'Hex Key Set',          category: 'Hand Tools' },
  { name: 'Screwdriver Set',      category: 'Hand Tools' },
  { name: 'Pliers Set',           category: 'Hand Tools' },
  { name: 'Wire Cutters',         category: 'Hand Tools' },
  { name: 'Crimp Tool',           category: 'Hand Tools' },
  { name: 'Hammer',               category: 'Hand Tools' },
  { name: 'Rubber Mallet',        category: 'Hand Tools' },
  { name: 'File Set',             category: 'Hand Tools' },
  { name: 'Tap & Die Set',        category: 'Hand Tools' },
  { name: 'Thread Gauge',         category: 'Hand Tools' },

  // Power tools
  { name: 'Impact Driver',        category: 'Power Tools' },
  { name: 'Angle Grinder',        category: 'Power Tools' },
  { name: 'Grinding Disc',        category: 'Power Tools' },
  { name: 'Drill Press',          category: 'Power Tools' },
  { name: 'Cordless Drill',       category: 'Power Tools' },
  { name: 'Jigsaw',               category: 'Power Tools' },
  { name: 'Circular Saw',         category: 'Power Tools' },
  { name: 'Belt Sander',          category: 'Power Tools' },
  { name: 'Heat Gun',             category: 'Power Tools' },

  // Welding
  { name: 'Welder MIG-200',       category: 'Welding' },
  { name: 'Welder TIG-300',       category: 'Welding' },
  { name: 'Welding Helmet',       category: 'Welding' },
  { name: 'Wire Brush',           category: 'Welding' },
  { name: 'Chipping Hammer',      category: 'Welding' },
  { name: 'Weld Gauge',           category: 'Welding' },
  { name: 'Plasma Cutter',        category: 'Welding' },

  // Measurement
  { name: 'Micrometer',           category: 'Measurement' },
  { name: 'Vernier Caliper',      category: 'Measurement' },
  { name: 'Dial Indicator',       category: 'Measurement' },
  { name: 'Multimeter',           category: 'Measurement' },
  { name: 'Oscilloscope',         category: 'Measurement' },
  { name: 'Coordinate Measuring Machine', category: 'Measurement' },
  { name: 'Surface Plate',        category: 'Measurement' },
  { name: 'Go/No-Go Gauge',       category: 'Measurement' },

  // Painting / Finishing
  { name: 'Spray Gun',            category: 'Painting' },
  { name: 'Masking Tape',         category: 'Painting' },
  { name: 'Paint Booth Controller', category: 'Painting' },
  { name: 'Sandpaper Set',        category: 'Painting' },
  { name: 'Airbrush Kit',         category: 'Painting' },
  { name: 'Degreaser',            category: 'Painting' },
  { name: 'Primer Gun',           category: 'Painting' },

  // Machinery / CNC
  { name: 'CNC Mill',             category: 'Machinery' },
  { name: 'CNC Lathe',            category: 'Machinery' },
  { name: 'Hydraulic Press',      category: 'Machinery' },
  { name: 'Punch Press',          category: 'Machinery' },
  { name: 'Band Saw',             category: 'Machinery' },
  { name: 'Broaching Machine',    category: 'Machinery' },
  { name: 'Injection Molder',     category: 'Machinery' },

  // Testing / QC
  { name: 'Pressure Tester',      category: 'Testing' },
  { name: 'Leak Detector',        category: 'Testing' },
  { name: 'Hardness Tester',      category: 'Testing' },
  { name: 'Tensile Tester',       category: 'Testing' },
  { name: 'Vision Inspection System', category: 'Testing' },
  { name: 'Ultrasonic Tester',    category: 'Testing' },
  { name: 'Spectrometer',         category: 'Testing' },

  // Packaging
  { name: 'Packaging Machine',    category: 'Packaging' },
  { name: 'Label Printer',        category: 'Packaging' },
  { name: 'Strapping Tool',       category: 'Packaging' },
  { name: 'Shrink Wrap Machine',  category: 'Packaging' },
  { name: 'Pallet Jack',          category: 'Packaging' },
  { name: 'Barcode Scanner',      category: 'Packaging' },

  // Safety
  { name: 'Safety Glasses',       category: 'Safety' },
  { name: 'Face Shield',          category: 'Safety' },
  { name: 'Hearing Protection',   category: 'Safety' },
  { name: 'Steel-Toe Boots',      category: 'Safety' },
  { name: 'Cut-Resistant Gloves', category: 'Safety' },
  { name: 'Respirator',           category: 'Safety' },
];

const ToolPicker = (() => {

  /**
   * Create a tag picker inside a wrapper element.
   * @param {HTMLElement} wrapper        - .tag-input-wrapper element
   * @param {HTMLElement} hiddenTextInput- <input> used for storing raw text
   * @param {function}    onChange       - called with current tags[]
   */
  function create(wrapper, onChange) {
    let tags = [];
    let dropdownVisible = false;
    let activeIdx = -1;

    // Build inner text input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'tag-text-input';
    textInput.placeholder = 'Search tools…';
    textInput.setAttribute('autocomplete', 'off');
    wrapper.appendChild(textInput);

    // Dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown hidden';
    wrapper.style.position = 'relative';
    wrapper.appendChild(dropdown);

    // ── Render ──────────────────────────────────────────────────────────────

    function renderTags() {
      // Remove all existing chips
      wrapper.querySelectorAll('.tag-chip').forEach(el => el.remove());
      tags.forEach((tag, i) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <button class="tag-chip-remove" data-idx="${i}" title="Remove">×</button>`;
        wrapper.insertBefore(chip, textInput);
      });
    }

    function renderDropdown(query) {
      const q = query.toLowerCase().trim();
      let filtered = q
        ? TOOL_CATALOG.filter(t => t.name.toLowerCase().includes(q))
        : TOOL_CATALOG.slice(0, 20);

      // Exclude already-selected
      filtered = filtered.filter(t => !tags.includes(t.name));

      if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">No results — press Enter to add custom</div>';
      } else {
        dropdown.innerHTML = filtered.slice(0, 12).map((t, i) =>
          `<div class="autocomplete-item" data-name="${t.name}" data-i="${i}">
            <span>${t.name}</span>
            <span class="item-sub">${t.category}</span>
          </div>`
        ).join('');
      }
      activeIdx = -1;
      showDropdown();
    }

    function showDropdown() {
      dropdown.classList.remove('hidden');
      dropdownVisible = true;
    }

    function hideDropdown() {
      dropdown.classList.add('hidden');
      dropdownVisible = false;
      activeIdx = -1;
    }

    function updateActive() {
      const items = dropdown.querySelectorAll('.autocomplete-item[data-name]');
      items.forEach((el, i) => {
        el.classList.toggle('active', i === activeIdx);
        if (i === activeIdx) el.scrollIntoView({ block: 'nearest' });
      });
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    function addTag(name) {
      name = name.trim();
      if (!name || tags.includes(name)) return;
      tags.push(name);
      renderTags();
      textInput.value = '';
      hideDropdown();
      if (onChange) onChange([...tags]);
    }

    function removeTag(idx) {
      tags.splice(idx, 1);
      renderTags();
      if (onChange) onChange([...tags]);
    }

    function reset() {
      tags = [];
      renderTags();
      textInput.value = '';
      hideDropdown();
    }

    function setTags(arr) {
      tags = Array.isArray(arr) ? [...arr] : [];
      renderTags();
    }

    // ── Events ────────────────────────────────────────────────────────────────

    textInput.addEventListener('input', () => {
      renderDropdown(textInput.value);
    });

    textInput.addEventListener('focus', () => {
      wrapper.classList.add('focused');
      renderDropdown(textInput.value);
    });

    textInput.addEventListener('blur', () => {
      wrapper.classList.remove('focused');
      // Delay so click on dropdown registers first
      setTimeout(() => hideDropdown(), 150);
    });

    textInput.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.autocomplete-item[data-name]');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        updateActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, -1);
        updateActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) {
          addTag(items[activeIdx].dataset.name);
        } else if (textInput.value.trim()) {
          addTag(textInput.value);
        }
      } else if (e.key === 'Backspace' && !textInput.value && tags.length) {
        removeTag(tags.length - 1);
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    dropdown.addEventListener('mousedown', e => {
      const item = e.target.closest('.autocomplete-item[data-name]');
      if (item) {
        e.preventDefault();
        addTag(item.dataset.name);
        textInput.focus();
      }
    });

    wrapper.addEventListener('click', e => {
      const btn = e.target.closest('.tag-chip-remove');
      if (btn) {
        removeTag(parseInt(btn.dataset.idx, 10));
      } else {
        textInput.focus();
      }
    });

    return { getTags: () => [...tags], reset, setTags };
  }

  return { create, CATALOG: TOOL_CATALOG };
})();
