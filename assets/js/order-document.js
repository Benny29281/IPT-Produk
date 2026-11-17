import {normalizeDelivery} from './delivery.js';
import {displayName} from './order.js';
import {normalizeCustomerDetails,normalizeOrderingLocation,completeCustomerDetails} from './customer.js';

const pdfSequences = new Map();

export function nextPdfFilename(date = new Date(), priced = false, storage) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Invalid PDF date');
  const day = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const key = `tobapia-pdf-sequence-${day}`;
  let previous = pdfSequences.get(day) || 0;
  try {
    storage ??= globalThis.localStorage;
    const saved = Number(storage?.getItem(key));
    if (Number.isSafeInteger(saved) && saved >= 0) previous = Math.max(previous,saved);
  } catch {}
  const next = previous + 1;
  if (next > 99999) throw new Error('Daily PDF sequence limit reached');
  pdfSequences.set(day,next);
  try { storage?.setItem(key,String(next)); } catch {}
  return `${day}_${String(next).padStart(5,'0')}_${priced ? '05' : '03'}.pdf`;
}

export function createOrderSnapshot(lines, {
  name = '', note = '', priced = false, language = 'en', currency = 'IDR',
  date = new Date(), id, customer, orderingFrom, requireCustomerDetails = false, deliveryFor
} = {}) {
  if (!lines.length) throw new Error('An order must contain at least one item');
  const details = normalizeCustomerDetails(customer,name);
  const location = normalizeOrderingLocation(orderingFrom);
  if (requireCustomerDetails && !completeCustomerDetails(details)) throw new Error('Complete customer details are required');
  const rows = lines.map(line => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error('Invalid quantity');
    if (line.product.category === 'sticks' && !/^[A-Z]{2}$/.test(line.product.country || '')) throw new Error('A country edition is required for tobacco products');
    const row = {
      id:line.product.id, name:displayName(line.product), nameZh:line.product.nameZh || '',
      country:line.product.country || '', unit:line.unit, quantity:line.quantity
    };
    if (priced) {
      row.unitPrice = typeof line.price === 'number' && Number.isFinite(line.price) && line.price > 0 ? line.price : null;
      row.lineTotal = row.unitPrice === null ? null : row.unitPrice * row.quantity;
    }
    return Object.freeze(row);
  });
  const random = globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,8) || Math.random().toString(36).slice(2,10);
  const snapshot = {
    id:id || `ORD-${date.toISOString().slice(0,10).replaceAll('-','')}-${random.toUpperCase()}`,
    createdAt:date.toISOString(), name:details.name, note:String(note).trim(),
    language:['en','zh','id'].includes(language) ? language : 'en', priced:Boolean(priced),
    rows:Object.freeze(rows)
  };
  if (customer) snapshot.customer = Object.freeze(details);
  if (orderingFrom) snapshot.orderingFrom = Object.freeze(location);
  if (priced) {
    snapshot.currency = currency;
    const sub = rows.some(row => row.lineTotal === null) ? null : rows.reduce((sum,row) => sum + row.lineTotal,0);
    const fee = normalizeDelivery(deliveryFor?.(sub,lines));
    snapshot.deliveryFee = fee.idr;
    snapshot.total = sub === null ? null : sub + snapshot.deliveryFee;
  }
  return Object.freeze(snapshot);
}
