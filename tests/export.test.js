import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createOrderSnapshot} from '../assets/js/order-document.js';
import {filterCatalog,countryName} from '../assets/js/catalog.js';
import {orderLines,formatOrder} from '../assets/js/order.js';
import {normalizeCustomerDetails,completeCustomerDetails,completeOrderingLocation} from '../assets/js/customer.js';

const base={id:'auburn-id',familyId:'auburn',category:'sticks',brand:'TEREA',name:'Auburn Edition',nameZh:'赤棕',country:'ID',units:['pack','carton']};
const products=[base,{...base,id:'auburn-kr',country:'KR'},{...base,id:'auburn-jp',country:'JP'},{id:'device',category:'device',model:'IQOS',name:'IQOS',units:['unit']}];

test('country editions can be selected separately and searched in all languages', () => {
  assert.equal(filterCatalog(products).length,4);
  for(const [country,id] of [['ID','auburn-id'],['KR','auburn-kr'],['JP','auburn-jp']]) {
    assert.deepEqual(filterCatalog(products,{category:'sticks',country}).map(p=>p.id),[id]);
  }
  assert.equal(filterCatalog(products,{query:'日本'})[0].id,'auburn-jp');
  assert.equal(filterCatalog(products,{query:'Korea'})[0].id,'auburn-kr');
  assert.equal(filterCatalog(products,{query:'Jepang'})[0].id,'auburn-jp');
  assert.equal(countryName('KR','zh'),'韩国');
  assert.equal(filterCatalog(products,{category:'device',country:'JP'}).length,0);
});

test('different editions have separate cart quantities and export identities', () => {
  const lines=orderLines(products,{'auburn-id:pack':2,'auburn-kr:carton':1,'auburn-jp:pack':2},{'auburn-id':{pack:30000},'auburn-kr':{carton:400000},'auburn-jp':{pack:35000}});
  const snapshot=createOrderSnapshot(lines,{priced:true,id:'TEST',language:'en'});
  assert.deepEqual(snapshot.rows.map(row=>[row.id,row.country,row.unit,row.quantity]),[['auburn-id','ID','pack',2],['auburn-kr','KR','carton',1],['auburn-jp','JP','pack',2]]);
  assert.equal(snapshot.total,530000);
  assert.match(formatOrder(lines,{priced:false,money:String}),/\[Indonesia\]/);
  assert.match(formatOrder(lines,{priced:false,money:String}),/\[South Korea\]/);
  assert.match(formatOrder(lines,{priced:false,money:String}),/\[Japan\]/);
});

test('confirmed order snapshots remain unchanged when the cart is edited', () => {
  const product={...base};
  const lines=[{product,unit:'pack',quantity:2,price:30000}];
  const snapshot=createOrderSnapshot(lines,{priced:true,name:'Alex',note:'Call first',id:'TEST',date:new Date('2026-11-16T12:00:00Z')});
  lines[0].quantity=99; product.name='Changed';
  assert.equal(snapshot.rows[0].name,'TEREA Auburn Edition');
  assert.equal(snapshot.rows[0].quantity,2);
  assert.equal(snapshot.total,60000);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.rows[0]));
  assert.equal(snapshot.name,'Alex');
});

test('unpriced exports omit monetary data and all company contact details', () => {
  const snapshot=createOrderSnapshot([{product:base,unit:'carton',quantity:1,price:300000}],{priced:false,id:'TEST'});
  assert.equal('currency' in snapshot,false);
  assert.equal('total' in snapshot,false);
  assert.equal('unitPrice' in snapshot.rows[0],false);
  assert.equal('lineTotal' in snapshot.rows[0],false);
  assert.doesNotMatch(JSON.stringify(snapshot),/300000|FORM|8618804519859|whatsapp|company/i);
});

test('empty or invalid orders cannot be exported and unknown prices remain unknown', () => {
  assert.throws(()=>createOrderSnapshot([]));
  assert.throws(()=>createOrderSnapshot([{product:base,unit:'pack',quantity:0,price:30000}]));
  assert.throws(()=>createOrderSnapshot([{product:base,unit:'pack',quantity:1.5,price:30000}]));
  assert.throws(()=>createOrderSnapshot([{product:{...base,country:''},unit:'pack',quantity:1,price:30000}]),/country edition/);
  const snapshot=createOrderSnapshot([{product:base,unit:'pack',quantity:1,price:null}],{priced:true});
  assert.equal(snapshot.rows[0].lineTotal,null);
  assert.equal(snapshot.total,null);
});

test('live catalog uses known country editions without inventing Korea or Japan stock', async () => {
  const catalog=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url))).products;
  const sticks=catalog.filter(product=>product.category==='sticks');
  assert.ok(sticks.every(product=>product.country==='ID'&&product.familyId));
  assert.equal(filterCatalog(catalog,{country:'ID'}).length,21);
  assert.equal(filterCatalog(catalog,{country:'KR'}).length,0);
  assert.equal(filterCatalog(catalog,{country:'JP'}).length,0);
  assert.ok(catalog.filter(product=>product.category==='device').every(product=>!product.country));
});

test('PDF snapshots keep customer address, ordering location and product country separate', () => {
  const customer={name:'Sample customer',phone:'+00 123456',address:'123 Example Street\nUnit 12',city:'Example City',region:'Example Region',postalCode:'12345',country:'Singapore'};
  const orderingFrom={country:'China',city:'Shenzhen'};
  const lines=orderLines([base],{'auburn-id:pack':5,'auburn-id:carton':2},{'auburn-id':{pack:30000,carton:300000}});
  const snapshot=createOrderSnapshot(lines,{customer,orderingFrom,requireCustomerDetails:true,priced:true});
  assert.equal(snapshot.name,'Sample customer');
  assert.deepEqual(snapshot.customer,customer);
  assert.deepEqual(snapshot.orderingFrom,orderingFrom);
  assert.deepEqual(snapshot.rows.map(row=>[row.unit,row.quantity,row.country]),[['pack',5,'ID'],['carton',2,'ID']]);
  assert.equal(snapshot.total,750000);
  customer.address='Changed'; orderingFrom.city='Changed';
  assert.equal(snapshot.customer.address,'123 Example Street\nUnit 12');
  assert.equal(snapshot.orderingFrom.city,'Shenzhen');
  assert.ok(Object.isFrozen(snapshot.customer));
  const text=formatOrder(lines,{name:snapshot.name,customer:snapshot.customer,orderingFrom:snapshot.orderingFrom,language:'en',money:String});
  assert.match(text,/Ordering from: Shenzhen, China/);
  assert.match(text,/Delivery address:/);
  assert.match(text,/123 Example Street/);
  assert.match(text,/Singapore/);
});

test('export customer validation requires name and address while phone and postal code are optional', () => {
  const customer=normalizeCustomerDetails({name:' Alice ',address:' Street 1 ',city:' City ',country:' Country '});
  assert.ok(completeCustomerDetails(customer));
  for(const key of ['name','address','city','country'])assert.equal(completeCustomerDetails({...customer,[key]:'  '}),false);
  assert.equal(completeCustomerDetails({...customer,address:'x'.repeat(601)}),false);
  assert.equal(completeOrderingLocation(null),false);
  assert.equal(completeOrderingLocation({country:'China',city:'Shenzhen'}),true);
  const lines=orderLines([base],{'auburn-id:pack':1},{'auburn-id':{pack:30000}});
  const snapshot=createOrderSnapshot(lines,{requireCustomerDetails:true,customer});
  assert.deepEqual(snapshot.customer,customer);
  assert.equal(snapshot.orderingFrom,undefined);
  assert.throws(()=>createOrderSnapshot(lines,{requireCustomerDetails:true,customer:{...customer,address:''},orderingFrom:{country:'China',city:'Shenzhen'}}));
});
