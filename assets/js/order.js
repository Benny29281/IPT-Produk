import {normalizeDelivery} from './delivery.js';
import { translate } from './i18n.js';
import {countryName} from './countries.js';
import {addressLines} from './customer.js';

export function normalizeQuantity(value, max = 999) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, Math.floor(number))) : 0;
}
export function displayName(product) {
  if (product.category === 'sticks') return product.brand ? `${product.brand} ${product.name}` : product.name;
  return product.model ? product.name : `${product.name} · ${product.variant}`;
}
export function changeProductUnit(product, unit, quantities) {
  if (!product.units.includes(unit)) throw new RangeError('Invalid product unit');
  return {...quantities};
}
export function orderLines(products, quantities, prices = {}) {
  return products.flatMap(product => product.units.flatMap(unit => {
    const quantity = quantities[`${product.id}:${unit}`] || 0;
    const rawPrice = prices[product.id]?.[unit];
    const price = typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
    return quantity > 0 ? [{ product, unit, quantity, price }] : [];
  }));
}
export function formatOrder(lines, { name = '', note = '', priced = false, money, date = new Date(), language = 'en', customer, orderingFrom, deliveryFor }) {
  const t = key => translate(language, key);
  const text = [t('newOrder'), `${t('date')}: ${date.toLocaleDateString({zh:'zh-CN',id:'id-ID',en:'en-GB'}[language] || 'en-GB')}`];
  if (name.trim()) text.push(`${t('customerName')}: ${name.trim()}`);
  if (orderingFrom?.country && orderingFrom?.city) text.push(`${t('orderingFrom')}: ${orderingFrom.city}, ${orderingFrom.country}`);
  if (customer) {
    if (customer.phone) text.push(`${t('contactPhone')}: ${customer.phone}`);
    if (addressLines(customer).length) text.push(`${t('shippingAddress')}:`,...addressLines(customer));
  }
  text.push('');
  lines.forEach((line, index) => {
    text.push(`${index + 1}. ${displayName(line.product)}${line.product.country ? ` [${countryName(line.product.country,language)}]` : ''}${line.product.nameZh ? `\n   ${line.product.nameZh}` : ''} — ${t(line.unit)} x ${line.quantity}${priced ? ` — ${line.price === null ? t('unknownPrice') : money(line.price * line.quantity)}` : ''}`);
  });
  if (priced) text.push('', lines.some(line => line.price === null) ? `${t('total')}: ${t('unknownTotal')}` : (() => { const sub = lines.reduce((sum, line) => sum + line.price * line.quantity, 0), fee = normalizeDelivery(deliveryFor?.(sub,lines)); return `${fee.idr ? `${t('deliveryFee')}: ${money(fee.idr)}\n` : ''}${t('total')}: ${money(sub + fee.idr)}`; })());
  if (note.trim()) text.push('', `${t('note')}: ${note.trim()}`);
  text.push('', t('orderClosing'));
  return text.join('\n');
}
