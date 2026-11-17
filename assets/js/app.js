import {calculateDelivery,deliverySettings,deliveryAmount} from './delivery.js';
import { normalizeQuantity, orderLines, formatOrder, displayName, changeProductUnit } from './order.js';
import { translate } from './i18n.js';
import {filterCatalog,countryName,editionCountries} from './catalog.js';
import {createOrderSnapshot} from './order-document.js';
import {normalizeCustomerDetails,completeCustomerDetails} from './customer.js';

const config = window.STORE_CONFIG;
const root = new URL('../../', import.meta.url);
const priced = document.body.dataset.priced === 'true';
const $ = selector => document.querySelector(selector);
const supportedLanguages = ['en','zh','id'];
let language = supportedLanguages.includes(config.defaultLanguage) ? config.defaultLanguage : 'en';
try { const saved = localStorage.getItem('catalog-language'); if (supportedLanguages.includes(saved)) language = saved; } catch {}
const t = (key, values = {}) => translate(language, key, {age:config.minimumAge, ...values});
const money = value => new Intl.NumberFormat(config.locale, {style:'currency', currency:config.currency, currencyDisplay:'narrowSymbol', maximumFractionDigits:0}).format(value);
const labels = {pack:'Pack', carton:'Carton', unit:'Unit'};
const descriptions = {pack:'20 sticks', carton:'10 packs', unit:'Device'};
let products = [], prices = {}, quantities = {}, category = 'all', accepted = false, toastTimer;
let selectedUnits = {};
let galleryProduct = null, galleryIndex = 0;
let catalogState = 'idle';
let country = 'all', exporting = false;
let exportUrls = [];
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const lines = () => orderLines(products, quantities, prices);

document.querySelectorAll('[data-store-name]').forEach(el => el.textContent = config.name);
document.querySelectorAll('[data-age-label]').forEach(el => el.textContent = `${config.minimumAge}+`);
$('.brand').href = root.href;
$('#demo-notice').hidden = !config.demo;
function updateStaticLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-Hans' : language;
  document.title = `${t('catalog')} | ${config.name}`;
  document.querySelectorAll('[data-i18n]').forEach(element => element.textContent = t(element.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => element.placeholder = t(element.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-i18n-aria]').forEach(element => element.setAttribute('aria-label', t(element.dataset.i18nAria)));
  document.querySelectorAll('[data-language-select]').forEach(select => select.value = language);
  for (const unit of Object.keys(labels)) labels[unit] = t(unit);
  descriptions.pack = t('packSize'); descriptions.carton = t('cartonSize'); descriptions.unit = t('device');
  $('#version-label').textContent = t(priced ? 'priced' : 'unpriced');
  const warning = {en:config.healthWarning,zh:config.healthWarningZh,id:config.healthWarningId}[language];
  $('#health-warning').textContent = warning || t('health');
  $('#age-warning').textContent = warning || t('health');
}
updateStaticLanguage();
try { accepted = sessionStorage.getItem('catalog-age') === String(config.minimumAge); } catch {}
const ageGate = $('#age-gate');
if (!accepted) ageGate.showModal();
ageGate.addEventListener('cancel', event => event.preventDefault());
$('#age-accept').addEventListener('click', () => {
  accepted = true;
  try { sessionStorage.setItem('catalog-age', String(config.minimumAge)); } catch {}
  ageGate.close();
  startCatalog();
});
$('#age-decline').addEventListener('click', () => {
  $('#age-declined').hidden = false;
  $('#age-accept').hidden = true;
  $('#age-decline').hidden = true;
});

function startCatalog() {
  if (!products.length && catalogState !== 'loading') load();
}
function customerDetails() {
  return normalizeCustomerDetails({name:$('#customer-name').value,phone:$('#customer-phone').value,address:$('#customer-address').value,city:$('#customer-city').value,region:$('#customer-region').value,postalCode:$('#customer-postal').value,country:$('#customer-country').value});
}
function hasCustomerInput() {
  return ['#customer-name','#customer-phone','#customer-address','#customer-country','#customer-city','#customer-region','#customer-postal','#note'].some(selector => $(selector).value.trim());
}
$('#customer-form').addEventListener('submit', event => event.preventDefault());
$('#customer-form').addEventListener('input', () => $('#reset').disabled = !lines().length && !hasCustomerInput());

function notify(text) {
  clearTimeout(toastTimer);
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => $('#toast').hidden = true, 3500);
}
function renderDescription(product) {
  if (!product.description && !product.specifications?.length) return '';
  const suffix = {en:'En',zh:'Zh',id:'Id'}[language];
  const facts = (product.specifications || []).map(spec => `<div><dt>${escape(spec['label'+suffix] || spec.label)}</dt><dd>${escape(spec['value'+suffix] || spec.value)}</dd></div>`).join('');
  const description = product['description'+suffix] || product.descriptionEn || product.description;
  const contentLanguage = language === 'zh' ? 'zh-Hans' : language;
  return `<section class="product-description" aria-label="${t('description')}"><h3>${t('description')}</h3>${description ? `<p lang="${contentLanguage}">${escape(description)}</p>` : ''}${facts ? `<h3>${t('specifications')}</h3><dl lang="${contentLanguage}">${facts}</dl>` : ''}</section>`;
}
function renderPurchaseControls(product) {
  const multiple = product.units.length > 1;
  const unit = multiple ? selectedUnits[product.id] || '' : product.units[0];
  const key = unit ? `${product.id}:${unit}` : '';
  const quantity = key ? quantities[key] || 0 : 0;
  const price = prices[product.id]?.[unit];
  const choices = multiple ? `<fieldset class="unit-choice" aria-label="${escape(t('unitFor',{name:displayName(product)}))}"><div class="unit-options">${product.units.map(option => {
    const optionPrice = prices[product.id]?.[option];
    const id = `unit-${product.id}-${option}`;
    const amount = quantities[`${product.id}:${option}`] || 0;
    return `<input type="radio" id="${escape(id)}" name="unit-${escape(product.id)}" value="${option}" data-unit-product="${escape(product.id)}" ${unit === option ? 'checked' : ''}><label for="${escape(id)}"><span>${labels[option]} <b class="unit-quantity" data-unit-quantity="${escape(`${product.id}:${option}`)}" aria-hidden="true" ${amount ? '' : 'hidden'}>${amount}</b></span><small>${descriptions[option]}</small>${priced ? `<span class="unit-option-price">${typeof optionPrice === 'number' && optionPrice > 0 ? money(optionPrice) : t('askPrice')}</span>` : ''}</label>`;
  }).join('')}</div></fieldset>` : '';
  return `${choices}${multiple ? `<p class="unit-hint">${t(unit ? 'mixedUnitsHint' : 'chooseUnit')}</p>` : ''}<div class="quantity-row"><label class="unit-label" for="qty-${escape(product.id)}">${unit ? labels[unit] : t('quantity')}<small>${unit ? descriptions[unit] : ''}</small>${priced && !multiple ? `<span class="unit-price">${typeof price === 'number' && price > 0 ? money(price) : t('askPrice')}</span>` : ''}</label><div class="stepper"><button data-change="-1" data-key="${escape(key)}" aria-label="${escape(t('decrease',{name:displayName(product),unit:unit ? labels[unit] : t('quantity')}))}" ${!unit || !quantity ? 'disabled' : ''}>−</button><input id="qty-${escape(product.id)}" data-key="${escape(key)}" type="number" min="0" max="${config.maxQuantity}" step="1" inputmode="numeric" value="${quantity}" ${!unit ? 'disabled' : ''}><button data-change="1" data-key="${escape(key)}" aria-label="${escape(t('increase',{name:displayName(product),unit:unit ? labels[unit] : t('quantity')}))}" ${!unit || quantity >= config.maxQuantity ? 'disabled' : ''}>+</button></div></div>`;
}
function renderProducts() {
  const filtered = filterCatalog(products,{category,country,query:$('#search').value});
  $('#product-count').textContent = t('productCount', {count:filtered.length});
  $('#products').innerHTML = filtered.map(p => {
    const color = /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#b4bca8';
    const selected = p.units.some(unit => quantities[`${p.id}:${unit}`] > 0);
    return `<article class="product-card${selected ? ' selected' : ''}" style="--product-color:${color}" data-product="${escape(p.id)}">
      ${p.image ? `<button class="product-art has-photo" data-gallery="${escape(p.id)}" aria-label="${escape(t('viewDetails',{name:displayName(p)}))}" aria-haspopup="dialog"><img class="product-image" src="${escape(new URL(p.image, root).href)}" alt="${escape(displayName(p))}" loading="lazy" decoding="async" width="960" height="960"><span class="gallery-hint">${t('photoDetails')}</span></button>` : `<div class="product-art"><span class="product-type">${t(p.category === 'device' ? 'device' : 'sticks')}</span><div class="${p.category === 'device' ? 'device-art' : 'pack-art'}" aria-hidden="true">${p.category === 'device' ? '' : '<b>form.</b><span>COLLECTION</span>'}</div><span class="art-label">${t('illustration')}</span></div>`}
      <div class="product-info"><div class="product-title-row"><h3><button class="product-title-button" data-gallery="${escape(p.id)}" aria-haspopup="dialog">${escape(displayName(p))}</button></h3>${p.category === 'device' ? '<span class="swatch" aria-hidden="true"></span>' : ''}</div><p class="variant" ${p.nameZh ? 'lang="zh-Hans"' : ''}>${escape(p.nameZh || p.variant)}</p>${p.country ? `<p class="product-edition">${escape(countryName(p.country,language))}</p>` : ''}
      <div class="purchase-controls" data-purchase="${escape(p.id)}">${renderPurchaseControls(p)}</div></div></article>`;
  }).join('');
  $('#catalog-message').hidden = filtered.length > 0;
  $('#catalog-message').textContent = t(country !== 'all' && !products.some(product => product.country === country) ? 'noCountryProducts' : 'noResults');
}
function renderOrder() {
  const selected = lines();
  $('#line-count').textContent = selected.length;
  $('#order-lines').innerHTML = selected.length ? selected.map(line => `<div class="order-line"><div><strong>${escape(displayName(line.product))}</strong><small>${line.product.nameZh ? `<span lang="zh-Hans">${escape(line.product.nameZh)}</span>` : escape(line.product.variant)}${line.product.country ? ` · ${escape(countryName(line.product.country,language))}` : ''} · ${labels[line.unit]} × ${line.quantity}${priced ? `<br>${line.price === null ? t('unknownPrice') : money(line.price * line.quantity)}` : ''}</small></div><button class="remove-line" data-remove="${escape(`${line.product.id}:${line.unit}`)}" aria-label="${escape(t('remove',{name:displayName(line.product),unit:labels[line.unit]}))}">×</button></div>`).join('') : `<div class="empty-order"><span class="empty-icon" aria-hidden="true">⊞</span><strong>${t('emptyTitle')}</strong><p>${t('emptyHelp')}</p></div>`;
  $('#order-total').hidden = !priced || !selected.length;
  const unknown = selected.some(line => line.price === null), sub = unknown ? 0 : selected.reduce((s,line) => s + line.price * line.quantity, 0), fee = deliveryFor(sub);
  $('#order-total').innerHTML = `${priced && (fee.idr > 0 || fee.deviceFee > 0) ? `<span>${t('deliveryFee')}: ${deliveryAmount(fee.idr,fee.deviceFee,money)}</span>` : ''}<span>${t('estimatedTotal')}</span><strong>${unknown ? t('needsConfirmation') : deliveryAmount(sub + fee.idr,fee.deviceFee,money)}</strong>`;
  $('#copy').disabled = !selected.length;
  $('#reset').disabled = !selected.length && !hasCustomerInput();
  const configured = config.whatsappEnabled !== false && /^[1-9]\d{7,14}$/.test(config.whatsapp);
  $('#export-order').disabled = !selected.length || exporting;
  $('#send').hidden = config.whatsappEnabled === false;
  $('#send-help').hidden = config.whatsappEnabled === false;
  $('#send').disabled = !selected.length || !configured;
  $('#send-help').textContent = configured ? '' : t('whatsappUnavailable');
  $('#mobile-cart').hidden = !selected.length;
  $('#mobile-count').textContent = t('itemCount',{count:selected.length});
}
function updateQuantity(key, value) {
  if (!key) return;
  quantities[key] = normalizeQuantity(value, config.maxQuantity);
  document.querySelectorAll('.stepper input').forEach(input => {
    if (input.dataset.key !== key) return;
    input.value = quantities[key];
    input.previousElementSibling.disabled = quantities[key] === 0;
    input.nextElementSibling.disabled = quantities[key] === config.maxQuantity;
  });
  document.querySelectorAll('[data-unit-quantity]').forEach(badge => {
    if (badge.dataset.unitQuantity === key) { badge.textContent = quantities[key]; badge.hidden = quantities[key] === 0; }
  });
  document.querySelectorAll('[data-product]').forEach(card => {
    const product = products.find(p => p.id === card.dataset.product);
    card.classList.toggle('selected', product.units.some(unit => quantities[`${product.id}:${unit}`] > 0));
  });
  renderOrder();
}
$('#products').addEventListener('click', event => {
  const photo = event.target.closest('[data-gallery]') || (event.target.closest('.purchase-controls') ? null : event.target.closest('[data-product]'));
  if (photo) {
    galleryProduct = products.find(p => p.id === (photo.dataset.gallery || photo.dataset.product));
    galleryIndex = 0;
    renderProductDetails();
    renderGallery();
    $('#photo-dialog').showModal();
    return;
  }
  const button = event.target.closest('[data-change]');
  if (button) updateQuantity(button.dataset.key, (quantities[button.dataset.key] || 0) + Number(button.dataset.change));
});
$('#products').addEventListener('input', event => {
  if (event.target.matches('input[data-key]')) updateQuantity(event.target.dataset.key, event.target.value);
});
$('#products').addEventListener('change', event => {
  if (!event.target.matches('[data-unit-product]')) return;
  const id = event.target.dataset.unitProduct;
  const product = products.find(item => item.id === id);
  const unit = event.target.value;
  if (!product || !product.units.includes(unit) || selectedUnits[id] === unit) return;
  quantities = changeProductUnit(product, unit, quantities);
  selectedUnits[id] = unit;
  const controls = event.target.closest('.purchase-controls');
  controls.closest('[data-product]').classList.toggle('selected',product.units.some(option => quantities[`${id}:${option}`] > 0));
  controls.innerHTML = renderPurchaseControls(product);
  controls.querySelector(`input[value="${unit}"]`).focus();
  renderOrder();
});
$('#order-lines').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (button) { updateQuantity(button.dataset.remove, 0); $('#order-heading')?.focus(); }
});
$('#search').addEventListener('input', renderProducts);
$('#country-options').addEventListener('click', event => {
  const button = event.target.closest('[data-country]');
  if (!button || button.disabled) return;
  country = button.dataset.country;
  renderCountryFilter(); renderProducts();
});
$('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  if (category !== 'all' && category !== 'sticks') country = 'all';
  document.querySelectorAll('[data-category]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  renderCountryFilter(); renderProducts();
});

function renderFilters() {
  const options = [{value:'all', label:t('all')}];
  if (products.some(p => p.category === 'sticks')) options.push({value:'sticks', label:'TEREA'});
  [...new Set(products.filter(p => p.category === 'device').map(p => p.model || p.name))].forEach(name => options.push({value:name, label:name}));
  $('.filters').innerHTML = options.map(option => `<button data-category="${escape(option.value)}" class="${option.value === category ? 'active' : ''}" aria-pressed="${option.value === category}">${escape(option.label)}</button>`).join('');
  $('.catalog-footnote').innerHTML = `${t(products.some(p => p.category === 'sticks') ? 'footnote' : 'deviceFootnote')}<br>${t('availability')}`;
  renderCountryFilter();
}
function renderCountryFilter() {
  const codes = [...new Set([...editionCountries,...products.map(product => product.country).filter(Boolean)])];
  const disabled = category !== 'all' && category !== 'sticks';
  $('.country-filter').hidden = disabled;
  const options = [{code:'all', label:t('allCountries')}, ...codes.map(code => ({code, label:countryName(code,language) + ' (' + products.filter(product => product.country === code).length + ')'}))];
  $('#country-options').innerHTML = options.map(option => '<button type="button" data-country="' + escape(option.code) + '" class="' + (country === option.code ? 'active' : '') + '" aria-pressed="' + (country === option.code) + '" ' + (disabled ? 'disabled' : '') + '>' + escape(option.label) + '</button>').join('');
}
function renderProductDetails() {
  const unitPrices = priced ? galleryProduct.units.map(unit => {
    const value = prices[galleryProduct.id]?.[unit];
    return `<p class="detail-price">${typeof value === 'number' && value > 0 ? money(value) : t('askPrice')} <small>/ ${labels[unit].toLowerCase()}</small></p>`;
  }).join('') : '';
  $('#product-detail-content').innerHTML = `${galleryProduct.nameZh ? `<p class="detail-name-zh" lang="zh-Hans">${escape(galleryProduct.nameZh)}</p>` : ''}${galleryProduct.country ? `<p class="product-edition">${t('countryEdition')}: ${escape(countryName(galleryProduct.country,language))}</p>` : ''}${unitPrices}${renderDescription(galleryProduct)}`;
}
function renderGallery() {
  const images = galleryProduct.images?.length ? galleryProduct.images : [galleryProduct.image];
  $('#photo-title').textContent = displayName(galleryProduct);
  $('#photo-main').src = new URL(images[galleryIndex], root).href;
  $('#photo-main').alt = t('photoAlt',{name:displayName(galleryProduct),count:galleryIndex+1});
  $('#photo-position').textContent = `${galleryIndex + 1} / ${images.length}`;
  $('.photo-controls').hidden = images.length < 2;
  $('#photo-thumbs').hidden = images.length < 2;
  $('#photo-prev').disabled = galleryIndex === 0;
  $('#photo-next').disabled = galleryIndex === images.length - 1;
  $('#photo-thumbs').innerHTML = images.map((src, index) => `<button data-photo-index="${index}" aria-label="${t('photoNumber',{count:index+1})}" aria-pressed="${index === galleryIndex}"><img src="${escape(new URL(src, root).href)}" alt="" loading="lazy" decoding="async"></button>`).join('');
}
$('#photo-prev').addEventListener('click', () => { if (galleryIndex > 0) { galleryIndex--; renderGallery(); } });
$('#photo-next').addEventListener('click', () => {
  if (galleryIndex < (galleryProduct.images?.length || 1) - 1) { galleryIndex++; renderGallery(); }
});
$('#photo-thumbs').addEventListener('click', event => {
  const button = event.target.closest('[data-photo-index]');
  if (button) { galleryIndex = Number(button.dataset.photoIndex); renderGallery(); }
});
$('#photo-close').addEventListener('click', () => $('#photo-dialog').close());
$('#photo-dialog').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); $('#photo-prev').click(); }
  if (event.key === 'ArrowRight') { event.preventDefault(); $('#photo-next').click(); }
});
const textOrder = () => formatOrder(lines(), {name:$('#customer-name').value,note:$('#note').value,priced,money,language,customer:customerDetails(),deliveryFor});
$('#send').addEventListener('click', () => {
  if (!accepted || !lines().length || config.whatsappEnabled === false || !/^[1-9]\d{7,14}$/.test(config.whatsapp)) return;
  const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(textOrder())}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  notify(t('sendNotice'));
});
$('#copy').addEventListener('click', async () => {
  if (!accepted || !lines().length) return;
  try { await navigator.clipboard.writeText(textOrder()); notify(t('copied')); }
  catch { $('#copy-text').value = textOrder(); $('#copy-dialog').showModal(); $('#copy-text').select(); }
});
$('#close-copy').addEventListener('click', () => $('#copy-dialog').close());

$('#export-order').addEventListener('click', async () => {
  if (!accepted || exporting || !lines().length) return;
  if (!$('#customer-form').reportValidity() || !completeCustomerDetails(customerDetails())) { notify(t('customerDetailsMissing')); return; }
  exporting = true; renderOrder();
  $('#export-order').textContent = t('exportGenerating');
  try {
    const snapshot = createOrderSnapshot(lines(),{customer:customerDetails(),requireCustomerDetails:true,note:$('#note').value,priced,language,currency:config.currency,deliveryFor});
    const {renderOrderPages,buildImagePdf,jpegData,loadClosingImage} = await import('./order-export.js');
    const closingImage = await loadClosingImage();
    const {pages} = renderOrderPages(snapshot,undefined,{closingImage});
    const pdf = buildImagePdf(pages.map(page => ({width:page.width,height:page.height,data:jpegData(page)})));
    exportUrls.forEach(url => URL.revokeObjectURL(url)); exportUrls = [];
    const pdfUrl = URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})); exportUrls.push(pdfUrl);
    const link = document.createElement('a');
    link.href = pdfUrl; link.download = `${snapshot.id}.pdf`; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    notify(t('exportReady',{count:pages.length}));
  } catch (error) {
    console.error('Order export failed',error);
    notify(t('exportError'));
  } finally {
    exporting = false; $('#export-order').textContent = t('exportPdf'); renderOrder();
  }
});
$('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', () => {
  quantities = {}; selectedUnits = {}; $('#customer-form').reset();
  renderProducts(); renderOrder(); $('#reset-dialog').close(); notify(t('cleared'));
});

let settings = deliverySettings();
const deliveryFor = () => calculateDelivery(lines(),settings);
async function load() {
  catalogState = 'loading';
  $('#products').setAttribute('aria-busy','true');
  try {
    const get = async file => {
      const response = await fetch(new URL(file, root));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    const [pd, prd, sd] = await Promise.all([get('data/products.json'), priced ? get('data/prices.json') : Promise.resolve({}), priced ? get('data/settings.json').catch(() => ({})) : Promise.resolve({})]);
    products = pd.products ?? pd; prices = Array.isArray(prd.prices) ? Object.fromEntries(prd.prices.map(({id,...rest}) => [id,Object.fromEntries(Object.entries(rest).filter(([,v]) => typeof v === 'number'))])) : prd;
    settings = deliverySettings(sd);
    if (!Array.isArray(products) || !products.every(p => p.id && p.name && Array.isArray(p.units) && p.units.every(unit => unit in labels))) throw new Error('Invalid product data');
    catalogState = 'ready';
    renderFilters(); renderProducts(); renderOrder();
  } catch {
    products = []; prices = {};
    catalogState = 'error';
    $('#product-count').textContent = t('loadFailed');
    $('#products').replaceChildren();
    $('#catalog-message').hidden = false;
    $('#catalog-message').textContent = t('loadError');
    renderOrder();
  } finally { $('#products').setAttribute('aria-busy','false'); }
}
document.querySelectorAll('[data-language-select]').forEach(select => select.addEventListener('change', () => {
  language = supportedLanguages.includes(select.value) ? select.value : 'en';
  try { localStorage.setItem('catalog-language', language); } catch {}
  updateStaticLanguage();
  if (catalogState === 'ready') { renderFilters(); renderProducts(); }
  if (catalogState === 'error') {
    $('#product-count').textContent = t('loadFailed');
    $('#catalog-message').textContent = t('loadError');
  }
  renderOrder();
  if (galleryProduct && $('#photo-dialog').open) { renderProductDetails(); renderGallery(); }
  if ($('#copy-dialog').open) $('#copy-text').value = textOrder();
  $('#toast').hidden = true;
}));
renderOrder();
if (accepted) startCatalog();
