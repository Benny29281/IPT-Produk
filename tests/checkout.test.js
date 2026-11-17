import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as order from '../assets/js/order.js';
import * as catalog from '../assets/js/catalog.js';
import * as customer from '../assets/js/customer.js';
import * as delivery from '../assets/js/delivery.js';
import {translate} from '../assets/js/i18n.js';
import {createOrderSnapshot} from '../assets/js/order-document.js';

test('checkout requires a cart and address; cart edits invalidate the payment order', async () => {
  for (const page of ['cart.html','harga/cart.html']) {
    const html=await readFile(new URL('../'+page,import.meta.url),'utf8');
    const catalogHtml=await readFile(new URL('../'+page.replace('cart.html','index.html'),import.meta.url),'utf8');
    assert.match(catalogHtml,/<aside id="order" hidden/);
    assert.match(html,/<section id="catalog" hidden/);
    assert.match(html,/id="continue-shopping"/);
    const storage=new Map();
    const elements=new Map();
    const element=selector=>{
      if (!elements.has(selector)) elements.set(selector,{
        value:'',hidden:false,disabled:false,dataset:{},handlers:{},
        classList:{toggle(){}},setAttribute(){},removeAttribute(){},focus(){},scrollIntoView(){},
        addEventListener(type,handler){this.handlers[type]=handler;}
      });
      return elements.get(selector);
    };
    const steps=['cart','address','payment'].map(step=>({...element('step-'+step),dataset:{checkoutStep:step}}));
    const document={
      body:{dataset:{priced:page.startsWith('harga')?'true':'false',page:'checkout'}},documentElement:{},
      querySelector(selector){
        if (selector.startsWith('#')) assert.ok(html.includes(`id="${selector.slice(1)}"`),`Missing ${selector} on ${page}`);
        return element(selector);
      },
      querySelectorAll:selector=>selector==='[data-checkout-step]'?steps:[]
    };
    element('#customer-form').reportValidity=()=>['name','phone','country','city','region','address','postal'].every(key=>element('#customer-'+key).value.trim());
    const context=vm.createContext({
      ...order,...catalog,...customer,...delivery,translate,createOrderSnapshot,document,URL,Intl,console,
      setTimeout:()=>0,clearTimeout(){},
      window:{addEventListener(){},STORE_CONFIG:{defaultLanguage:'en',minimumAge:21,currency:'IDR',locale:'en-US',maxQuantity:999,whatsappEnabled:false}},
      localStorage:{getItem:()=>null},sessionStorage:{getItem:key=>key==='catalog-age'?'21':storage.get(key),setItem:(key,value)=>storage.set(key,value)},
      fetch:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../'+new URL(url).pathname.slice(1),import.meta.url),'utf8'))})
    });
    let source=await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
    source=source.replace(/^import .*;\r?\n/gm,'').replace("new URL('../../', import.meta.url)","new URL('http://localhost/')");
    vm.runInContext(source,context);
    for (let i=0;i<100 && vm.runInContext('catalogState',context)==='loading';i++) await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(vm.runInContext('catalogState',context),'ready');
    assert.equal(element('#checkout-next').disabled,true);
    assert.equal(element('#customer-form').hidden,true);
    assert.equal(element('#export-order').hidden,true);
    // Selecting a quantity is a draft until Add to cart is pressed.
    vm.runInContext("updateDraft(products[0].id+':unit',2)",context);
    assert.equal(vm.runInContext('lines().length',context),0);
    const key=vm.runInContext("products[0].id+':unit'",context);
    element('#products').handlers.click({target:{closest:selector=>selector==='[data-add-cart]'?{dataset:{addCart:key}}:null}});
    assert.equal(vm.runInContext('lines()[0].quantity',context),2);
    const storageKey=`catalog-cart-v1-${page.startsWith('harga')?'priced':'unpriced'}`;
    assert.equal(JSON.parse(storage.get(storageKey)).quantities[key],2);
    assert.ok(element('#header-cart').href.endsWith(page));
    assert.ok(element('#continue-shopping').href.endsWith(page.startsWith('harga')?'harga/':'localhost/'));
    vm.runInContext('quantities = {}; restoreCart(); renderOrder()',context);
    assert.equal(vm.runInContext('lines()[0].quantity',context),2);
    element('#checkout-next').handlers.click();
    assert.equal(element('#customer-form').hidden,false);
    element('#customer-form').handlers.submit({preventDefault(){}});
    assert.equal(element('#payment-panel').hidden,true);
    for (const [field,value] of Object.entries({name:'Test Customer',phone:'+62 812345678',country:'Indonesia',city:'Jakarta',region:'DKI Jakarta',address:'Test Street 1',postal:'10110'})) element('#customer-'+field).value=value;
    element('#customer-form').handlers.input();
    assert.equal(JSON.parse(storage.get(storageKey)).customer.address,'Test Street 1');
    element('#customer-address').value='';
    vm.runInContext('restoreCart()',context);
    assert.equal(element('#customer-address').value,'Test Street 1');
    element('#customer-form').handlers.submit({preventDefault(){}});
    assert.equal(element('#payment-panel').hidden,false);
    assert.equal(element('#export-order').hidden,false);
    assert.ok(element('#payment-reference').textContent.startsWith('ORD-'));
    assert.match(element('#payment-qr').src,/images\/pdf-closing\.png\.jpeg$/);
    assert.equal(vm.runInContext('paymentSnapshot.rows[0].quantity',context),2);
    element('#checkout-back').handlers.click();
    assert.equal(element('#customer-name').value,'Test Customer');
    element('#customer-form').handlers.submit({preventDefault(){}});
    vm.runInContext('updateQuantity(lines()[0].product.id+\":unit\",0)',context);
    assert.equal(element('#payment-panel').hidden,true);
    assert.equal(element('#export-order').hidden,true);
    assert.equal(vm.runInContext('paymentSnapshot',context),null);
    assert.equal(element('#checkout-next').disabled,true);
    assert.equal(JSON.parse(storage.get(storageKey)).quantities[key],0);
  }
});
