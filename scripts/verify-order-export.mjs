// Optional local visual QA. Runtime website does not depend on these QA packages.
// Usage: node scripts/verify-order-export.mjs <temporary QA package directory>
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {orderLines} from '../assets/js/order.js';
import {createOrderSnapshot} from '../assets/js/order-document.js';
import {renderOrderPages,buildImagePdf,jpegData} from '../assets/js/order-export.js';

const qaRoot = process.argv[2];
if (!qaRoot) throw new Error('Pass the temporary QA package directory');
const require = createRequire(path.join(qaRoot,'package.json'));
const canvasModule = require('@napi-rs/canvas');
const {createCanvas,GlobalFonts} = canvasModule;
for (const name of ['DOMMatrix','Path2D','ImageData']) globalThis[name] = canvasModule[name];
if (fs.existsSync('C:/Windows/Fonts/msyh.ttc')) GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Microsoft YaHei');
if (fs.existsSync('C:/Windows/Fonts/msyhbd.ttc')) GlobalFonts.registerFromPath('C:/Windows/Fonts/msyhbd.ttc','Microsoft YaHei');
const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
class CanvasFactory {
  create(width,height) { const canvas = createCanvas(width,height); return {canvas,context:canvas.getContext('2d')}; }
  reset(target,width,height) { target.canvas.width = width; target.canvas.height = height; }
  destroy(target) { target.canvas.width = 0; target.canvas.height = 0; target.canvas = null; target.context = null; }
}
const products = JSON.parse(fs.readFileSync(new URL('../data/products.json',import.meta.url),'utf8'));
const prices = JSON.parse(fs.readFileSync(new URL('../data/prices.json',import.meta.url),'utf8'));
// Synthetic country editions are QA fixtures only, never added to the catalog.
const variants = ['ID','KR','JP'].map(country => ({...products[13],id:`qa-auburn-${country.toLowerCase()}`,country}));
for (const product of variants) prices[product.id] = {...prices[products[13].id]};
const output = path.resolve('tmp/pdfs'); fs.mkdirSync(output,{recursive:true});
const cases = [
  {name:'english-priced',language:'en',priced:true,products:[products[0],...variants],quantity:2,note:'Please confirm each country edition before arranging delivery.'},
  {name:'chinese-no-prices',language:'zh',priced:false,products,quantity:3,note:'请先确认每个商品的国家版本、单位及数量，再安排发货。'},
  {name:'indonesian-multipage',language:'id',priced:true,products,quantity:999,note:('Konfirmasikan stok, versi negara, dan jumlah setiap produk terlebih dahulu. ').repeat(8).slice(0,500)}
];
const report = [];
for (const example of cases) {
  const quantities = Object.fromEntries(example.products.map(product => [`${product.id}:${product.units[0]}`,example.quantity]));
  if (example.name === 'english-priced') {
    quantities[`${variants[0].id}:pack`] = 5;
    quantities[`${variants[0].id}:carton`] = 2;
  }
  const selected = orderLines(example.products,quantities,prices);
  const customer = example.language === 'zh'
    ? {name:'示例客户',phone:'+00 123 456',address:'示例路123号，A栋1201室',city:'示例市',region:'示例区',postalCode:'123456',country:'新加坡'}
    : {name:'Sample customer / 示例客户',phone:'+00 123 456',address:'123 Example Street, Building A, Unit 1201\nExample District',city:'Example City',region:'Example Region',postalCode:'123456',country:'Singapore'};
  const orderingFrom = {city:example.language === 'zh' ? '深圳' : 'Shenzhen',country:example.language === 'zh' ? '中国' : 'China'};
  const snapshot = createOrderSnapshot(selected,{customer,orderingFrom,requireCustomerDetails:true,note:example.note,priced:example.priced,language:example.language,id:`QA-${example.name.toUpperCase()}`,date:new Date('2026-11-16T08:30:00Z')});
  const {pages,layout} = renderOrderPages(snapshot,createCanvas);
  assert.equal(layout.flatMap(page => page.rows).length,snapshot.rows.length);
  for (const page of layout) for (const row of page.rows) {
    assert.ok(row.y >= 250); assert.ok(row.y + row.height <= 1654);
  }
  if (example.products.length === 34) assert.ok(pages.length > 1);
  const bytes = buildImagePdf(pages.map(page => ({width:page.width,height:page.height,data:jpegData(page)})));
  const pdfPath = path.join(output,example.name+'.pdf'); fs.writeFileSync(pdfPath,bytes);
  const document = await pdfjs.getDocument({data:bytes.slice(),CanvasFactory,disableFontFace:true,useSystemFonts:false,isEvalSupported:false}).promise;
  assert.equal(document.numPages,pages.length);
  for (let index = 0; index < document.numPages; index++) {
    const page = await document.getPage(index + 1);
    const viewport = page.getViewport({scale:1.25});
    const rendered = createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await page.render({canvasContext:rendered.getContext('2d'),viewport}).promise;
    fs.writeFileSync(path.join(output,`${example.name}-rendered-${index + 1}.png`),rendered.toBuffer('image/png'));
  }
  await document.destroy();
  report.push({name:example.name,pages:pages.length,rows:snapshot.rows.length,pdfBytes:bytes.length});
}
fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
