/* Room Control Card — MIT License, Copyright (c) 2026 soundclub83 */
(() => {
  'use strict';
  const TYPE = 'room-control-card';
  const TOGGLE = new Set(['light', 'switch', 'input_boolean', 'fan']);
  const domain = (id) => id.split('.')[0];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const actionObject = (value) => typeof value === 'string' ? { action: value } : value;
  const actionKind = (value) => actionObject(value)?.action || 'none';
  function checkAction(value, entity, readOnly = false) {
    const action = actionObject(value);
    const allowed = readOnly ? ['none', 'more-info'] : ['none', 'more-info', 'toggle', 'perform-action', 'navigate'];
    if (!action || !allowed.includes(action.action)) throw new Error('Ungültige Aktion für diesen Bereich.');
    if (action.action === 'toggle' && !TOGGLE.has(domain(entity || ''))) throw new Error('Diese Entität unterstützt hier kein Umschalten.');
    if (action.action === 'more-info' && !entity) throw new Error('Für Details bitte eine Entität auswählen.');
    if (action.action === 'perform-action' && action.perform_action && !/^[a-z_]+\.[a-z0-9_]+$/.test(action.perform_action)) throw new Error('Ungültiger Aktionsname.');
    if (action.action === 'navigate' && action.navigation_path && (typeof action.navigation_path !== 'string' || !action.navigation_path.startsWith('/') || action.navigation_path.startsWith('//'))) throw new Error('Navigation benötigt einen lokalen Pfad beginnend mit /.');
  }
  function normalize(config) {
    if (!config || typeof config !== 'object') throw new Error('Eine Kartenkonfiguration ist erforderlich.');
    const result = { ...clone(config), type: `custom:${TYPE}` };
    for (const key of ['name', 'icon']) {
      if (result[key] !== undefined && typeof result[key] !== 'string') throw new Error(`${key} muss Text sein.`);
    }
    for (const key of ['devices', 'statuses']) {
      if (result[key] !== undefined && !Array.isArray(result[key])) throw new Error(`${key} muss eine Liste sein.`);
      result[key] = (result[key] || []).map((raw) => {
        const item = typeof raw === 'string' ? { entity: raw } : clone(raw);
        if (!item || typeof item.entity !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(item.entity)) throw new Error('Bitte eine gültige Entität auswählen.');
        for (const field of ['name', 'icon']) {
          if (item[field] !== undefined && typeof item[field] !== 'string') throw new Error(`${field} muss Text sein.`);
        }
        const readOnly = key === 'statuses';
        item.action = item.action || (readOnly ? 'more-info' : ['light', 'switch', 'input_boolean'].includes(domain(item.entity)) ? 'toggle' : 'more-info');
        item.hold_action = item.hold_action || (readOnly ? 'none' : 'more-info');
        if (!readOnly) {
          item.icon_action = item.icon_action || 'more-info';
          item.icon_hold_action = item.icon_hold_action || 'none';
        }
        for (const field of ['action', 'hold_action', ...(!readOnly ? ['icon_action', 'icon_hold_action'] : [])]) checkAction(item[field], item.entity, readOnly);
        if (item.state_labels !== undefined && (!item.state_labels || typeof item.state_labels !== 'object' || Array.isArray(item.state_labels) || Object.values(item.state_labels).some((label) => typeof label !== 'string'))) throw new Error('Statustexte müssen Zustand/Text-Zuordnungen sein.');
        return item;
      });
    }
    if (result.subbuttons !== undefined && !Array.isArray(result.subbuttons)) throw new Error('subbuttons muss eine Liste sein.');
    result.subbuttons = (result.subbuttons || []).map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Ungültiger Subbutton.');
      const item = clone(raw);
      for (const key of ['name', 'icon', 'entity']) if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error(`${key} muss Text sein.`);
      if (item.entity && !/^[a-z_]+\.[a-z0-9_]+$/.test(item.entity)) throw new Error('Ungültige Subbutton-Entität.');
      for (const key of ['background_color', 'text_color']) if (item[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(item[key])) throw new Error('Farben bitte als #RRGGBB angeben.');
      item.background_color = item.background_color || '#ffaa50';
      item.text_color = item.text_color || '#ffb366';
      item.background_opacity = item.background_opacity ?? 0.28;
      if (typeof item.background_opacity !== 'number' || !Number.isFinite(item.background_opacity) || item.background_opacity < 0 || item.background_opacity > 1) throw new Error('Hintergrunddeckkraft muss zwischen 0 und 1 liegen.');
      item.tap_action = item.tap_action || (domain(item.entity || '') === 'script' ? { action: 'perform-action', perform_action: 'script.turn_on', target: { entity_id: item.entity } } : { action: TOGGLE.has(domain(item.entity || '')) ? 'toggle' : item.entity ? 'more-info' : 'none' });
      item.hold_action = item.hold_action || { action: item.entity ? 'more-info' : 'none' };
      for (const key of ['tap_action', 'hold_action']) checkAction(item[key], item.entity);
      if (item.state_colors !== undefined && !Array.isArray(item.state_colors)) throw new Error('state_colors muss eine Liste sein.');
      item.state_colors = (item.state_colors || []).map((rule) => {
        if (!rule || typeof rule.state !== 'string') throw new Error('Farbregel benötigt einen Zustand.');
        for (const key of ['background_color', 'text_color']) if (rule[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(rule[key])) throw new Error('Farben bitte als #RRGGBB angeben.');
        if (rule.background_opacity !== undefined && (typeof rule.background_opacity !== 'number' || !Number.isFinite(rule.background_opacity) || rule.background_opacity < 0 || rule.background_opacity > 1)) throw new Error('Ungültige Deckkraft in Farbregel.');
        return rule;
      });
      return item;
    });
    return result;
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(value) { const node = el('ha-icon', 'icon'); node.setAttribute('icon', value); return node; }
  const css = `
    :host{display:block;color:var(--room-control-text,#d5dee6)}*{box-sizing:border-box}
    ha-card{padding:var(--room-control-padding,12px);border-radius:var(--room-control-radius,24px);background:var(--room-control-background,linear-gradient(145deg,rgba(37,53,65,.75),rgba(22,34,44,.94)));border:1px solid rgba(155,180,200,.10);box-shadow:0 6px 24px rgba(0,0,0,.10);overflow:hidden}
    .header{display:flex;align-items:center;gap:16px;min-height:38px;margin:0 8px 16px}.header::after{content:"";height:2px;min-width:16px;flex:1;border-radius:999px;background:var(--room-control-header-line,linear-gradient(90deg,rgba(255,170,80,.65),rgba(255,170,80,.18)))}
    .title{font-size:var(--room-control-title-size,22px);font-weight:700;letter-spacing:.04em;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.header>.icon{--mdc-icon-size:24px;color:var(--room-control-text,#d5dee6)}
    .heading{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;margin-bottom:16px}.heading .header{flex:1;min-width:140px;margin-bottom:0}.subbuttons{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}.subbutton{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:999px;min-height:24px;padding:3px 9px;font:inherit;font-size:12px;cursor:pointer}.subbutton .icon{color:inherit;--mdc-icon-size:16px}.subbutton:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.subbutton:disabled{opacity:.5;cursor:default}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--room-control-gap,8px)}
    .item{display:flex;align-items:center;gap:10px;min-width:0;width:100%;text-align:start;color:var(--room-control-text,#d5dee6);background:var(--room-control-item-background,rgba(145,165,185,.055));border:1px solid rgba(150,170,185,.08);border-radius:var(--room-control-item-radius,16px);padding:10px 12px;font:inherit;height:64px;box-shadow:none;transition:background .2s ease,border-color .2s ease;touch-action:manipulation}
    button.item{cursor:pointer}button.item:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}button:disabled{cursor:default;opacity:.5}
    .icon{flex:none;--mdc-icon-size:23px;color:var(--room-control-muted,#8d9ba7)}.icon-cell{display:flex;align-items:center;justify-content:center;flex:none;width:34px;height:38px;border-radius:11px;background:rgba(145,165,185,.07)}
    .text{min-width:0;flex:1}.name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.state{font-size:11px;color:var(--room-control-muted,#8293a2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .device{--active-rgb:130,184,231;--active-color:#82b8e7}.device[data-domain="light"]{--active-rgb:237,196,122;--active-color:#edc47a}
    .device.active{background:rgba(var(--active-rgb),.11);border-color:rgba(var(--active-rgb),.23)}.device.active .icon,.device.active .state{color:var(--room-control-active-color,var(--active-color))}.device.active .icon-cell{background:rgba(var(--active-rgb),.13)}
    .statuses{margin-top:16px;padding-top:12px;border-top:1px solid rgba(145,170,190,.12)}.statuses.without-devices{margin-top:0;padding-top:0;border-top:0}
    .section-title{font-size:9px;font-weight:600;color:var(--room-control-muted,#8095a5);margin:0 2px 10px;text-transform:uppercase;letter-spacing:.12em}
    .status{height:46px;padding:8px 10px;gap:7px;border-radius:12px;background:rgba(135,160,180,.035);border-color:rgba(145,170,190,.045)}.status>.icon{width:22px;--mdc-icon-size:17px;color:#8194a3}.status .name{font-size:10px;font-weight:500;color:var(--room-control-status-name,#6cdbc9)}.status .state{font-size:12px;font-weight:500;margin-top:0;color:#c9d6df}.status.active .icon,.status.active .state{color:var(--room-control-status-active,#7cd7b4)}
    .tile-main{flex:1;min-width:0;text-align:start;font:inherit;color:inherit;background:transparent;border:0;padding:0;min-height:42px;cursor:pointer}.icon-cell.icon-button{border:0;padding:0;cursor:pointer}.tile-main:focus-visible,.icon-button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
    @media(max-width:600px){:host([companion]) .heading{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}:host([companion]) .heading .header{margin:0;min-height:30px;gap:10px}:host([companion]) .header::after{display:none}:host([companion]) .title{font-size:20px;letter-spacing:.02em}:host([companion]) .subbuttons{width:100%;margin:0;gap:8px}:host([companion]) .subbutton{flex:1 1 0;min-width:54px;min-height:38px;border-radius:12px;font-size:12px}:host([companion]) .heading:has(.subbuttons){min-height:78px;padding:4px 0 6px}}
    .missing,.error{color:var(--error-color,#db4437)}.error{font-size:13px;margin:12px 0 0}.empty{color:var(--room-control-muted,#8293a2);font-size:14px;margin:0}
  `;
  class RoomControlCard extends HTMLElement {
    constructor() {
      super(); this.attachShadow({ mode: 'open' }); this._busy = new Set(); this._timers = new Set();
      // Keep the styling boundary stable: card-mod attaches styles/subscriptions here.
      this._cardStyle = el('style'); this._cardStyle.textContent = css;
      this._cardElement = el('ha-card');
      this._content = el('div', 'content');
      this._cardElement.append(this._content);
      this.shadowRoot.append(this._cardStyle, this._cardElement);
    }
    static async getConfigElement() {
      // Loading HA's entities editor also registers ha-form and its lazy selectors.
      if (!customElements.get('ha-form') && window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        helpers.createCardElement({ type: 'entities', entities: [] });
        await customElements.whenDefined('hui-entities-card');
        await customElements.get('hui-entities-card').getConfigElement?.();
      }
      return document.createElement(`${TYPE}-editor`);
    }
    static getStubConfig() { return { type: `custom:${TYPE}`, name: 'Raum', devices: [], statuses: [] }; }
    setConfig(config) { this._config = normalize(config); this._render(); }
    set hass(value) {
      const previous = this._hass; this._hass = value;
      const ids = this._config ? [...this._config.devices, ...this._config.statuses, ...this._config.subbuttons].map((item) => item.entity).filter(Boolean) : [];
      // Unrelated state updates must not interrupt a hold gesture or remove card-mod styles.
      if (!previous || previous.locale !== value.locale || ids.some((id) => previous.states[id] !== value.states[id])) this._render();
    }
    getCardSize() { return 1 + Math.ceil((this._config?.devices.length || 0) / 2) + Math.ceil((this._config?.statuses.length || 0) / 2); }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
    _state(state, status = false, item = {}) {
      if (!state) return 'Entität nicht gefunden';
      if (Object.prototype.hasOwnProperty.call(item.state_labels || {}, state.state)) return item.state_labels[state.state];
      if (status && domain(item.entity || state.entity_id || '') === 'binary_sensor' && ['on', 'off'].includes(state.state)) {
        const dc = state.attributes.device_class;
        if (['motion', 'occupancy', 'presence'].includes(dc)) return state.state === 'on' ? 'Erkannt' : 'Frei';
        if (['smoke', 'gas', 'safety', 'problem', 'moisture'].includes(dc)) return state.state === 'on' ? 'Alarm' : 'Normal';
        if (['door', 'window', 'opening', 'garage_door'].includes(dc)) return state.state === 'on' ? 'Offen' : 'Geschlossen';
      }
      if (!status && domain(state.entity_id || '') === 'light' && state.state === 'on' && Number.isFinite(state.attributes.brightness)) return `${Math.round(state.attributes.brightness / 2.55)} %`;
      if (this._hass.formatEntityState) return this._hass.formatEntityState(state);
      return `${state.state}${state.attributes.unit_of_measurement ? ' ' + state.attributes.unit_of_measurement : ''}`;
    }
    async _activate(item, action = item.action) {
      return this._executeAction(item, action, item.entity);
    }
    async _executeAction(item, value, busyKey) {
      const action = actionObject(value);
      if (!action || action.action === 'none' || this._busy.has(busyKey)) return;
      const state = this._hass?.states[item.entity];
      if (action.action === 'toggle' && (!TOGGLE.has(domain(item.entity || '')) || !state || ['unknown', 'unavailable'].includes(state.state))) return;
      if (action.confirmation) {
        const exempt = action.confirmation.exemptions?.some((user) => user.user === this._hass.user?.id);
        if (!exempt && !window.confirm(action.confirmation.text || 'Aktion ausführen?')) return;
      }
      if (action.action === 'more-info') {
        if (item.entity) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        return;
      }
      if (action.action === 'navigate') {
        const path = action.navigation_path;
        if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) { window.history.pushState(null, '', path); window.dispatchEvent(new Event('location-changed')); }
        return;
      }
      this._busy.add(busyKey); this._error = ''; this._render();
      try {
        if (action.action === 'toggle') await this._hass.callService(domain(item.entity), 'toggle', { entity_id: item.entity });
        else if (action.action === 'perform-action') {
          if (!action.perform_action) throw new Error('Bitte eine Aktion auswählen.');
          const [serviceDomain, service] = action.perform_action.split('.');
          await this._hass.callService(serviceDomain, service, action.data || {}, action.target || {});
        }
      } catch (error) { this._error = `Aktion fehlgeschlagen: ${error.message || error}`; }
      finally { this._busy.delete(busyKey); this._render(); }
    }
    _bindGesture(button, tap, hold) {
      let timer, held = false;
      const cancel = () => { clearTimeout(timer); this._timers.delete(timer); };
      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || button.disabled) return;
        held = false; timer = setTimeout(() => { this._timers.delete(timer); held = true; hold(); }, 500); this._timers.add(timer);
      });
      for (const event of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(event, cancel);
      button.addEventListener('contextmenu', (event) => { event.preventDefault(); cancel(); });
      button.addEventListener('click', () => { cancel(); if (!held) tap(); held = false; });
      button.addEventListener('keydown', (event) => { if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); hold(); } });
    }
    disconnectedCallback() { for (const timer of this._timers) clearTimeout(timer); this._timers.clear(); }
    _bindSubbutton(button, item, index) {
      this._bindGesture(button, () => this._subAction(item, item.tap_action, index), () => this._subAction(item, item.hold_action, index));
    }
    async _subAction(item, action, index) { return this._executeAction(item, action, `subbutton:${index}`); }
    _subbuttons() {
      const group = el('div', 'subbuttons'); group.setAttribute('part', 'subbuttons');
      this._config.subbuttons.forEach((item, index) => {
        const button = el('button', 'subbutton'); button.type = 'button'; button.setAttribute('part', 'subbutton');
        const matched = item.state_colors.find((rule) => rule.state === this._hass.states[item.entity]?.state);
        const colors = { ...item, ...matched };
        const rgb = colors.background_color.slice(1).match(/../g).map((v) => parseInt(v, 16));
        button.style.backgroundColor = `rgba(${rgb.join(',')},${colors.background_opacity})`;
        button.style.color = colors.text_color;
        const label = item.name || this._hass.states[item.entity]?.attributes.friendly_name || 'Subbutton';
        button.setAttribute('aria-label', label);
        if (item.icon) button.append(icon(item.icon));
        if (item.name || !item.icon) button.append(el('span', '', label));
        button.disabled = this._busy.has(`subbutton:${index}`) || (actionKind(item.tap_action) === 'none' && actionKind(item.hold_action) === 'none');
        this._bindSubbutton(button, item, index); group.append(button);
      });
      return group;
    }
    _tile(item, status) {
      const state = this._hass.states[item.entity];
      const interactive = actionKind(item.action) !== 'none' || actionKind(item.hold_action) !== 'none';
      const tile = el(status && interactive ? 'button' : 'div', `item ${status ? 'status' : 'device'}${['on', 'playing', 'cleaning', 'run'].includes(state?.state) ? ' active' : ''}${!state ? ' missing' : ''}`);
      tile.dataset.entity = item.entity; tile.dataset.domain = domain(item.entity); tile.setAttribute('part', status ? 'status' : 'device');
      const fallback = ({ light: 'mdi:lightbulb', switch: 'mdi:power-socket-eu', fan: 'mdi:fan', lock: 'mdi:lock', binary_sensor: 'mdi:checkbox-marked-circle-outline', sensor: 'mdi:gauge', media_player: 'mdi:television' })[domain(item.entity)] || 'mdi:circle-outline';
      const glyph = icon(item.icon || state?.attributes.icon || fallback);
      const unavailable = !state || ['unavailable', 'unknown'].includes(state.state);
      if (status) {
        tile.append(glyph);
        if (interactive) { tile.type = 'button'; tile.disabled = unavailable; this._bindGesture(tile, () => this._activate(item), () => this._activate(item, item.hold_action)); }
      } else {
        const iconInteractive = actionKind(item.icon_action) !== 'none' || actionKind(item.icon_hold_action) !== 'none';
        const cell = el(iconInteractive ? 'button' : 'span', `icon-cell${iconInteractive ? ' icon-button' : ''}`); cell.append(glyph);
        if (iconInteractive) { cell.type = 'button'; cell.disabled = unavailable || this._busy.has(item.entity); cell.setAttribute('aria-label', `Icon: ${item.name || state?.attributes.friendly_name || item.entity}`); this._bindGesture(cell, () => this._activate(item, item.icon_action), () => this._activate(item, item.icon_hold_action)); }
        tile.append(cell);
      }
      const text = el(!status && interactive ? 'button' : 'div', !status && interactive ? 'text tile-main' : 'text');
      text.append(el('div', 'name', item.name || state?.attributes.friendly_name || item.entity), el('div', 'state', this._state(state, status, item)));
      if (!status && interactive) { text.type = 'button'; text.disabled = unavailable || this._busy.has(item.entity); this._bindGesture(text, () => this._activate(item), () => this._activate(item, item.hold_action)); }
      tile.append(text); return tile;
    }
    _render() {
      if (!this._config || !this._hass) return;
      for (const timer of this._timers) clearTimeout(timer); this._timers.clear();
      const companion = Boolean(window.webkit?.messageHandlers?.externalBus || window.externalApp?.externalBus || window.externalAppV2?.postMessage);
      if (companion) this.setAttribute('companion', ''); else this.removeAttribute('companion');
      const content = el('div', 'content');
      const heading = el('div', 'heading');
      if (this._config.name || this._config.icon) {
        const header = el('header', 'header'); header.setAttribute('part', 'header');
        if (this._config.icon) header.append(icon(this._config.icon));
        if (this._config.name) header.append(el('h2', 'title', this._config.name));
        heading.append(header);
      }
      if (this._config.subbuttons.length) heading.append(this._subbuttons());
      if (heading.children.length) content.append(heading);
      if (this._config.devices.length) {
        const grid = el('div', 'grid devices'); grid.setAttribute('part', 'devices');
        this._config.devices.forEach((item) => grid.append(this._tile(item, false))); content.append(grid);
      }
      if (this._config.statuses.length) {
        const section = el('section', `statuses${this._config.devices.length ? '' : ' without-devices'}`); section.setAttribute('part', 'statuses');
        section.append(el('h3', 'section-title', 'Status & Sensoren'));
        const grid = el('div', 'grid'); this._config.statuses.forEach((item) => grid.append(this._tile(item, true)));
        section.append(grid); content.append(section);
      }
      if (!this._config.devices.length && !this._config.statuses.length) content.append(el('p', 'empty', 'Geräte und Status / Sensoren im Karteneditor hinzufügen.'));
      if (this._error) { const error = el('p', 'error', this._error); error.setAttribute('role', 'alert'); content.append(error); }
      // Replace only nodes owned by this card. Never remove card-mod's nodes,
      // its live template subscriptions, or the ha-card element it is attached to.
      this._cardElement.replaceChild(content, this._content);
      this._content = content;
    }
  }
  class RoomControlCardEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._listId = `rcc-${Math.random().toString(36).slice(2)}`; this._openEntries = new Set(); }
    setConfig(config) { this._config = normalize(config); this._render(); }
    set hass(value) {
      const changed = !this._hass || Object.keys(value.states).join() !== Object.keys(this._hass.states).join();
      this._hass = value;
      if (changed) this._render();
      else for (const form of this.shadowRoot.querySelectorAll?.('ha-form') || []) form.hass = value;
    }
    _emit() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: clone(this._config) }, bubbles: true, composed: true })); }
    _field(label, value, onChange, list) {
      const wrap = el('label', 'field'); wrap.append(el('span', '', label));
      const input = el('input'); input.value = value || '';
      if (list) input.setAttribute('list', list);
      input.addEventListener('change', () => onChange(input.value.trim())); wrap.append(input); return wrap;
    }
    _iconField(label, value, onChange) {
      const form = el('ha-form', 'field'); form.hass = this._hass;
      form.schema = [{ name: 'icon', selector: { icon: {} } }]; form.data = { icon: value || '' };
      form.computeLabel = () => label;
      form.addEventListener('value-changed', (event) => {
        event.stopPropagation(); const next = event.detail.value.icon || '';
        if (next !== (form.data.icon || '')) { form.data = { icon: next }; onChange(next); }
      });
      return form;
    }
    _colorField(label, value, onChange) {
      const wrap = el('label', 'field'); wrap.append(el('span', '', label));
      const input = el('input'); input.type = 'color'; input.value = value;
      input.addEventListener('change', () => onChange(input.value)); wrap.append(input); return wrap;
    }
    _actionsForm(item, fields, readOnly, onChange) {
      const form = el('ha-form', 'field'); form.hass = this._hass;
      const allowed = readOnly ? ['none', 'more-info'] : ['none', 'more-info', 'toggle', 'perform-action', 'navigate'];
      const actions = allowed.filter((action) => action === 'more-info' ? Boolean(item.entity) : action === 'toggle' ? TOGGLE.has(domain(item.entity || '')) : true);
      form.schema = fields.map(([name]) => ({ name, selector: { ui_action: { actions } } }));
      form.data = Object.fromEntries(fields.map(([name]) => [name, actionObject(item[name])]));
      form.context = { entity_id: item.entity };
      form.computeLabel = (schema) => fields.find(([name]) => name === schema.name)?.[1] || schema.name;
      form.addEventListener('value-changed', (event) => { event.stopPropagation(); onChange(event.detail.value); });
      return form;
    }
    _stateColorEditor(body, item, update) {
      const section = el('fieldset'); section.append(el('legend', '', 'Farben nach Zustand (optional)'));
      section.append(el('p', 'hint', 'Die erste passende Regel ersetzt die Grundfarben. Ohne Treffer bleiben die Grundfarben erhalten. Zustände sind z. B. on oder off.'));
      item.state_colors.forEach((rule, index) => {
        const box = el('div', 'entry-body');
        const change = (values) => { const rules = clone(this._config.subbuttons[item._index]?.state_colors || item.state_colors); Object.assign(rules[index], values); update({ state_colors: rules }); };
        box.append(this._field('Zustand', rule.state, (state) => change({ state })));
        box.append(this._colorField('Hintergrundfarbe', rule.background_color || item.background_color, (background_color) => change({ background_color })));
        box.append(this._colorField('Schrift-/Iconfarbe', rule.text_color || item.text_color, (text_color) => change({ text_color })));
        const opacity = this._field('Deckkraft (0–100 %)', String(Math.round((rule.background_opacity ?? item.background_opacity) * 100)), (value) => change({ background_opacity: Number(value) / 100 }));
        opacity.children[1].type = 'number'; opacity.children[1].min = '0'; opacity.children[1].max = '100'; box.append(opacity);
        box.append(this._button('Farbregel entfernen', () => { const rules = clone(this._config.subbuttons[item._index]?.state_colors || item.state_colors); rules.splice(index, 1); update({ state_colors: rules }, true); })); section.append(box);
      });
      section.append(this._button('Farbregel hinzufügen', () => update({ state_colors: [...(this._config.subbuttons[item._index]?.state_colors || item.state_colors), { state: 'on', background_color: item.background_color, background_opacity: item.background_opacity, text_color: item.text_color }] }, true)));
      body.append(section);
    }
    _labelsEditor(body, key, index) {
      const section = el('fieldset'); section.append(el('legend', '', 'Eigene Statustexte (optional)'));
      const labels = this._config[key][index].state_labels || {};
      const message = el('div', 'error'); message.setAttribute('role', 'alert');
      Object.entries(labels).forEach(([state, label]) => {
        const row = el('div', 'entry-body'); row.append(el('p', 'hint', `Zustand: ${state}`));
        row.append(this._field('Anzeigetext', label, (text) => { this._config[key][index].state_labels[state] = text; this._emit(); }));
        row.append(this._button('Statustext entfernen', () => { delete this._config[key][index].state_labels[state]; this._emit(); this._render(); })); section.append(row);
      });
      section.append(this._field('Zustand hinzufügen (z. B. on oder off)', '', (state) => {
        if (!state || ['__proto__', 'constructor', 'prototype'].includes(state)) { message.textContent = 'Bitte einen gültigen Zustand angeben.'; return; }
        this._config[key][index].state_labels = { ...labels, [state]: state }; this._emit(); this._render();
      })); section.append(message); body.append(section);
    }
    _subbuttonEditor(root) {
      const section = el('fieldset'); section.append(el('legend', '', 'Subbuttons'));
      section.append(el('p', 'hint', 'Kleine Aktionen im Kartenkopf. Farben, Icon sowie Tipp- und Halteaktion sind pro Button einstellbar.'));
      this._config.subbuttons.forEach((item, i) => {
        const entry = el('details', 'entry'); const key = `subbuttons:${i}`; entry.open = this._openEntries.has(key);
        entry.addEventListener('toggle', () => { if (entry.open) this._openEntries.add(key); else this._openEntries.delete(key); });
        const summary = el('summary', '', item.name || item.entity || `Subbutton ${i + 1}`); const body = el('div', 'entry-body'); entry.append(summary, body);
        const message = el('div', 'error'); message.setAttribute('role', 'alert');
        const update = (changes, render = false) => {
          try {
            const next = clone(this._config); Object.assign(next.subbuttons[i], changes);
            this._config = normalize(next); this._emit(); if (render) this._render();
          } catch (error) { message.textContent = error.message; }
        };
        body.append(this._field('Name', item.name, (name) => update({ name }, true)));
        const entityForm = el('ha-form', 'field'); entityForm.hass = this._hass;
        entityForm.schema = [{ name: 'entity', selector: { entity: {} } }]; entityForm.data = { entity: item.entity || '' }; entityForm.computeLabel = () => 'Entität (optional)';
        entityForm.addEventListener('value-changed', (event) => {
          event.stopPropagation(); const entity = event.detail.value.entity || '';
          const next = { entity };
          if (!item.entity && actionKind(item.tap_action) === 'none' && actionKind(item.hold_action) === 'none') { next.tap_action = null; next.hold_action = null; }
          // Keep existing custom actions when replacing an assigned entity.
          update(next, true);
        }); body.append(entityForm);
        body.append(this._iconField('Icon', item.icon, (value) => update({ icon: value })));
        body.append(this._colorField('Hintergrundfarbe', item.background_color, (value) => update({ background_color: value })));
        const opacity = this._field('Hintergrunddeckkraft (0–100 %)', String(Math.round(item.background_opacity * 100)), (value) => update({ background_opacity: Number(value) / 100 }));
        const opacityInput = opacity.children[1]; opacityInput.type = 'number'; opacityInput.min = '0'; opacityInput.max = '100'; opacityInput.step = '1'; body.append(opacity);
        body.append(this._colorField('Schrift-/Iconfarbe', item.text_color, (value) => update({ text_color: value })));
        body.append(this._actionsForm(item, [['tap_action', 'Beim Tippen'], ['hold_action', 'Beim Halten']], false, (values) => update(values)));
        this._stateColorEditor(body, { ...item, _index: i }, update);
        body.append(message);
        const bar = el('div', 'toolbar'); bar.append(this._button('Nach oben', () => this._move('subbuttons', i, i - 1), i === 0), this._button('Nach unten', () => this._move('subbuttons', i, i + 1), i === this._config.subbuttons.length - 1), this._button('Entfernen', () => { this._config.subbuttons.splice(i, 1); this._emit(); this._render(); })); body.append(bar); section.append(entry);
      });
      section.append(this._button('Subbutton hinzufügen', () => {
        this._config = normalize({ ...this._config, subbuttons: [...this._config.subbuttons, { name: 'Subbutton' }] });
        this._openEntries.add(`subbuttons:${this._config.subbuttons.length - 1}`); this._emit(); this._render();
      })); root.append(section);
    }
    _button(label, action, disabled = false) {
      const b = el('button', '', label); b.type = 'button'; b.disabled = disabled; b.addEventListener('click', action); return b;
    }
    _move(key, from, to) {
      if (to < 0 || to >= this._config[key].length) return;
      const [item] = this._config[key].splice(from, 1); this._config[key].splice(to, 0, item); this._emit(); this._render();
    }
    _render() {
      if (!this._config) return;
      const style = el('style'); style.textContent = `:host{display:block;color:var(--primary-text-color)}*{box-sizing:border-box}.field{display:grid;gap:5px;margin:10px 0;font-size:14px}input,select,button{font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#888);border-radius:6px;padding:9px;max-width:100%}input{width:100%}input[type=color]{height:42px;width:100%;padding:3px}ha-form{display:block}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--primary-color)}fieldset{border:1px solid var(--divider-color,#888);border-radius:8px;margin:16px 0;padding:12px;min-width:0}.entry{border:1px solid var(--divider-color,#888);border-radius:10px;margin:8px 0;background:rgba(127,127,127,.04);overflow:hidden}.entry[open]{background:rgba(127,127,127,.09);border-color:var(--primary-color)}summary{cursor:pointer;padding:12px;font-weight:600;overflow-wrap:anywhere}summary:focus-visible{outline:2px solid var(--primary-color);outline-offset:-2px}.entry-id{display:block;font-size:12px;font-weight:400;color:var(--secondary-text-color);padding:4px 0 0 18px}.entry-body{padding:0 12px 12px;border-top:1px solid var(--divider-color,#888)}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.hint{font-size:13px;color:var(--secondary-text-color)}.error{color:var(--error-color,#db4437)}`;
      const root = el('div');
      root.append(this._field('Raum-/Abschnittsname', this._config.name, (value) => { this._config.name = value; this._emit(); }));
      root.append(this._iconField('Raum-/Abschnittsicon', this._config.icon, (value) => { this._config.icon = value; this._emit(); }));
      this._subbuttonEditor(root);
      const list = el('datalist'); list.id = this._listId;
      for (const state of Object.values(this._hass?.states || {}).sort((a,b) => a.entity_id.localeCompare(b.entity_id))) {
        const option = el('option'); option.value = state.entity_id; option.label = state.attributes.friendly_name || state.entity_id; list.append(option);
      }
      root.append(list);
      for (const [key, title] of [['devices', 'Geräte'], ['statuses', 'Status / Sensoren']]) {
        const section = el('fieldset'); section.append(el('legend', '', title));
        section.append(el('p', 'hint', key === 'devices' ? 'Licht, Schalter und Ventilatoren können umgeschaltet werden. Andere Geräte öffnen ihre Details.' : 'Keine Schaltaktionen. Details öffnen oder keine Aktion sind pro Feld einstellbar.'));
        this._config[key].forEach((item, i) => {
          const entry = el('details', 'entry');
          const entryKey = `${key}:${i}`;
          entry.open = this._openEntries.has(entryKey);
          entry.addEventListener('toggle', () => { if (entry.open) this._openEntries.add(entryKey); else this._openEntries.delete(entryKey); });
          const summary = el('summary', '', item.name || this._hass?.states[item.entity]?.attributes.friendly_name || item.entity);
          summary.append(el('span', 'entry-id', item.entity));
          const body = el('div', 'entry-body'); entry.append(summary, body);
          body.append(this._field('Entität', item.entity, (value) => {
            try {
              const next = clone(this._config); next[key][i].entity = value;
              this._config = normalize(next); this._emit(); this._render();
            } catch (error) { message.textContent = error.message; }
          }, this._listId));
          const message = el('div', 'error'); message.setAttribute('role','alert'); body.append(message);
          body.append(this._field('Anzeigename (optional)', item.name, (value) => { this._config[key][i].name = value; this._emit(); this._render(); }));
          body.append(this._iconField('Icon (optional)', item.icon, (value) => { this._config[key][i].icon = value; this._emit(); }));
          const fields = [['action', 'Beim Tippen'], ['hold_action', 'Beim Halten'], ...(key === 'devices' ? [['icon_action', 'Icon antippen'], ['icon_hold_action', 'Icon halten']] : [])];
          body.append(this._actionsForm(item, fields, key === 'statuses', (values) => {
            try { const next = clone(this._config); Object.assign(next[key][i], values); this._config = normalize(next); this._emit(); }
            catch (error) { message.textContent = error.message; }
          }));
          this._labelsEditor(body, key, i);
          const bar = el('div','toolbar');
          bar.append(this._button('Nach oben',() => this._move(key,i,i-1),i===0),this._button('Nach unten',() => this._move(key,i,i+1),i===this._config[key].length-1),this._button('Entfernen',() => { this._config[key].splice(i,1); this._emit(); this._render(); }));
          body.append(bar); section.append(entry);
        });
        section.append(this._field('Entität hinzufügen', '', (value) => {
          try {
            const next = clone(this._config); next[key].push({entity:value}); this._config = normalize(next); this._emit(); this._render();
          } catch(error) { addError.textContent = error.message; }
        },this._listId));
        const addError = el('div','error'); addError.setAttribute('role','alert'); section.append(addError); root.append(section);
      }
      this.shadowRoot.replaceChildren(style,root);
    }
  }
  if (!customElements.get(`${TYPE}-editor`)) customElements.define(`${TYPE}-editor`, RoomControlCardEditor);
  if (!customElements.get(TYPE)) customElements.define(TYPE, RoomControlCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === TYPE)) window.customCards.push({ type: TYPE, name: 'Room Control Card', description: 'Raum-/Abschnittsname, Geräte und Status / Sensoren in einer Karte.', preview: true, documentationURL: 'https://github.com/soundclub83/room-control-card' });
})();

/* Heating and Fan Control Cards — MIT, Copyright (c) 2026 soundclub83 */
(() => {
  'use strict';
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const node = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const icon = (name) => {
    const e = node('ha-icon');
    e.setAttribute('icon', name);
    return e;
  };
  const valid = (id, domains) =>
    typeof id === 'string' &&
    /^[a-z_]+\.[a-z0-9_]+$/.test(id) &&
    (!domains || domains.includes(id.split('.')[0]));
  const available = (state) => state && !['unknown', 'unavailable'].includes(state.state);
  function normalize(raw, fan) {
    const c = copy(raw || {});
    for (const k of ['name', 'icon'])
      if (c[k] !== undefined && typeof c[k] !== 'string') throw Error(`${k}: Bitte Text eingeben.`);
    if (fan) {
      if (c.entity && !valid(c.entity, ['fan'])) throw Error('Bitte einen Ventilator auswählen.');
      if (c.lock_entity && !valid(c.lock_entity, ['input_boolean', 'switch']))
        throw Error('Lock benötigt einen Eingabe-Schalter oder Schalter.');
      c.on_percentage = c.on_percentage ?? 50;
      if (!Number.isFinite(c.on_percentage) || c.on_percentage < 1 || c.on_percentage > 100)
        throw Error('Einschaltgeschwindigkeit: 1–100 %.');
      if (c.preset_mode !== undefined && typeof c.preset_mode !== 'string')
        throw Error('Voreinstellung muss Text sein.');
    } else {
      for (const k of ['temperature', 'humidity'])
        if (c[k] && !valid(c[k], ['sensor'])) throw Error(`${k}: Bitte einen Sensor auswählen.`);
      if (!Array.isArray(c.windows || [])) throw Error('Fenster muss eine Liste sein.');
      c.windows = (c.windows || []).map((x) => (typeof x === 'string' ? { entity: x } : x));
      if (c.windows.length > 2 || c.windows.some((x) => !valid(x.entity, ['binary_sensor'])))
        throw Error('Bis zu zwei Fensterkontakte möglich.');
      if (!Array.isArray(c.heaters || [])) throw Error('Heizungen muss eine Liste sein.');
      c.heaters = (c.heaters || []).map((x) => (typeof x === 'string' ? { entity: x } : x));
      if (
        c.heaters.length > 2 ||
        c.heaters.some(
          (x) =>
            !valid(x.entity, ['climate']) ||
            (x.demand && !valid(x.demand, ['sensor', 'number', 'input_number'])),
        )
      )
        throw Error('Bis zu zwei Heizungen mit passender PI-Entität möglich.');
      c.days_to_show = c.days_to_show ?? 2;
      if (!Number.isFinite(c.days_to_show) || c.days_to_show <= 0 || c.days_to_show > 31)
        throw Error('Verlauf: mehr als 0 bis 31 Tage.');
      for (const k of ['min_y_axis', 'max_y_axis'])
        if (c[k] !== undefined && !Number.isFinite(c[k])) throw Error('Diagrammgrenzen müssen Zahlen sein.');
    }
    return c;
  }
  const css = `:host{display:block;color:var(--primary-text-color,#d5dee6)}*{box-sizing:border-box}ha-card.outer{padding:12px;border-radius:var(--climate-control-radius,24px);background:var(--climate-control-background,linear-gradient(145deg,rgba(37,53,65,.75),rgba(22,34,44,.94)));border:1px solid rgba(155,180,200,.10);box-shadow:0 6px 24px rgba(0,0,0,.10)}.header{display:flex;align-items:center;gap:14px;margin:4px 6px 18px}.header h2{font-size:20px;margin:0}.header:after{content:'';height:2px;flex:1;background:linear-gradient(90deg,rgba(255,170,80,.5),rgba(255,170,80,.12))}.grid{display:grid;gap:8px;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));margin-bottom:8px}.tile,.demand,.control{border:1px solid rgba(150,175,195,.08);border-radius:16px;background:var(--climate-control-item-background,rgba(145,165,185,.045));color:inherit}.tile{display:flex;align-items:center;gap:10px;min-width:0;padding:9px 12px;min-height:58px;font:inherit;text-align:left;cursor:pointer}.tile ha-icon{color:var(--secondary-text-color,#91a4b3);flex:none}.name{font-size:11px;color:var(--climate-control-label,#6cdbc9)}.value{font-size:15px;font-weight:600;margin-top:3px}.label{font-size:11px;font-weight:600;letter-spacing:.07em;color:var(--secondary-text-color);border-top:1px solid var(--divider-color);padding:12px 0;margin:12px 0 0}.child{display:block;min-width:0;width:100%;max-width:100%;--ha-card-background:var(--climate-control-item-background,rgba(145,165,185,.045));--card-background-color:var(--climate-control-item-background,rgba(145,165,185,.045));--ha-card-border-radius:16px;--ha-card-border-color:rgba(150,175,195,.08);--ha-card-border-width:1px;--ha-card-box-shadow:none}.column{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start}.column>div,.graph-slot{min-width:0;max-width:100%;overflow:hidden}.thermostat-slot{height:248px;--state-climate-heat-color:var(--primary-color);--accent-color:var(--primary-color)}.thermostat-slot>.child{height:100%}.demand{display:flex;justify-content:center;align-items:center;gap:12px;min-height:46px;font:inherit;width:100%;cursor:pointer}.fan-buttons{display:flex;gap:8px;margin-bottom:12px}.fan-buttons button{flex:1;min-width:0;justify-content:center;font-size:14px;font-weight:600}.fan-buttons ha-icon{color:inherit}.active-on{color:#78aaff}.active-off{color:#ff6666}.active-lock{color:#ffb347}.control{display:flex;align-items:center;gap:12px;padding:12px}.control input{flex:1;min-width:0;accent-color:var(--primary-color)}.error{color:var(--error-color,#ef9292);font-size:13px}button:disabled,input:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}`;
  class Base extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      const s = node('style');
      s.textContent = css;
      this._outer = node('ha-card', 'outer');
      this._content = node('div');
      this._outer.append(this._content);
      this.shadowRoot.append(s, this._outer);
      this._children = [];
      this._updates = [];
      this._generation = 0;
    }
    static async editor(type) {
      if (!customElements.get('ha-form') && window.loadCardHelpers) {
        const h = await window.loadCardHelpers();
        h.createCardElement({ type: 'entities', entities: [] });
        await customElements.whenDefined('hui-entities-card');
        await customElements.get('hui-entities-card').getConfigElement?.();
      }
      return document.createElement(type + '-editor');
    }
    setConfig(raw) {
      this._config = normalize(raw, this._fan);
      this._build();
    }
    set hass(h) {
      const old = this._hass;
      this._hass = h;
      for (const c of this._children) c.hass = h;
      if (!this._config) return;
      const ids = this._ids();
      if (!old || old.locale !== h.locale || ids.some((id) => old.states[id] !== h.states[id]))
        this._update();
    }
    get hass() {
      return this._hass;
    }
    getGridOptions() {
      return { columns: 12, rows: 'auto', min_columns: 6 };
    }
    getCardSize() {
      return this._fan ? 3 : 15;
    }
    _ids() {
      const c = this._config;
      return this._fan
        ? [c.entity, c.lock_entity].filter(Boolean)
        : [
            c.temperature,
            c.humidity,
            ...c.windows.map((x) => x.entity),
            ...c.heaters.flatMap((x) => [x.entity, x.demand]),
          ].filter(Boolean);
    }
    _info(id) {
      this.dispatchEvent(
        new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } }),
      );
    }
    _header(name, ico) {
      const h = node('div', 'header');
      h.append(icon(this._config.icon || ico), node('h2', '', this._config.name || name));
      this._content.append(h);
    }
    _row(count) {
      const r = node('div', 'grid');
      r.style.setProperty('--columns', String(count));
      this._content.append(r);
      return r;
    }
    _tile(parent, item, label, ico, kind) {
      const b = node('button', 'tile');
      b.type = 'button';
      b.append(icon(ico));
      const t = node('div'),
        n = node('div', 'name', item.name || label),
        v = node('div', 'value');
      t.append(n, v);
      b.append(t);
      b.addEventListener('click', () => this._info(item.entity));
      parent.append(b);
      this._updates.push(() => {
        const s = this._hass?.states[item.entity],
          ok = available(s);
        b.disabled = !s;
        v.textContent = ok
          ? kind === 'window'
            ? s.state === 'on'
              ? 'Offen'
              : 'Geschlossen'
            : this._hass.formatEntityState?.(s) || `${s.state} ${s.attributes.unit_of_measurement || ''}`
          : 'Nicht verfügbar';
        let color = 'var(--primary-text-color)';
        if (ok && kind === 'window') color = s.state === 'on' ? '#ef9292' : '#7cd7b4';
        if (ok && kind === 'temperature') {
          const x = Number(s.state);
          color =
            x < 16 ? '#ef9292' : x < 19 ? '#edc47a' : x < 22 ? '#7cd7b4' : x < 24 ? '#edc47a' : '#ef9292';
        }
        v.style.color = color;
      });
    }
    async _child(parent, config, generation) {
      try {
        const helpers = await window.loadCardHelpers();
        if (generation !== this._generation) return;
        const c = helpers.createCardElement(config);
        c.className = 'child';
        if (this._hass) c.hass = this._hass;
        this._children.push(c);
        parent.append(c);
      } catch (e) {
        if (generation === this._generation) parent.append(node('p', 'error', e.message));
      }
    }
    _update() {
      for (const f of this._updates) f();
    }
    _build() {
      this._generation++;
      this._children = [];
      this._updates = [];
      this._content.replaceChildren();
      this._error = node('p', 'error');
      if (this._fan) this._buildFan();
      else this._buildHeating();
      this._content.append(this._error);
      this._update();
    }
    _buildHeating() {
      const c = this._config,
        g = this._generation;
      this._header('Heizung', 'mdi:radiator');
      if (c.windows.length) {
        const r = this._row(c.windows.length);
        c.windows.forEach((w, i) =>
          this._tile(
            r,
            w,
            c.windows.length === 1 ? 'Fenster' : `Fenster ${i + 1}`,
            'mdi:window-closed',
            'window',
          ),
        );
      }
      const sensors = [
        ['temperature', 'Temperatur', 'mdi:thermometer'],
        ['humidity', 'Luftfeuchtigkeit', 'mdi:water-percent'],
      ].filter(([k]) => c[k]);
      if (sensors.length) {
        const r = this._row(sensors.length);
        for (const [k, n, ico] of sensors) this._tile(r, { entity: c[k] }, n, ico, k);
      }
      if (c.temperature) {
        const graph = {
          type: 'statistics-graph',
          chart_type: 'line',
          period: '5minute',
          entities: [c.temperature],
          stat_types: ['mean'],
          title: `Temperatur${c.name ? ' ' + c.name : ''}`,
          hide_legend: true,
          days_to_show: c.days_to_show,
          fit_y_data: true,
        };
        for (const k of ['min_y_axis', 'max_y_axis']) if (c[k] !== undefined) graph[k] = c[k];
        const graphSlot = node('div', 'graph-slot');
        this._content.append(graphSlot);
        this._child(graphSlot, graph, g);
      }
      if (c.heaters.length) {
        this._content.append(node('div', 'label', 'HEIZUNG'));
        const r = this._row(c.heaters.length);
        for (const h of c.heaters) {
          const col = node('div', 'column'),
            thermostat = node('div', 'thermostat-slot');
          r.append(col);
          col.append(thermostat);
          this._child(
            thermostat,
            { type: 'thermostat', entity: h.entity, ...(h.name ? { name: h.name } : {}) },
            g,
          );
          if (h.demand) {
            const slot = node('div');
            col.append(slot);
            this._child(
              slot,
              {
                type: 'tile',
                entity: h.demand,
                name: 'PI Heating Demand',
                icon: 'mdi:chart-line',
                vertical: false,
                ...(['number', 'input_number'].includes(h.demand.split('.')[0])
                  ? { features: [{ type: 'numeric-input', style: 'slider' }] }
                  : {}),
              },
              g,
            );
          }
        }
      }
    }

    async _service(domain, service, data, id) {
      if (this._busy || !available(this._hass?.states[id])) return;
      this._busy = true;
      this._update();
      try {
        await this._hass.callService(domain, service, data);
        this._error.textContent = '';
      } catch (e) {
        this._error.textContent = e.message || 'Aktion fehlgeschlagen';
      } finally {
        this._busy = false;
        this._update();
      }
    }
    _buildFan() {
      const c = this._config;
      this._header('Lüftung', 'mdi:fan');
      const row = node('div', 'fan-buttons');
      this._content.append(row);
      const button = (text, ico, action, active, id) => {
        const b = node('button', 'tile');
        b.type = 'button';
        b.append(icon(ico), node('span', '', text));
        b.addEventListener('click', action);
        row.append(b);
        this._updates.push(() => {
          const s = this._hass?.states[id];
          b.disabled = !!this._busy || !available(s);
          if (text === 'Lock')
            b.children[0].setAttribute('icon', s?.state === 'on' ? 'mdi:lock' : 'mdi:lock-open-variant');
          b.className =
            'tile ' + (active(s) ? 'active-' + (text === 'An' ? 'on' : text === 'Aus' ? 'off' : 'lock') : '');
        });
        return b;
      };
      button(
        'An',
        'mdi:fan',
        () => {
          const s = this._hass?.states[c.entity];
          const data = { entity_id: c.entity };
          if ((s?.attributes.supported_features || 0) & 1) data.percentage = c.on_percentage;
          if (c.preset_mode && s?.attributes.preset_modes?.includes(c.preset_mode))
            data.preset_mode = c.preset_mode;
          this._service('fan', 'turn_on', data, c.entity);
        },
        (s) => s?.state === 'on',
        c.entity,
      );
      button(
        'Aus',
        'mdi:fan-off',
        () => this._service('fan', 'turn_off', { entity_id: c.entity }, c.entity),
        (s) => s?.state === 'off',
        c.entity,
      );
      if (c.lock_entity)
        button(
          'Lock',
          'mdi:lock',
          () =>
            this._service(c.lock_entity.split('.')[0], 'toggle', { entity_id: c.lock_entity }, c.lock_entity),
          (s) => s?.state === 'on',
          c.lock_entity,
        );
      const control = node('div', 'control'),
        toggle = node('button', 'demand'),
        slider = node('input'),
        value = node('span');
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Ventilator umschalten');
      toggle.append(icon('mdi:fan'));
      toggle.style.width = '46px';
      toggle.addEventListener('click', () =>
        this._service('fan', 'toggle', { entity_id: c.entity }, c.entity),
      );
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.setAttribute('aria-label', 'Lüftergeschwindigkeit');
      slider.addEventListener('input', () => {
        this._dragging = true;
        value.textContent = slider.value + ' %';
      });
      slider.addEventListener('change', () => {
        this._dragging = false;
        this._service(
          'fan',
          'set_percentage',
          { entity_id: c.entity, percentage: Number(slider.value) },
          c.entity,
        );
      });
      slider.addEventListener('blur', () => {
        this._dragging = false;
        this._update();
      });
      control.append(toggle, slider, value);
      this._content.append(control);
      this._updates.push(() => {
        const s = this._hass?.states[c.entity];
        toggle.disabled = !!this._busy || !available(s);
        slider.disabled = !!this._busy || !available(s) || !((s?.attributes.supported_features || 0) & 1);
        slider.step = String(s?.attributes.percentage_step || 1);
        if (!this._dragging) {
          slider.value = String(s?.attributes.percentage || 0);
          value.textContent = available(s) ? slider.value + ' %' : 'Nicht verfügbar';
        }
      });
    }
  }
  class Heating extends Base {
    static getConfigElement() {
      return Base.editor('heating-control-card');
    }
    static getStubConfig() {
      return { type: 'custom:heating-control-card', name: 'Raum', windows: [], heaters: [] };
    }
  }
  class Fan extends Base {
    constructor() {
      super();
      this._fan = true;
    }
    static getConfigElement() {
      return Base.editor('fan-control-card');
    }
    static getStubConfig() {
      return { type: 'custom:fan-control-card', name: 'Lüftung', on_percentage: 50 };
    }
  }
  const field = (name, label, selector) => ({ name, label, selector });
  const entity = (name, label, domain) => field(name, label, { entity: { domain } });
  class Editor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    setConfig(c) {
      this._config = copy(c);
      this._render();
    }
    set hass(h) {
      this._hass = h;
      if (this._forms) for (const f of this._forms) f.hass = h;
    }
    _emit() {
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          bubbles: true,
          composed: true,
          detail: { config: copy(this._config) },
        }),
      );
    }
    _form(title, data, schema, changed) {
      const group = node('fieldset'),
        legend = node('legend', '', title),
        form = node('ha-form');
      form.hass = this._hass;
      form.data = data;
      form.schema = schema;
      form.computeLabel = (s) => schema.find((x) => x.name === s.name)?.label || s.name;
      form.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        changed(e.detail.value);
        this._emit();
      });
      group.append(legend, form);
      this.shadowRoot.append(group);
      this._forms.push(form);
    }
    _render() {
      if (!this._config) return;
      this.shadowRoot.replaceChildren();
      this._forms = [];
      const style = node('style');
      style.textContent =
        'fieldset{border:1px solid var(--divider-color);border-radius:12px;margin:12px 0;padding:12px;min-width:0}legend{padding:0 6px}button{margin:6px;padding:8px;cursor:pointer}';
      this.shadowRoot.append(style);
      const c = this._config,
        fan = c.type === 'custom:fan-control-card';
      const base = [field('name', 'Name', { text: {} }), field('icon', 'Icon', { icon: {} })];
      if (fan) {
        base.push(
          entity('entity', 'Ventilator', ['fan']),
          entity('lock_entity', 'Lock-Entität (optional)', ['input_boolean', 'switch']),
          field('on_percentage', 'Geschwindigkeit beim Einschalten (%)', {
            number: { min: 1, max: 100, mode: 'box' },
          }),
          field('preset_mode', 'Voreinstellung beim Einschalten (optional)', { text: {} }),
        );
        this._form('Lüftung', c, base, (v) => {
          this._config = { ...this._config, ...v };
        });
        return;
      }
      base.push(
        entity('temperature', 'Raumtemperatur', ['sensor']),
        entity('humidity', 'Luftfeuchtigkeit', ['sensor']),
        field('days_to_show', 'Diagramm: Tage', { number: { min: 0.1, max: 31, mode: 'box' } }),
        field('min_y_axis', 'Diagramm: Untergrenze (optional)', { number: { mode: 'box' } }),
        field('max_y_axis', 'Diagramm: Obergrenze (optional)', { number: { mode: 'box' } }),
      );
      this._form('Raum und Temperaturverlauf', c, base, (v) => {
        this._config = { ...this._config, ...v };
      });
      for (const [key, label] of [
        ['windows', 'Fenster'],
        ['heaters', 'Heizung'],
      ]) {
        const items = c[key] || [];
        items.forEach((raw, i) => {
          const item = typeof raw === 'string' ? { entity: raw } : raw;
          const schema = [
            entity('entity', label, key === 'windows' ? ['binary_sensor'] : ['climate']),
            field('name', 'Anzeigename (optional)', { text: {} }),
          ];
          if (key === 'heaters')
            schema.push(entity('demand', 'PI Heating Demand', ['sensor', 'number', 'input_number']));
          this._form(`${label} ${i + 1}`, item, schema, (v) => {
            const list = [...(this._config[key] || [])];
            list[i] = v;
            this._config = { ...this._config, [key]: list };
          });
          const remove = node('button', '', `${label} ${i + 1} entfernen`);
          remove.addEventListener('click', () => {
            this._config[key].splice(i, 1);
            this._emit();
            this._render();
          });
          this.shadowRoot.append(remove);
        });
        if (items.length < 2) {
          const add = node('button', '', `${label} hinzufügen`);
          add.addEventListener('click', () => {
            this._config[key] = [...(this._config[key] || []), { entity: '' }];
            this._emit();
            this._render();
          });
          this.shadowRoot.append(add);
        }
      }
    }
  }
  class HeatingEditor extends Editor {}
  class FanEditor extends Editor {}
  for (const [type, ctor, name] of [
    ['heating-control-card', Heating, 'Heating Control Card'],
    ['fan-control-card', Fan, 'Fan Control Card'],
  ]) {
    if (!customElements.get(type)) customElements.define(type, ctor);
    window.customCards = window.customCards || [];
    if (!window.customCards.some((x) => x.type === type))
      window.customCards.push({
        type,
        name,
        description: type.startsWith('heating')
          ? 'Fenster, Raumklima, Temperaturverlauf und bis zu zwei Heizungen mit PI-Wert.'
          : 'Lüftersteuerung mit optionalem Lock.',
        preview: true,
      });
  }
  if (!customElements.get('heating-control-card-editor'))
    customElements.define('heating-control-card-editor', HeatingEditor);
  if (!customElements.get('fan-control-card-editor'))
    customElements.define('fan-control-card-editor', FanEditor);
})();
