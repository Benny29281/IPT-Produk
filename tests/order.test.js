import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeQuantity, orderLines, formatOrder, changeProductUnit} from '../assets/js/order.js';
const catalogProducts = JSON.parse(await readFile(new URL('../data/products.json',import.meta.url))).products;
// Calculation fixtures are independent of the store's current assortment.
const products = [{id:'original',name:'Test sticks',variant:'Regular',category:'sticks',units:['pack','carton']}];
const prices = {original:{pack:35000,carton:340000}};
test('quantity clamps invalid, fractional and excessive values', () => {
  for (const [input,expected] of [['',0],[-1,0],[2.8,2],['abc',0],[Infinity,0],[1000,999]]) assert.equal(normalizeQuantity(input),expected);
});
test('pack and carton are independent with separately defined prices', () => {
  const lines = orderLines(products,{'original:pack':3,'original:carton':1},prices);
  assert.equal(lines.length,2);
  assert.equal(lines.reduce((sum,line)=>sum+line.price*line.quantity,0),445000);
});

test('switching the visible unit preserves both pack and carton quantities', () => {
  const product={id:'sticks',name:'Sample',category:'sticks',units:['pack','carton']};
  const device={id:'device',name:'Device',model:'Device',units:['unit']};
  const original={'sticks:pack':5,'sticks:carton':2,'device:unit':2};
  const changed=changeProductUnit(product,'carton',original);
  assert.deepEqual(changed,original);
  assert.notEqual(changed,original);
  assert.equal(original['sticks:pack'],5);
  const lines=orderLines([product,device],changed,{sticks:{pack:30000,carton:300000},device:{unit:899000}});
  assert.equal(lines.filter(line=>line.product.id==='sticks').length,2);
  assert.equal(lines.find(line=>line.product.id==='sticks'&&line.unit==='pack').quantity,5);
  assert.equal(lines.find(line=>line.product.id==='sticks'&&line.unit==='carton').quantity,2);
  assert.equal(lines.filter(line=>line.product.id==='sticks').reduce((sum,line)=>sum+line.price*line.quantity,0),750000);
  assert.equal(lines.find(line=>line.product.id==='device').quantity,2);
  assert.throws(()=>changeProductUnit(product,'unit',original),RangeError);
});
test('unpriced order excludes price and total', () => {
  const lines = orderLines(products,{'original:pack':3},prices);
  const text = formatOrder(lines,{priced:false,money:()=>{throw Error('Unexpected price')}});
  assert.match(text,/Pack x 3/);
  assert.doesNotMatch(text,/Total|35000|105000/);
});
test('missing or placeholder price never becomes free', () => {
  for (const price of [0,-1,undefined,'35000']) {
    const lines = orderLines(products,{'original:pack':1},{original:{pack:price}});
    assert.equal(lines[0].price,null);
    assert.match(formatOrder(lines,{priced:true,money:String}),/price confirmation required/);
  }
});
test('every device color has its own unique SKU and only unit ordering', () => {
  assert.equal(new Set(catalogProducts.map(p=>p.id)).size,catalogProducts.length);
  const devices = catalogProducts.filter(p=>p.category==='device');
  assert.ok(devices.length>=4);
  for (const device of devices) assert.deepEqual(device.units,['unit']);
});

test('imported gallery files are local optimized WebP images', async () => {
  const sources = JSON.parse(await readFile(new URL('../data/product-sources.json',import.meta.url)));
  assert.equal(catalogProducts.length, sources.products.length);
  const seen = new Set();
  for (const product of catalogProducts) {
    assert.ok(product.images.length > 0);
    assert.equal(product.image, product.images[0]);
    for (const src of product.images) {
      assert.match(src, /^images\/products\/[a-z0-9-]+\.webp$/);
      assert.ok(!seen.has(src), `Duplicate photo: ${src}`);
      seen.add(src);
      const buffer = await readFile(new URL('../'+src,import.meta.url));
      assert.equal(buffer.toString('ascii',0,4),'RIFF');
      assert.equal(buffer.toString('ascii',8,12),'WEBP');
      assert.ok(buffer.length < 150000, `${src} exceeds 150 KB`);
    }
  }
  assert.equal(seen.size, sources.products.reduce((n,p)=>n+p.photos.length,0));
});

test('catalog matches the supplied bilingual product list and unit prices', async () => {
  const catalogPrices = Object.fromEntries(JSON.parse(await readFile(new URL('../data/prices.json',import.meta.url))).prices.map(({id,...p})=>[id,p]));
  const expected = [
    ['Iqos Iluma i Breeze Blue','Iqos Iluma i 微风蓝',899000],
    ['Iqos Iluma i Digital Violet','Iqos Iluma i 数码紫',899000],
    ['Iqos Iluma i Midnight Purple','Iqos Iluma i 午夜紫',899000],
    ['Iqos Iluma i Leaf Green','Iqos Iluma i 叶绿',899000],
    ['Iqos Iluma i Midnight Black','Iqos Iluma i 午夜黑',899000],
    ['Iqos Iluma i One Breeze Blue','Iqos Iluma i One 微风蓝',349000],
    ['Iqos Iluma i One Midnight Purple','Iqos Iluma i One 午夜紫',349000],
    ['Iqos Iluma i One Leaf Green','Iqos Iluma i One 叶绿',349000],
    ['Iqos Iluma i One Midnight Black','Iqos Iluma i One 午夜黑',349000],
    ['Iqos Iluma i Prime Breeze Blue','Iqos Iluma i Prime 微风蓝',1599000],
    ['Iqos Iluma i Prime Midnight Purple','Iqos Iluma i Prime 午夜紫',1599000],
    ['Iqos Iluma i Prime Garnet Red','Iqos Iluma i Prime 石榴红',1599000],
    ['Iqos Iluma i Prime Midnight Black','Iqos Iluma i Prime 午夜黑',1599000]
  ];
  assert.deepEqual(catalogProducts.filter(p=>p.category==='device').map(p=>[p.name,p.nameZh,catalogPrices[p.id].unit]),expected);
  assert.deepEqual(Object.keys(catalogPrices).sort(),catalogProducts.map(p=>p.id).sort());
  const chosen = [catalogProducts[0],catalogProducts[5],catalogProducts[9]];
  const lines = orderLines(catalogProducts,Object.fromEntries(chosen.map(p=>[p.id+':unit',1])),catalogPrices);
  assert.equal(lines.reduce((sum,line)=>sum+line.price*line.quantity,0),2847000);
  const text = formatOrder(lines,{priced:true,money:String});
  assert.match(text,/Iqos Iluma i 微风蓝/);
  assert.match(text,/Total: 2847000/);
  assert.doesNotMatch(text,/Breeze Blue · Breeze Blue/);
});

test('all 21 TEREA products match customer names, flavours and independent unit prices', async () => {
  const customerList = JSON.parse(await readFile(new URL('../data/terea-customer-list.json',import.meta.url)));
  const catalogPrices = Object.fromEntries(JSON.parse(await readFile(new URL('../data/prices.json',import.meta.url))).prices.map(({id,...p})=>[id,p]));
  const sticks = catalogProducts.filter(p=>p.category==='sticks');
  assert.equal(sticks.length,21);
  assert.deepEqual(sticks.map(p=>p.id),customerList.map(p=>p.id));
  for (const expected of customerList) {
    const product = sticks.find(p=>p.id===expected.id);
    assert.deepEqual([product.name,product.nameZh,product.flavor],[expected.name,expected.nameZh,expected.flavor]);
    assert.deepEqual(product.units,['pack','carton']);
    assert.deepEqual(catalogPrices[product.id],{pack:expected.pack,carton:expected.carton});
    assert.ok(product.description.includes(expected.flavor));
    assert.ok(product.specifications.some(spec=>spec.label==='Flavour'&&spec.value===expected.flavor));
  }
});

test('mixed device, pack and carton orders use their exact customer prices', async () => {
  const catalogPrices = Object.fromEntries(JSON.parse(await readFile(new URL('../data/prices.json',import.meta.url))).prices.map(({id,...p})=>[id,p]));
  const selected = {'terea-auburn-edition-indonesia:pack':3,'terea-riviera-pearl-indonesia:carton':1,'iqos-iluma-i-breeze-blue:unit':1};
  const lines=orderLines(catalogProducts,selected,catalogPrices);
  assert.equal(lines.length,3);
  assert.equal(lines.reduce((sum,line)=>sum+line.price*line.quantity,0),1349000);
  const text=formatOrder(lines,{priced:true,money:String});
  assert.match(text,/TEREA Auburn Edition/);
  assert.match(text,/Pack x 3/);
  assert.match(text,/Carton x 1/);
  assert.match(text,/Total: 1349000/);
  const unpriced=formatOrder(lines,{priced:false,money:()=>{throw Error('Unexpected price')}});
  assert.doesNotMatch(unpriced,/Total:|30000|360000|899000/);
});
