import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDelivery,deliverySettings} from '../assets/js/delivery.js';
import {createOrderSnapshot} from '../assets/js/order-document.js';
import {formatOrder} from '../assets/js/order.js';
import {renderOrderPages} from '../assets/js/order-export.js';

const stick = {id:'terea',category:'sticks',brand:'TEREA',name:'Auburn',country:'ID'};
const device = {id:'device',category:'device',name:'Device',model:'IQOS'};
const line = (product,unit,quantity,price=100000) => ({product,unit,quantity,price});
const deliveryFor = (_,lines) => calculateDelivery(lines);
const money = n => `Rp${n.toLocaleString('en-US')}`;

test('TEREA rates follow the supplied examples and repeat by four cartons', () => {
  const expected = [0,400000,400000,450000,450000,850000,850000,900000,900000,1300000,1300000,1350000,1350000];
  expected.forEach((idr,quantity) => assert.deepEqual(calculateDelivery([line(stick,'carton',quantity)]),{idr}));
});

test('packs and cartons across products are combined before applying tiers', () => {
  for (const [packs,idr] of [[1,400000],[20,400000],[21,450000],[40,450000],[41,850000]]) {
    assert.equal(calculateDelivery([line(stick,'pack',packs)]).idr,idr);
  }
  const lines = [line(stick,'carton',1),line({...stick,id:'other'},'pack',10)];
  assert.equal(calculateDelivery(lines).idr,400000);
  assert.deepEqual(calculateDelivery([]),{idr:0});
});

test('devices have no delivery charge, including with old saved settings', () => {
  assert.deepEqual(calculateDelivery([line(device,'unit',2)]),{idr:0});
  const lines=[line(device,'unit',2),line(stick,'carton',7)];
  assert.deepEqual(calculateDelivery(lines,{deviceDeliveryFee:120}),{idr:900000});
  assert.deepEqual(calculateDelivery(lines,{tereaGroupDeliveryFee:500000}),{idr:1000000});
  assert.equal(deliverySettings({deviceDeliveryFee:120}).deviceDeliveryFee,undefined);
});

test('text and PDF snapshots preserve original prices without device delivery charges', () => {
  const lines=[line(device,'unit',2),line(stick,'carton',7)];
  const snapshot=createOrderSnapshot(lines,{priced:true,deliveryFor});
  assert.equal(snapshot.deliveryFee,900000);
  assert.equal(snapshot.deviceDeliveryFee,undefined);
  assert.equal(snapshot.total,1800000);
  assert.equal(snapshot.rows[0].unitPrice,100000);
  const text=formatOrder(lines,{priced:true,money,deliveryFor});
  assert.match(text,/Delivery fee: Rp900,000/);
  assert.match(text,/Total: Rp1,800,000/);
  const hidden=createOrderSnapshot(lines,{priced:false,deliveryFor});
  assert.equal(hidden.deviceDeliveryFee,undefined);
  assert.doesNotMatch(formatOrder(lines,{priced:false,money,deliveryFor}),/\u00a5|900,000/);
  const unknown=createOrderSnapshot([line(device,'unit',1,null)],{priced:true,deliveryFor});
  assert.equal(unknown.total,null);
  assert.equal(unknown.deviceDeliveryFee,undefined);
});

test('PDF renders TEREA delivery without the payment image', () => {
  const lines=[line(device,'unit',2),line(stick,'carton',7)];
  const snapshot=createOrderSnapshot(lines,{priced:true,deliveryFor});
  const texts=[],images=[];
  const createCanvas=(width,height)=>{
    const context={measureText:s=>({width:String(s).length*10}),fillText:s=>texts.push(s),fillRect(){},drawImage:image=>images.push(image)};
    return {width,height,getContext:()=>context};
  };
  const closingImage={width:1135,height:1600};
  const {pages,layout}=renderOrderPages(snapshot,createCanvas,{closingImage});
  assert.ok(texts.some(s => /^Rp\s*900,000$/.test(s)));
  assert.ok(texts.some(s => /^Rp\s*1,800,000$/.test(s)));
  assert.doesNotMatch(texts.join(' '),/\u00a5/);
  assert.equal(pages.length,1);
  assert.equal(layout.some(page => page.closingImage),false);
  assert.deepEqual(images,[]);
});
