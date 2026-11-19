const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.events=[];this.attributes={};this.style={setProperty(){}};}
 attachShadow(){return this.shadowRoot=new Element('shadow');}
 append(...x){this.children.push(...x);}
 replaceChildren(...x){this.children=x;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,f){this.listeners[k]=f;}
 dispatchEvent(e){this.events.push(e);}
}
const flush=()=>new Promise(require('node:timers').setImmediate);
const all=e=>[e,...e.children.flatMap(all)];
function setup(delays=false){
 const registry=new Map(),calls=[],configs=[],pending=[];
 const helpers={createCardElement(c){configs.push(c);const e=new Element(c.type);e.config=c;return e;}};
 const context=vm.createContext({HTMLElement:Element,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},document:{createElement:t=>registry.has(t)?new (registry.get(t))():new Element(t)},customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},window:{loadCardHelpers:()=>delays?new Promise(r=>pending.push(()=>r(helpers))):Promise.resolve(helpers)}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/climate-cards.js'),'utf8'),context);
 const states={'fan.test':{state:'off',attributes:{supported_features:1,percentage:0,percentage_step:10,preset_modes:['Normal']}},'input_boolean.lock':{state:'off',attributes:{}},'sensor.temp':{state:'21',attributes:{unit_of_measurement:'°C'}}};
 const hass={states,locale:{language:'de'},formatEntityState:s=>s.state+' '+(s.attributes.unit_of_measurement||''),callService:async(...args)=>calls.push(args)};
 return {registry,calls,configs,pending,hass,card:type=>new (registry.get(type))()};
}
test('one/two heaters retain stable thermostat and PI slots after asynchronous loading',async()=>{
 const s=setup(true),c=s.card('heating-control-card');c.hass=s.hass;c.setConfig({temperature:'sensor.temp',windows:['binary_sensor.one'],heaters:[{entity:'climate.left',demand:'number.left'},{entity:'climate.right',demand:'sensor.right'}]});
 const outer=c._outer,columns=all(c.shadowRoot).filter(e=>e.className==='column');
 s.pending.reverse().forEach(f=>f());await flush();
 assert.equal(columns.length,2);
 for(const col of columns){assert.equal(col.children[0].children[0].config.type,'thermostat');assert.equal(col.children[1].children[0].config.type,'tile');}
 assert.equal(columns[0].children[1].children[0].config.entity,'number.left');
 const thermostat=columns[0].children[0].children[0];c.hass={...s.hass,states:{...s.hass.states,'sensor.temp':{state:'22',attributes:{}}}};
 assert.equal(c._outer,outer);assert.equal(columns[0].children[0].children[0],thermostat);assert.equal(s.configs.length,5);
});
test('stale helper results cannot append children after config changes',async()=>{
 const s=setup(true),c=s.card('heating-control-card');c.setConfig({heaters:['climate.old']});c.setConfig({heaters:['climate.new']});s.pending.forEach(f=>f());await flush();assert.deepEqual(s.configs.map(x=>x.entity),['climate.new']);
});
test('fan preserves explicit turn-on percentage and supported preset; Lock targets only its helper',async()=>{
 const s=setup(),c=s.card('fan-control-card');c.hass=s.hass;c.setConfig({entity:'fan.test',lock_entity:'input_boolean.lock',preset_mode:'Normal',on_percentage:50});
 const buttons=all(c.shadowRoot).filter(e=>e.tagName==='button');await buttons[0].listeners.click();await flush();
 assert.equal(JSON.stringify(s.calls[0]),JSON.stringify(['fan','turn_on',{entity_id:'fan.test',percentage:50,preset_mode:'Normal'}]));
 await buttons[2].listeners.click();await flush();assert.equal(JSON.stringify(s.calls[1]),JSON.stringify(['input_boolean','toggle',{entity_id:'input_boolean.lock'}]));
});
test('unavailable devices cannot send actions; failures are visible',async()=>{
 const s=setup(),c=s.card('fan-control-card');c.hass=s.hass;c.setConfig({entity:'fan.test'});s.hass.states['fan.test'].state='unavailable';await c._service('fan','turn_on',{entity_id:'fan.test'},'fan.test');assert.equal(s.calls.length,0);
 s.hass.states['fan.test'].state='off';s.hass.callService=async()=>{throw Error('Testfehler');};await c._service('fan','turn_on',{entity_id:'fan.test'},'fan.test');assert.equal(c._error.textContent,'Testfehler');
});
test('validation limits each row to two and rejects incompatible domains',()=>{
 const s=setup(),c=s.card('heating-control-card');assert.throws(()=>c.setConfig({heaters:['climate.a','climate.b','climate.c']}));assert.throws(()=>c.setConfig({windows:['switch.a']}));assert.throws(()=>c.setConfig({heaters:[{entity:'climate.a',demand:'switch.a'}]}));
 const fan=s.card('fan-control-card');assert.throws(()=>fan.setConfig({entity:'light.a'}));assert.throws(()=>fan.setConfig({entity:'fan.test',on_percentage:101}));
});
test('fan editor retains earlier field changes and optional lock can be cleared',()=>{
 const s=setup(),e=new (s.registry.get('fan-control-card-editor'))();e.setConfig({type:'custom:fan-control-card',entity:'fan.test'});let f=e._forms[0];f.listeners['value-changed']({stopPropagation(){},detail:{value:{entity:'fan.test',name:'Raum'}}});f.listeners['value-changed']({stopPropagation(){},detail:{value:{entity:'fan.test',name:'Raum',lock_entity:'input_boolean.lock'}}});assert.equal(e._config.name,'Raum');assert.equal(e._config.lock_entity,'input_boolean.lock');
});
test('temperature graph keeps its position above heating after delayed loading',async()=>{
 const s=setup(true),c=s.card('heating-control-card');c.setConfig({temperature:'sensor.temp',heaters:['climate.one']});
 const before=c._content.children.map(x=>x.className);assert.ok(before.indexOf('graph-slot')<before.indexOf('label'));
 s.pending.reverse().forEach(f=>f());await flush();assert.equal(c._content.children.find(x=>x.className==='graph-slot').children[0].config.type,'statistics-graph');
 assert.deepEqual(c._content.children.map(x=>x.className),before);
 const slot=all(c.shadowRoot).find(x=>x.className==='thermostat-slot');assert.equal(slot.children[0].config.entity,'climate.one');
});
test('fan speed uses the native tile slider while preserving the separate action buttons',async()=>{
 const s=setup(),c=s.card('fan-control-card');c.hass=s.hass;c.setConfig({entity:'fan.test',lock_entity:'input_boolean.lock'});await flush();
 const tile=s.configs.find(x=>x.type==='tile');assert.equal(tile.entity,'fan.test');assert.equal(tile.features[0].type,'fan-speed');assert.equal(tile.icon_tap_action.action,'toggle');assert.equal(tile.tap_action.action,'more-info');
 assert.equal(all(c.shadowRoot).filter(e=>e.tagName==='input').length,0);
 assert.equal(all(c.shadowRoot).filter(e=>e.tagName==='button').length,3);
});
