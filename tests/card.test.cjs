const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.attributes={}; this.listeners={}; this.events=[]; }
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
