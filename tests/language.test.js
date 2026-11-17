import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {messages, translate} from '../assets/js/i18n.js';
import {formatOrder, orderLines} from '../assets/js/order.js';

test('all three languages cover every interface key and static page label', async () => {
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.zh).sort());
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.id).sort());
  for (const language of ['en','zh','id']) {
    for (const [key,value] of Object.entries(messages[language])) {
      assert.ok(value.trim(),`${language}:${key} is empty`);
      const result=translate(language,key,{age:21,count:3,name:'Test',unit:'Pack'});
      assert.doesNotMatch(result,/\{\w+\}/);
    }
  }
  for (const file of ['index.html','harga/index.html']) {
    const html=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.match(html,/<html lang="en">/);
    for (const match of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) {
      assert.ok(messages.en[match[1]],`Missing English ${match[1]}`);
      assert.ok(messages.zh[match[1]],`Missing Chinese ${match[1]}`);
      assert.ok(messages.id[match[1]],`Missing Indonesian ${match[1]}`);
    }
    assert.equal((html.match(/<select\b[^>]*data-language-select/g)||[]).length,2);
    for (const language of ['en','zh','id']) {
      assert.equal((html.match(new RegExp(`<option value="${language}"`,'g'))||[]).length,2);
    }
  }
  for (const file of ['assets/js/app.js','assets/js/order.js']) {
    const code=await readFile(new URL('../'+file,import.meta.url),'utf8');
    for (const match of code.matchAll(/\bt\('([^']+)'/g)) {
      assert.ok(messages.en[match[1]],`Missing runtime translation ${match[1]}`);
    }
  }
});

test('all current products have Chinese and Indonesian descriptions and specifications', async () => {
  const products=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url))).products;
  assert.equal(products.length,34);
  for (const product of products) {
    assert.match(product.descriptionZh,/[\u3400-\u9fff]/);
    assert.ok(product.descriptionEn);
    assert.ok(product.descriptionId);
    for (const spec of product.specifications) {
      assert.match(spec.labelZh,/[\u3400-\u9fff]/);
      assert.ok(spec.valueZh);
      assert.ok(spec.labelId);
      assert.ok(spec.valueId);
    }
    if (product.category==='sticks') {
      assert.match(product.flavorZh,/[\u3400-\u9fff]/);
      assert.ok(product.flavorId);
      assert.doesNotMatch(product.descriptionEn,/Cengkeh|Appricot|Mentol\b|Exoctic/);
    }
  }
});

test('English and Chinese order messages preserve quantities and totals', () => {
  const product={id:'sample',brand:'TEREA',category:'sticks',name:'Auburn Edition',nameZh:'赤棕',units:['pack','carton']};
  const lines=orderLines([product],{'sample:pack':2,'sample:carton':1},{sample:{pack:30000,carton:300000}});
  const options={name:'Alex',note:'Call first',priced:true,money:String,date:new Date('2026-11-16T12:00:00Z')};
  const english=formatOrder(lines,{...options,language:'en'});
  assert.match(english,/NEW ORDER/);
  assert.match(english,/Pack x 2/);
  assert.match(english,/Carton x 1/);
  assert.match(english,/Total: 360000/);
  const chinese=formatOrder(lines,{...options,language:'zh'});
  assert.match(chinese,/新订单/);
  assert.match(chinese,/包 x 2/);
  assert.match(chinese,/条 x 1/);
  assert.match(chinese,/总额: 360000/);
  for (const text of [english,chinese]) assert.doesNotMatch(text,/PESANAN BARU|Tanggal:|Catatan:|Mohon konfirmasi/);
  const unpriced=formatOrder(lines,{...options,language:'zh',priced:false,money:()=>{throw Error('Unexpected price')}});
  assert.doesNotMatch(unpriced,/360000|总额/);
});

test('Indonesian orders use translated headings, notes and unit labels', () => {
  const product={id:'sample',brand:'TEREA',category:'sticks',name:'Auburn Edition',nameZh:'赤棕',units:['pack','carton']};
  const lines=orderLines([product],{'sample:pack':2,'sample:carton':1},{sample:{pack:30000,carton:300000}});
  const text=formatOrder(lines,{language:'id',name:'Budi',note:'Kirim sore',priced:true,money:String});
  assert.match(text,/PESANAN BARU/);
  assert.match(text,/Nama: Budi/);
  assert.match(text,/Tanggal:/);
  assert.match(text,/Pack x 2/);
  assert.match(text,/Carton x 1/);
  assert.match(text,/Total: 360000/);
  assert.match(text,/Catatan pesanan: Kirim sore/);
  assert.doesNotMatch(text,/NEW ORDER|新订单/);
});
