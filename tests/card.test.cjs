const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.attributes={}; this.listeners={}; this.events=[]; this.style={}; }
  attachShadow() { return this.shadowRoot=new Element('shadow'); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=children; }
  setAttribute(k,v) { this.attributes[k]=v; }
  addEventListener(k,fn) { this.listeners[k]=fn; }
  dispatchEvent(e) { this.events.push(e); return true; }
}
function setup() {
  const registry=new Map();
  const context=vm.createContext({ HTMLElement:Element, document:{createElement(tag) { return registry.has(tag) ? new (registry.get(tag))() : new Element(tag); }}, customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)}, window:{}, setTimeout, clearTimeout, CustomEvent:class { constructor(type,options) {this.type=type;Object.assign(this,options);} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../room-control-card.js'),'utf8'),context);
  const card=new (registry.get('room-control-card'))();
  const calls=[];
  const states={
    'light.test':{entity_id:'light.test',state:'on',attributes:{friendly_name:'Lampe'}},
    'sensor.test':{entity_id:'sensor.test',state:'21',attributes:{unit_of_measurement:'°C'}},
    'lock.test':{entity_id:'lock.test',state:'locked',attributes:{}},
  };
  const hass={states,callService:async(...args)=>calls.push(args)};
  card.hass=hass;
  return {card,calls,hass,registry};
}
function all(node) {return [node,...node.children.flatMap(all)];}
test('devices and statuses share one card; statuses can open details but never toggle',()=>{
  const {card}=setup();
  card.setConfig({name:'Raum',devices:['light.test'],statuses:['sensor.test','light.test']});
  const nodes=all(card.shadowRoot);
  assert.equal(nodes.filter(n=>n.tagName==='ha-card').length,1);
  assert.equal(nodes.filter(n=>n.className?.includes('status') && n.dataset.entity).length,2);
  assert.equal(nodes.filter(n=>n.tagName==='button').length,3);
  assert.equal(card._config.statuses[0].action,'more-info');
  assert.equal(card._config.statuses[0].hold_action,'none');
});
test('normalization preserves unknown config and does not mutate caller',()=>{
  const {card}=setup(); const input={devices:['light.test'],statuses:[],card_mod:{style:'test'}};
  const before=JSON.stringify(input); card.setConfig(input);
  assert.equal(JSON.stringify(input),before);
  assert.equal(card._config.card_mod.style,'test');
});
test('invalid status actions and unsupported toggles are rejected',()=>{
  const {card}=setup();
  assert.throws(()=>card.setConfig({statuses:[{entity:'sensor.test',action:'toggle'}]}));
  assert.throws(()=>card.setConfig({devices:[{entity:'lock.test',action:'toggle'}]}));
  assert.throws(()=>card.setConfig({devices:[{entity:'bad'}]}));
});
test('toggle targets only selected entity; locks open details',async()=>{
  const {card,calls}=setup();card.setConfig({devices:['light.test','lock.test']});
  await card._activate(card._config.devices[0]);
  assert.equal(JSON.stringify(calls),JSON.stringify([['light','toggle',{entity_id:'light.test'}]]));
  await card._activate(card._config.devices[1]);
  assert.equal(calls.length,1);assert.equal(card.events[0].detail.entityId,'lock.test');
});
test('unavailable entities never call a service; failures are displayed',async()=>{
  const {card,calls,hass}=setup(); card.setConfig({devices:['light.test']});
  hass.states['light.test'].state='unavailable';await card._activate(card._config.devices[0]);assert.equal(calls.length,0);
  hass.states['light.test'].state='on';hass.callService=async()=>{throw Error('Kein Zugriff');};
  await card._activate(card._config.devices[0]);assert.match(card._error,/Kein Zugriff/);assert.equal(card._busy.size,0);
});
test('editor reorder and removal emit independent config snapshots',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();
  editor.hass=hass;editor.setConfig({devices:['light.test','lock.test'],statuses:['sensor.test'],card_mod:{style:'keep'}});
  editor._move('devices',1,0);
  const event=editor.events.at(-1);assert.equal(event.type,'config-changed');assert.equal(event.config,undefined);
  assert.equal(event.detail.config.devices[0].entity,'lock.test');assert.equal(event.detail.config.card_mod.style,'keep');
  const remove=all(editor.shadowRoot).find(n=>n.textContent==='Entfernen');remove.listeners.click();
  assert.equal(editor._config.devices.length,1);assert.equal(event.detail.config.devices.length,2);
});
test('editor entity selection adds to correct section and status offers only non-switching actions',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;editor.setConfig({});
  let fields=all(editor.shadowRoot).filter(n=>n.tagName==='label' && n.children[0]?.textContent==='Entität hinzufügen');
  let input=fields[1].children[1];input.value='sensor.test';input.listeners.change();
  assert.equal(editor._config.statuses[0].entity,'sensor.test');assert.equal(editor._config.devices.length,0);
  assert.equal(all(editor.shadowRoot).filter(n=>n.tagName==='select').length,2);
  assert.equal(all(editor.shadowRoot).some(n=>n.tagName==='option' && n.value==='toggle'),false);
});

test('per-button tap and hold choices persist through the visual editor',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;editor.setConfig({devices:['light.test'],statuses:['sensor.test']});
  const selects=all(editor.shadowRoot).filter(n=>n.tagName==='select');
  selects[0].value='more-info';selects[0].listeners.change();selects[1].value='none';selects[1].listeners.change();
  assert.equal(editor.events.at(-1).detail.config.devices[0].action,'more-info');
  assert.equal(editor.events.at(-1).detail.config.devices[0].hold_action,'none');
});
test('hold opens details without also triggering tap',async()=>{
  const {card,calls}=setup();card.setConfig({devices:['light.test']});
  const tile=all(card.shadowRoot).find(n=>n.tagName==='button');
  tile.listeners.pointerdown({button:0});await new Promise(resolve=>setTimeout(resolve,550));
  tile.listeners.pointerup();tile.listeners.click();
  assert.equal(calls.length,0);assert.equal(card.events[0].type,'hass-more-info');
});
test('editor entries start collapsed and preserve open state on config updates',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;
  const config={name:'Testraum',devices:['light.test'],statuses:['sensor.test'],card_mod:{style:'ha-card {border-radius:24px;}'}};
  editor.setConfig(config);
  let entries=all(editor.shadowRoot).filter(n=>n.tagName==='details');
  assert.equal(entries.length,2);assert.ok(entries.every(n=>n.open===false));
  entries[0].open=true;entries[0].listeners.toggle();editor.setConfig(config);
  entries=all(editor.shadowRoot).filter(n=>n.tagName==='details');assert.equal(entries[0].open,true);assert.equal(entries[1].open,false);
  assert.equal(editor._config.card_mod.style,config.card_mod.style);
});
test('device layout has icon background and compact status layout does not',()=>{
  const {card}=setup();card.setConfig({devices:['light.test'],statuses:['sensor.test']});
  const nodes=all(card.shadowRoot);
  assert.equal(nodes.filter(n=>n.className==='icon-cell').length,1);
  assert.equal(nodes.find(n=>n.dataset.entity==='light.test').dataset.domain,'light');
  assert.equal(nodes.find(n=>n.className==='section-title').textContent,'Status & Sensoren');
});
test('brightness shown as percent; explicit names and config remain unchanged',()=>{
  const {card,hass}=setup();hass.states['light.test'].attributes.brightness=128;
  const config={name:'Testraum',devices:[{entity:'light.test',name:'Nanoleaf',action:'more-info',hold_action:'more-info'}],statuses:['sensor.test']};
  const original=JSON.stringify(config);card.setConfig(config);
  const device=all(card.shadowRoot).find(n=>n.dataset.entity==='light.test');
  assert.equal(all(device).find(n=>n.className==='state').textContent,'50 %');
  assert.equal(all(device).find(n=>n.className==='name').textContent,'Nanoleaf');
  assert.equal(JSON.stringify(config),original);
});
test('subbuttons retain colors, opacity and old device settings',()=>{
  const {card}=setup();const config={devices:['light.test'],subbuttons:[{name:'AUTO',entity:'script.auto',background_color:'#ff0000',text_color:'#ffffff',background_opacity:.4}]};
  card.setConfig(config);const button=all(card.shadowRoot).find(n=>n.className==='subbutton');
  assert.equal(button.style.backgroundColor,'rgba(255,0,0,0.4)');assert.equal(button.style.color,'#ffffff');
  assert.equal(card._config.devices[0].action,'toggle');assert.equal(config.subbuttons[0].tap_action,undefined);
});
test('subbutton script defaults and selected service targets are executed exactly',async()=>{
  const {card,hass}=setup();const calls=[];hass.callService=async(...args)=>calls.push(args);
  card.setConfig({subbuttons:[{name:'AUTO',entity:'script.auto'}]});
  await card._subAction(card._config.subbuttons[0],card._config.subbuttons[0].tap_action,0);
  assert.equal(JSON.stringify(calls),JSON.stringify([['script','turn_on',{}, {entity_id:'script.auto'}]]));
  const action={action:'perform-action',perform_action:'light.turn_on',data:{brightness_pct:30},target:{entity_id:'light.test'}};
  await card._subAction(card._config.subbuttons[0],action,0);
  assert.equal(JSON.stringify(calls[1]),JSON.stringify(['light','turn_on',{brightness_pct:30},{entity_id:'light.test'}]));
});
test('subbutton validation blocks malformed colors, opacity and unsupported toggles',()=>{
  const {card}=setup();
  assert.throws(()=>card.setConfig({subbuttons:[{background_color:'red;display:none'}]}));
  assert.throws(()=>card.setConfig({subbuttons:[{background_opacity:2}]}));
  assert.throws(()=>card.setConfig({subbuttons:[{entity:'sensor.test',tap_action:{action:'toggle'}}]}));
});
test('icon selectors emit selected icons and allow clearing them',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;editor.setConfig({devices:['light.test'],statuses:['sensor.test']});
  const forms=all(editor.shadowRoot).filter(n=>n.tagName==='ha-form' && n.schema?.[0]?.selector?.icon);
  assert.equal(forms.length,3);
  forms[0].listeners['value-changed']({stopPropagation(){},detail:{value:{icon:'mdi:sofa'}}});assert.equal(editor._config.icon,'mdi:sofa');
  forms[0].listeners['value-changed']({stopPropagation(){},detail:{value:{icon:''}}});assert.equal(editor._config.icon,'');
});
test('subbutton editor adds entries and saves colors and native actions',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;editor.setConfig({});
  all(editor.shadowRoot).find(n=>n.textContent==='Subbutton hinzufügen').listeners.click();
  assert.equal(editor._config.subbuttons.length,1);
  const color=all(editor.shadowRoot).find(n=>n.tagName==='input' && n.type==='color');color.value='#123456';color.listeners.change();
  assert.equal(editor.events.at(-1).detail.config.subbuttons[0].background_color,'#123456');
  const form=all(editor.shadowRoot).find(n=>n.tagName==='ha-form' && n.schema?.[0]?.selector?.ui_action);
  const action={action:'perform-action',perform_action:'script.turn_on',target:{entity_id:'script.auto'}};
  form.listeners['value-changed']({stopPropagation(){},detail:{value:{tap_action:action,hold_action:{action:'none'}}}});
  assert.equal(editor.events.at(-1).detail.config.subbuttons[0].tap_action.perform_action,'script.turn_on');
});
test('subbutton hold does not trigger a second tap action',async()=>{
  const {card,calls}=setup();card.setConfig({subbuttons:[{entity:'light.test',tap_action:{action:'toggle'},hold_action:{action:'more-info'}}]});
  const button=all(card.shadowRoot).find(n=>n.className==='subbutton');button.listeners.pointerdown({button:0});await new Promise(resolve=>setTimeout(resolve,550));button.listeners.pointerup();button.listeners.click();
  assert.equal(calls.length,0);assert.equal(card.events.at(-1).type,'hass-more-info');
});
test('assigning a script to a new subbutton preselects script.turn_on',()=>{
  const {registry,hass}=setup();const editor=new (registry.get('room-control-card-editor'))();editor.hass=hass;editor.setConfig({});
  all(editor.shadowRoot).find(n=>n.textContent==='Subbutton hinzufügen').listeners.click();
  const form=all(editor.shadowRoot).find(n=>n.tagName==='ha-form' && n.schema?.[0]?.selector?.entity);
  form.listeners['value-changed']({stopPropagation(){},detail:{value:{entity:'script.auto'}}});
  assert.equal(editor._config.subbuttons[0].tap_action.perform_action,'script.turn_on');
  assert.equal(editor._config.subbuttons[0].tap_action.target.entity_id,'script.auto');
});
test('subbutton service failures are visible and release the pending state',async()=>{
  const {card,hass}=setup();hass.callService=async()=>{throw Error('Nicht erlaubt');};
  card.setConfig({subbuttons:[{entity:'script.auto'}]});await card._subAction(card._config.subbuttons[0],card._config.subbuttons[0].tap_action,0);
  assert.match(card._error,/Nicht erlaubt/);assert.equal(card._busy.size,0);
});
