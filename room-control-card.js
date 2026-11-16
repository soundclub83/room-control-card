/* Room Control Card — MIT License, Copyright (c) 2026 soundclub83 */
(() => {
  'use strict';
  const TYPE = 'room-control-card';
  const TOGGLE = new Set(['light', 'switch', 'input_boolean', 'fan']);
  const domain = (id) => id.split('.')[0];
  const clone = (v) => JSON.parse(JSON.stringify(v));
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
        if (key === 'statuses' && item.action && !['none', 'more-info'].includes(item.action)) throw new Error('Statusfelder dürfen keine Bedienaktion enthalten.');
        item.hold_action = item.hold_action || (key === 'devices' ? 'more-info' : 'none');
        if (!['none', 'more-info', 'toggle'].includes(item.hold_action) || (item.hold_action === 'toggle' && (key === 'statuses' || !TOGGLE.has(domain(item.entity))))) throw new Error('Ungültige Aktion beim Halten.');
        if (key === 'statuses') item.action = item.action || 'more-info';
        if (key === 'devices') {
          item.action = item.action || (['light', 'switch', 'input_boolean'].includes(domain(item.entity)) ? 'toggle' : 'more-info');
          if (!['toggle', 'more-info', 'none'].includes(item.action)) throw new Error('Unbekannte Bedienaktion.');
          if (item.action === 'toggle' && !TOGGLE.has(domain(item.entity))) throw new Error('Diese Entität unterstützt hier kein Umschalten. Bitte Details wählen.');
        }
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
      for (const key of ['tap_action', 'hold_action']) {
        const action = item[key];
        if (!action || typeof action !== 'object' || !['none', 'toggle', 'more-info', 'perform-action'].includes(action.action)) throw new Error('Ungültige Subbutton-Aktion.');
        if (action.action === 'toggle' && !TOGGLE.has(domain(item.entity || ''))) throw new Error('Diese Subbutton-Entität unterstützt kein Umschalten.');
        if (action.action === 'more-info' && !item.entity) throw new Error('Für Details eine Subbutton-Entität auswählen.');
        if (action.action === 'perform-action' && action.perform_action && !/^[a-z_]+\.[a-z0-9_]+$/.test(action.perform_action)) throw new Error('Ungültige Aktion.');
      }
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
    .missing,.error{color:var(--error-color,#db4437)}.error{font-size:13px;margin:12px 0 0}.empty{color:var(--room-control-muted,#8293a2);font-size:14px;margin:0}
  `;
  class RoomControlCard extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._busy = new Set(); }
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
    set hass(value) { this._hass = value; this._render(); }
    getCardSize() { return 1 + Math.ceil((this._config?.devices.length || 0) / 2) + Math.ceil((this._config?.statuses.length || 0) / 2); }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
    _state(state, status = false) {
      if (!state) return 'Entität nicht gefunden';
      if (!status && domain(state.entity_id || '') === 'light' && state.state === 'on' && Number.isFinite(state.attributes.brightness)) return `${Math.round(state.attributes.brightness / 2.55)} %`;
      if (this._hass.formatEntityState) return this._hass.formatEntityState(state);
      return `${state.state}${state.attributes.unit_of_measurement ? ' ' + state.attributes.unit_of_measurement : ''}`;
    }
    async _activate(item, action = item.action) {
      const state = this._hass?.states[item.entity];
      if (!state || ['unavailable', 'unknown'].includes(state.state) || this._busy.has(item.entity)) return;
      if (action === 'more-info') {
        this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
      } else if (action === 'toggle' && TOGGLE.has(domain(item.entity))) {
        this._busy.add(item.entity); this._error = ''; this._render();
        try { await this._hass.callService(domain(item.entity), 'toggle', { entity_id: item.entity }); }
        catch (error) { this._error = `Aktion fehlgeschlagen: ${error.message || error}`; }
        finally { this._busy.delete(item.entity); this._render(); }
      }
    }
    _bindSubbutton(button, item, index) {
      let timer, held = false;
      const cancel = () => clearTimeout(timer);
      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || button.disabled) return;
        held = false; timer = setTimeout(() => { held = true; this._subAction(item, item.hold_action, index); }, 500);
      });
      for (const event of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(event, cancel);
      button.addEventListener('contextmenu', (event) => { event.preventDefault(); cancel(); });
      button.addEventListener('click', () => { cancel(); if (!held) this._subAction(item, item.tap_action, index); held = false; });
      button.addEventListener('keydown', (event) => { if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); this._subAction(item, item.hold_action, index); } });
    }
    async _subAction(item, action, index) {
      const busyKey = `subbutton:${index}`;
      if (!action || action.action === 'none' || this._busy.has(busyKey)) return;
      const state = this._hass?.states[item.entity];
      if (action.action === 'more-info') {
        if (item.entity) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        return;
      }
      if (action.action === 'toggle' && (!state || ['unknown', 'unavailable'].includes(state.state))) return;
      if (action.confirmation) {
        const exempt = action.confirmation.exemptions?.some((user) => user.user === this._hass.user?.id);
        if (!exempt && !window.confirm(action.confirmation.text || 'Aktion ausführen?')) return;
      }
      this._busy.add(busyKey); this._error = ''; this._render();
      try {
        if (action.action === 'toggle' && TOGGLE.has(domain(item.entity || ''))) await this._hass.callService(domain(item.entity), 'toggle', { entity_id: item.entity });
        else if (action.action === 'perform-action') {
          if (!action.perform_action) throw new Error('Bitte eine Aktion im Subbutton auswählen.');
          const [serviceDomain, service] = action.perform_action.split('.');
          await this._hass.callService(serviceDomain, service, action.data || {}, action.target || {});
        }
      } catch (error) { this._error = `Aktion fehlgeschlagen: ${error.message || error}`; }
      finally { this._busy.delete(busyKey); this._render(); }
    }
    _subbuttons() {
      const group = el('div', 'subbuttons'); group.setAttribute('part', 'subbuttons');
      this._config.subbuttons.forEach((item, index) => {
        const button = el('button', 'subbutton'); button.type = 'button'; button.setAttribute('part', 'subbutton');
        const rgb = item.background_color.slice(1).match(/../g).map((v) => parseInt(v, 16));
        button.style.backgroundColor = `rgba(${rgb.join(',')},${item.background_opacity})`;
        button.style.color = item.text_color;
        const label = item.name || this._hass.states[item.entity]?.attributes.friendly_name || 'Subbutton';
        button.setAttribute('aria-label', label);
        if (item.icon) button.append(icon(item.icon));
        if (item.name || !item.icon) button.append(el('span', '', label));
        button.disabled = this._busy.has(`subbutton:${index}`) || (item.tap_action.action === 'none' && item.hold_action.action === 'none');
        this._bindSubbutton(button, item, index); group.append(button);
      });
      return group;
    }
    _tile(item, status) {
      const state = this._hass.states[item.entity];
      const interactive = item.action !== 'none' || item.hold_action !== 'none';
      const tile = el(interactive ? 'button' : 'div', `item ${status ? 'status' : 'device'}${['on', 'playing', 'cleaning', 'run'].includes(state?.state) ? ' active' : ''}${!state ? ' missing' : ''}`);
      tile.dataset.entity = item.entity;
      tile.dataset.domain = domain(item.entity);
      tile.setAttribute('part', status ? 'status' : 'device');
      if (interactive) {
        tile.type = 'button';
        tile.disabled = !state || ['unavailable', 'unknown'].includes(state.state) || this._busy.has(item.entity);
        let timer, held = false;
        const cancel = () => { clearTimeout(timer); timer = undefined; };
        tile.addEventListener('pointerdown', (event) => {
          if (event.button !== 0 || tile.disabled) return;
          held = false;
          timer = setTimeout(() => { held = true; this._activate(item, item.hold_action); }, 500);
        });
        tile.addEventListener('pointerup', cancel);
        tile.addEventListener('pointerleave', cancel);
        tile.addEventListener('pointercancel', cancel);
        tile.addEventListener('contextmenu', (event) => { event.preventDefault(); cancel(); });
        tile.addEventListener('click', () => { cancel(); if (!held) this._activate(item); held = false; });
        tile.addEventListener('keydown', (event) => {
          if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); this._activate(item, item.hold_action); }
        });
      }
      const fallback = ({ light: 'mdi:lightbulb', switch: 'mdi:power-socket-eu', fan: 'mdi:fan', lock: 'mdi:lock', binary_sensor: 'mdi:checkbox-marked-circle-outline', sensor: 'mdi:gauge', media_player: 'mdi:television' })[domain(item.entity)] || 'mdi:circle-outline';
      const glyph = icon(item.icon || state?.attributes.icon || fallback);
      if (status) tile.append(glyph);
      else { const cell = el('span', 'icon-cell'); cell.append(glyph); tile.append(cell); }
      const text = el('div', 'text');
      text.append(el('div', 'name', item.name || state?.attributes.friendly_name || item.entity), el('div', 'state', this._state(state, status)));
      tile.append(text);
      return tile;
    }
    _render() {
      if (!this._config || !this._hass) return;
      const style = el('style'); style.textContent = css;
      const card = el('ha-card');
      const heading = el('div', 'heading');
      if (this._config.name || this._config.icon) {
        const header = el('header', 'header'); header.setAttribute('part', 'header');
        if (this._config.icon) header.append(icon(this._config.icon));
        if (this._config.name) header.append(el('h2', 'title', this._config.name));
        heading.append(header);
      }
      if (this._config.subbuttons.length) heading.append(this._subbuttons());
      if (heading.children.length) card.append(heading);
      if (this._config.devices.length) {
        const grid = el('div', 'grid devices'); grid.setAttribute('part', 'devices');
        this._config.devices.forEach((item) => grid.append(this._tile(item, false))); card.append(grid);
      }
      if (this._config.statuses.length) {
        const section = el('section', `statuses${this._config.devices.length ? '' : ' without-devices'}`); section.setAttribute('part', 'statuses');
        section.append(el('h3', 'section-title', 'Status & Sensoren'));
        const grid = el('div', 'grid'); this._config.statuses.forEach((item) => grid.append(this._tile(item, true)));
        section.append(grid); card.append(section);
      }
      if (!this._config.devices.length && !this._config.statuses.length) card.append(el('p', 'empty', 'Geräte und Status / Sensoren im Karteneditor hinzufügen.'));
      if (this._error) { const error = el('p', 'error', this._error); error.setAttribute('role', 'alert'); card.append(error); }
      this.shadowRoot.replaceChildren(style, card);
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
          if (!item.entity && item.tap_action.action === 'none' && item.hold_action.action === 'none') { next.tap_action = null; next.hold_action = null; }
          // Keep existing custom actions when replacing an assigned entity.
          update(next, true);
        }); body.append(entityForm);
        body.append(this._iconField('Icon', item.icon, (value) => update({ icon: value })));
        body.append(this._colorField('Hintergrundfarbe', item.background_color, (value) => update({ background_color: value })));
        const opacity = this._field('Hintergrunddeckkraft (0–100 %)', String(Math.round(item.background_opacity * 100)), (value) => update({ background_opacity: Number(value) / 100 }));
        const opacityInput = opacity.children[1]; opacityInput.type = 'number'; opacityInput.min = '0'; opacityInput.max = '100'; opacityInput.step = '1'; body.append(opacity);
        body.append(this._colorField('Schrift-/Iconfarbe', item.text_color, (value) => update({ text_color: value })));
        const actions = el('ha-form', 'field'); actions.hass = this._hass;
        const allowed = ['none', 'more-info', 'toggle', 'perform-action'].filter((action) => action === 'none' || action === 'perform-action' || (action === 'more-info' ? Boolean(item.entity) : TOGGLE.has(domain(item.entity || ''))));
        actions.schema = ['tap_action', 'hold_action'].map((name) => ({ name, selector: { ui_action: { actions: allowed } } }));
        actions.data = { tap_action: item.tap_action, hold_action: item.hold_action };
        actions.context = { entity_id: item.entity };
        actions.computeLabel = (schema) => schema.name === 'tap_action' ? 'Beim Tippen' : 'Beim Halten';
        actions.addEventListener('value-changed', (event) => { event.stopPropagation(); update(event.detail.value); }); body.append(actions, message);
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
              if (key === 'devices' && !TOGGLE.has(domain(value))) {
                if (next[key][i].action === 'toggle') next[key][i].action = 'more-info';
                if (next[key][i].hold_action === 'toggle') next[key][i].hold_action = 'more-info';
              }
              this._config = normalize(next); this._emit(); this._render();
            } catch (error) { message.textContent = error.message; }
          }, this._listId));
          const message = el('div', 'error'); message.setAttribute('role','alert'); body.append(message);
          body.append(this._field('Anzeigename (optional)', item.name, (value) => { this._config[key][i].name = value; this._emit(); this._render(); }));
          body.append(this._iconField('Icon (optional)', item.icon, (value) => { this._config[key][i].icon = value; this._emit(); }));
          for (const [actionField, actionLabel] of [['action', 'Beim Tippen'], ['hold_action', 'Beim Halten']]) {
            const wrap = el('label','field'); wrap.append(el('span','',actionLabel));
            const select = el('select');
            for (const [value,label] of [['toggle','Umschalten'],['more-info','Details öffnen'],['none','Keine Aktion']]) {
              if (value === 'toggle' && (key === 'statuses' || !TOGGLE.has(domain(item.entity)))) continue;
              const option = el('option','',label); option.value = value; select.append(option);
            }
            select.value = item[actionField];
            select.addEventListener('change',() => { this._config[key][i][actionField] = select.value; this._emit(); }); wrap.append(select); body.append(wrap);
          }
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
