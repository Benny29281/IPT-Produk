import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('admin shell waits for its editor and rejects messages from other windows', async () => {
  const html=await readFile(new URL('../admin/index.html',import.meta.url),'utf8');
  const script=await readFile(new URL('../admin/admin.js',import.meta.url),'utf8');
  const nodes=new Map(),events={};
  const node=id=>{
    assert.ok(html.includes(`id="${id}"`));
    if (!nodes.has(id)) nodes.set(id,{
      hidden:id==='admin-help',attrs:{},handlers:{},dataset:{src:'cms.html?v=test'},contentWindow:{},
      setAttribute(key,value){this.attrs[key]=value;},addEventListener(type,fn){this.handlers[type]=fn;},focus(){}
    });
    return nodes.get(id);
  };
  const origin='http://localhost:4173';
  vm.runInNewContext(script,{
    document:{getElementById:node,addEventListener:(type,fn)=>events[type]=fn},
    window:{location:{origin,href:origin+'/admin/'},addEventListener:(type,fn)=>events[type]=fn},
    URL,Date,setTimeout:()=>1,clearTimeout(){}
  });
  assert.match(node('cms-frame').src,/\/admin\/cms.html\?v=test&reload=\d+$/);
  assert.equal(node('admin-loading').hidden,false);
  events.message({origin:'https://other.example',source:node('cms-frame').contentWindow,data:{type:'tobapia-admin-ready'}});
  assert.equal(node('admin-loading').hidden,false);
  events.message({origin,source:{},data:{type:'tobapia-admin-ready'}});
  assert.equal(node('admin-loading').hidden,false);
  events.message({origin,source:node('cms-frame').contentWindow,data:{type:'tobapia-admin-ready'}});
  assert.equal(node('admin-loading').hidden,true);
  assert.equal(node('nc-root').attrs['aria-busy'],'false');
  node('help-toggle').handlers.click();
  assert.equal(node('admin-help').hidden,false);
  events.keydown({key:'Escape'});
  assert.equal(node('admin-help').hidden,true);
  node('retry-loading').handlers.click();
  events.message({origin,source:node('cms-frame').contentWindow,data:{type:'tobapia-admin-error'}});
  assert.equal(node('retry-loading').hidden,false);
  assert.equal(node('loading-spinner').hidden,true);
});

test('isolated editor reports successful initialization and loading failure', async () => {
  const script=await readFile(new URL('../admin/cms.js',import.meta.url),'utf8');
  const sent=[];
  let library,config;
  const origin='http://localhost:4173';
  const context={
    window:{location:{origin,href:origin+'/admin/cms.html'},parent:{postMessage:(message,target)=>sent.push([message.type,target])},CMS:{init:async options=>config=options.config}},
    document:{createElement:()=>({}),head:{append:script=>library=script}},URL,console
  };
  vm.runInNewContext(script,context);
  assert.equal(context.window.CMS_MANUAL_INIT,true);
  await library.onload();
  assert.equal(config.logo.src,origin+'/images/Tobapia-01.png');
  assert.deepEqual(sent[0],['tobapia-admin-ready',origin]);
  library.onerror();
  assert.deepEqual(sent[1],['tobapia-admin-error',origin]);
});
