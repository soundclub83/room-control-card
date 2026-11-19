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
  const css = `:host{display:block;color:var(--primary-text-color,#d5dee6)}*{box-sizing:border-box}ha-card.outer{padding:12px;border-radius:var(--climate-control-radius,24px);background:var(--climate-control-background,linear-gradient(145deg,rgba(37,53,65,.75),rgba(22,34,44,.94)));border:1px solid rgba(155,180,200,.10);box-shadow:0 6px 24px rgba(0,0,0,.10)}.header{display:flex;align-items:center;gap:14px;margin:4px 6px 18px}.header h2{font-size:20px;margin:0}.header:after{content:'';height:2px;flex:1;background:linear-gradient(90deg,rgba(255,170,80,.5),rgba(255,170,80,.12))}.grid{display:grid;gap:8px;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));margin-bottom:8px}.tile,.demand,.control{border:1px solid rgba(150,175,195,.08);border-radius:16px;background:var(--climate-control-item-background,rgba(145,165,185,.045));color:inherit}.tile{display:flex;align-items:center;gap:10px;min-width:0;padding:9px 12px;min-height:58px;font:inherit;text-align:left;cursor:pointer}.tile ha-icon{color:var(--secondary-text-color,#91a4b3);flex:none}.name{font-size:11px;color:var(--climate-control-label,#6cdbc9)}.value{font-size:15px;font-weight:600;margin-top:3px}.label{font-size:11px;font-weight:600;letter-spacing:.07em;color:var(--secondary-text-color);border-top:1px solid var(--divider-color);padding:12px 0;margin:12px 0 0}.child{display:block;min-width:0;width:100%;max-width:100%;--ha-card-background:var(--climate-control-item-background,rgba(145,165,185,.045));--card-background-color:var(--climate-control-item-background,rgba(145,165,185,.045));--ha-card-border-radius:16px;--ha-card-border-color:rgba(150,175,195,.08);--ha-card-border-width:1px;--ha-card-box-shadow:none}.column{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start}.column>div,.graph-slot{min-width:0;max-width:100%;overflow:hidden}.thermostat-slot{height:248px;--state-climate-heat-color:var(--primary-color);--accent-color:var(--primary-color)}.thermostat-slot>.child{height:100%}.demand{display:flex;justify-content:center;align-items:center;gap:12px;min-height:46px;font:inherit;width:100%;cursor:pointer}.fan-speed-slot{--state-fan-on-color:var(--state-icon-color,#44739e);--state-fan-off-color:var(--state-icon-color,#44739e);--state-fan-active-color:var(--state-icon-color,#44739e);--state-fan-inactive-color:var(--state-icon-color,#44739e);--state-inactive-color:var(--state-icon-color,#44739e)}.fan-buttons{display:flex;gap:8px;margin-bottom:12px}.fan-buttons button{flex:1;min-width:0;justify-content:center;font-size:14px;font-weight:600}.fan-buttons ha-icon{color:inherit}.active-on{color:#78aaff}.active-off{color:#ff6666}.active-lock{color:#ffb347}.control{display:flex;align-items:center;gap:12px;padding:12px}.control input{flex:1;min-width:0;accent-color:var(--primary-color)}.error{color:var(--error-color,#ef9292);font-size:13px}button:disabled,input:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}`;
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
      const control = node('div', 'fan-speed-slot');
      this._content.append(control);
      if (c.entity) this._child(control, {
        type: 'tile', entity: c.entity, name: 'Lüftergeschwindigkeit', icon: 'mdi:fan',
        state_content: ['percentage'],
        tap_action: { action: 'more-info' }, icon_tap_action: { action: 'toggle' },
        features: [{ type: 'fan-speed' }],
      }, this._generation);

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
