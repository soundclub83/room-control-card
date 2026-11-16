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
    :host{display:block;color:var(--primary-text-color)} *{box-sizing:border-box}
    ha-card{padding:var(--room-control-padding,16px);border-radius:var(--room-control-radius,var(--ha-card-border-radius,16px));background:var(--room-control-background,var(--ha-card-background,var(--card-background-color)));overflow:hidden}
    .header{display:flex;align-items:center;gap:12px;margin:0 0 16px}.title{font-size:var(--room-control-title-size,22px);font-weight:600;margin:0;overflow-wrap:anywhere}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--room-control-gap,8px)}
    .item{display:flex;align-items:center;gap:10px;min-width:0;width:100%;text-align:start;color:inherit;background:var(--room-control-item-background,rgba(127,127,127,.07));border:1px solid var(--divider-color);border-radius:var(--room-control-item-radius,12px);padding:12px;font:inherit;min-height:70px}
    button.item{cursor:pointer}button.item:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}button:disabled{cursor:default;opacity:.55}
    .icon{flex:none;--mdc-icon-size:24px}.text{min-width:0}.name{font-weight:500;overflow-wrap:anywhere}.state{font-size:13px;color:var(--secondary-text-color);margin-top:3px;overflow-wrap:anywhere}
    .active .icon{color:var(--room-control-active-color,var(--state-active-color,var(--primary-color)))}
    .statuses{margin-top:16px;padding-top:12px;border-top:1px solid var(--divider-color)}.statuses:first-child{margin-top:0;padding-top:0;border-top:0}
    .section-title{font-size:12px;font-weight:600;color:var(--secondary-text-color);margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em}
    .status{min-height:56px;padding:10px}.missing,.error{color:var(--error-color,#db4437)}.error{font-size:13px;margin:12px 0 0}.empty{color:var(--secondary-text-color);font-size:14px;margin:0}
    @media(max-width:350px){.grid{grid-template-columns:1fr}}
  `;
  class RoomControlCard extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._busy = new Set(); }
    static getConfigElement() { return document.createElement(`${TYPE}-editor`); }
    static getStubConfig() { return { type: `custom:${TYPE}`, name: 'Raum', devices: [], statuses: [] }; }
    setConfig(config) { this._config = normalize(config); this._render(); }
    set hass(value) { this._hass = value; this._render(); }
    getCardSize() { return 1 + Math.ceil((this._config?.devices.length || 0) / 2) + Math.ceil((this._config?.statuses.length || 0) / 2); }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
    _state(state) {
      if (!state) return 'Entität nicht gefunden';
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
    _tile(item, status) {
      const state = this._hass.states[item.entity];
      const interactive = item.action !== 'none' || item.hold_action !== 'none';
      const tile = el(interactive ? 'button' : 'div', `item ${status ? 'status' : 'device'}${state?.state === 'on' ? ' active' : ''}${!state ? ' missing' : ''}`);
      tile.dataset.entity = item.entity;
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
      tile.append(icon(item.icon || state?.attributes.icon || fallback));
      const text = el('div', 'text');
      text.append(el('div', 'name', item.name || state?.attributes.friendly_name || item.entity), el('div', 'state', this._state(state)));
      tile.append(text);
      return tile;
    }
    _render() {
      if (!this._config || !this._hass) return;
      const style = el('style'); style.textContent = css;
      const card = el('ha-card');
      if (this._config.name || this._config.icon) {
        const header = el('header', 'header'); header.setAttribute('part', 'header');
        if (this._config.icon) header.append(icon(this._config.icon));
        if (this._config.name) header.append(el('h2', 'title', this._config.name));
        card.append(header);
      }
      if (this._config.devices.length) {
        const grid = el('div', 'grid devices'); grid.setAttribute('part', 'devices');
        this._config.devices.forEach((item) => grid.append(this._tile(item, false))); card.append(grid);
      }
      if (this._config.statuses.length) {
        const section = el('section', 'statuses'); section.setAttribute('part', 'statuses');
        section.append(el('h3', 'section-title', 'Status / Sensoren'));
        const grid = el('div', 'grid'); this._config.statuses.forEach((item) => grid.append(this._tile(item, true)));
        section.append(grid); card.append(section);
      }
      if (!this._config.devices.length && !this._config.statuses.length) card.append(el('p', 'empty', 'Geräte und Status / Sensoren im Karteneditor hinzufügen.'));
      if (this._error) { const error = el('p', 'error', this._error); error.setAttribute('role', 'alert'); card.append(error); }
      this.shadowRoot.replaceChildren(style, card);
    }
  }
  class RoomControlCardEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._listId = `rcc-${Math.random().toString(36).slice(2)}`; }
    setConfig(config) { this._config = normalize(config); this._render(); }
    set hass(value) {
      const changed = !this._hass || Object.keys(value.states).join() !== Object.keys(this._hass.states).join();
      this._hass = value;
      if (changed) this._render();
    }
    _emit() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: clone(this._config) }, bubbles: true, composed: true })); }
    _field(label, value, onChange, list) {
      const wrap = el('label', 'field'); wrap.append(el('span', '', label));
      const input = el('input'); input.value = value || '';
      if (list) input.setAttribute('list', list);
      input.addEventListener('change', () => onChange(input.value.trim())); wrap.append(input); return wrap;
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
      const style = el('style'); style.textContent = `:host{display:block;color:var(--primary-text-color)}*{box-sizing:border-box}.field{display:grid;gap:5px;margin:10px 0;font-size:14px}input,select,button{font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#888);border-radius:6px;padding:9px;max-width:100%}input{width:100%}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--primary-color)}fieldset{border:1px solid var(--divider-color,#888);border-radius:8px;margin:16px 0;padding:12px;min-width:0}.entry{border-top:1px solid var(--divider-color,#888);padding:8px 0}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.hint{font-size:13px;color:var(--secondary-text-color)}.error{color:var(--error-color,#db4437)}`;
      const root = el('div');
      for (const [key, label] of [['name', 'Raum-/Abschnittsname'], ['icon', 'Icon (optional, z. B. mdi:sofa)']]) root.append(this._field(label, this._config[key], (value) => { this._config[key] = value; this._emit(); }));
      const list = el('datalist'); list.id = this._listId;
      for (const state of Object.values(this._hass?.states || {}).sort((a,b) => a.entity_id.localeCompare(b.entity_id))) {
        const option = el('option'); option.value = state.entity_id; option.label = state.attributes.friendly_name || state.entity_id; list.append(option);
      }
      root.append(list);
      for (const [key, title] of [['devices', 'Geräte'], ['statuses', 'Status / Sensoren']]) {
        const section = el('fieldset'); section.append(el('legend', '', title));
        section.append(el('p', 'hint', key === 'devices' ? 'Licht, Schalter und Ventilatoren können umgeschaltet werden. Andere Geräte öffnen ihre Details.' : 'Keine Schaltaktionen. Details öffnen oder keine Aktion sind pro Feld einstellbar.'));
        this._config[key].forEach((item, i) => {
          const entry = el('div', 'entry');
          entry.append(this._field('Entität', item.entity, (value) => {
            try {
              const next = clone(this._config); next[key][i].entity = value;
              if (key === 'devices' && !TOGGLE.has(domain(value))) {
                if (next[key][i].action === 'toggle') next[key][i].action = 'more-info';
                if (next[key][i].hold_action === 'toggle') next[key][i].hold_action = 'more-info';
              }
              this._config = normalize(next); this._emit(); this._render();
            } catch (error) { message.textContent = error.message; }
          }, this._listId));
          const message = el('div', 'error'); message.setAttribute('role','alert'); entry.append(message);
          for (const [field,label] of [['name','Anzeigename (optional)'],['icon','Icon (optional)']]) entry.append(this._field(label,item[field],(value) => { this._config[key][i][field] = value; this._emit(); }));
          for (const [actionField, actionLabel] of [['action', 'Beim Tippen'], ['hold_action', 'Beim Halten']]) {
            const wrap = el('label','field'); wrap.append(el('span','',actionLabel));
            const select = el('select');
            for (const [value,label] of [['toggle','Umschalten'],['more-info','Details öffnen'],['none','Keine Aktion']]) {
              if (value === 'toggle' && (key === 'statuses' || !TOGGLE.has(domain(item.entity)))) continue;
              const option = el('option','',label); option.value = value; select.append(option);
            }
            select.value = item[actionField];
            select.addEventListener('change',() => { this._config[key][i][actionField] = select.value; this._emit(); }); wrap.append(select); entry.append(wrap);
          }
          const bar = el('div','toolbar');
          bar.append(this._button('Nach oben',() => this._move(key,i,i-1),i===0),this._button('Nach unten',() => this._move(key,i,i+1),i===this._config[key].length-1),this._button('Entfernen',() => { this._config[key].splice(i,1); this._emit(); this._render(); }));
          entry.append(bar); section.append(entry);
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
