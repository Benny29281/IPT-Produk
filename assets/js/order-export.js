import {translate} from './i18n.js';
import {countryName} from './catalog.js';
import {addressLines} from './customer.js';

const PAGE_WIDTH = 1240, PAGE_HEIGHT = 1754;
const LEFT = 64, RIGHT = PAGE_WIDTH - LEFT, FOOTER_Y = PAGE_HEIGHT - 68;
const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif';

function wrapText(context, value, width) {
  const result = [];
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    let line = '';
    for (const token of paragraph.split(/(\s+)/u)) {
      if (!line && !token.trim()) continue;
      if (context.measureText(line + token).width <= width) { line += token; continue; }
      if (line.trim()) { result.push(line.trimEnd()); line = ''; }
      if (!token.trim()) continue;
      if (context.measureText(token).width <= width) { line = token; continue; }
      for (const character of Array.from(token)) {
        if (line && context.measureText(line + character).width > width) { result.push(line); line = ''; }
        line += character;
      }
    }
    result.push(line.trimEnd());
  }
  return result.length ? result : [''];
}

export function renderOrderPages(snapshot, createCanvas = (width,height) => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
}) {
  const t = key => translate(snapshot.language,key);
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:snapshot.currency || 'IDR',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(value);
  const pages = [], layout = [];
  let canvas, ctx, y, pageRows;
  const columns = snapshot.priced
    ? {product:{x:110,width:390},country:{x:520,width:114},unit:{x:652,width:90},quantity:{x:758,width:62},price:{x:844,width:142},amount:{x:1006,width:170}}
    : {product:{x:110,width:590},country:{x:728,width:170},unit:{x:926,width:112},quantity:{x:1070,width:106}};
  function font(size = 20, bold = false) { ctx.font = `${bold ? '600' : '400'} ${size}px ${FONT}`; }
  function text(value,x,atY,size = 20,bold = false,color = '#263b34') {
    font(size,bold); ctx.fillStyle = color; ctx.fillText(String(value),x,atY);
  }
  function rule(atY,color = '#dfe5df') { ctx.fillStyle = color; ctx.fillRect(LEFT,atY,RIGHT - LEFT,1); }
  function lines(values,x,atY,size = 20,bold = false,color = '#263b34',lineHeight = 28) {
    values.forEach((value,index) => text(value,x,atY + index * lineHeight,size,bold,color));
  }
  function startPage() {
    canvas = createCanvas(PAGE_WIDTH,PAGE_HEIGHT); ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.fillRect(0,0,PAGE_WIDTH,PAGE_HEIGHT);
    pages.push(canvas); pageRows = []; layout.push({rows:pageRows});
    text(t('exportDocumentTitle'),LEFT,60,34,true);
    text(snapshot.id,LEFT,112,17,false,'#758179');
    const locale = {en:'en-GB',id:'id-ID',zh:'zh-CN'}[snapshot.language];
    text(`${t('date')}: ${new Date(snapshot.createdAt).toLocaleString(locale)}`,LEFT,145,17,false,'#65746b');
    y = 185;
    if (snapshot.name) {
      font(20); const customer = wrapText(ctx,`${t('customerName')}: ${snapshot.name}`,RIGHT - LEFT);
      lines(customer,LEFT,y); y += customer.length * 28 + 12;
    }
    if (pages.length === 1) {
      if (snapshot.orderingFrom?.city && snapshot.orderingFrom?.country) {
        font(18);
        const origin = wrapText(ctx,`${t('orderingFrom')}: ${snapshot.orderingFrom.city}, ${snapshot.orderingFrom.country}`,RIGHT - LEFT);
        lines(origin,LEFT,y,18,false,'#65746b',26); y += origin.length * 26 + 12;
      }
      if (snapshot.customer?.address) {
        text(t('shippingAddress'),LEFT,y,20,true); y += 31;
        font(19);
        for (const value of addressLines(snapshot.customer)) {
          const address = wrapText(ctx,value,RIGHT - LEFT);
          lines(address,LEFT,y,19,false,'#405846',27); y += address.length * 27;
        }
        if (snapshot.customer.phone) {
          font(18); const phone = wrapText(ctx,`${t('contactPhone')}: ${snapshot.customer.phone}`,RIGHT - LEFT);
          lines(phone,LEFT,y,18,false,'#65746b',26); y += phone.length * 26;
        }
        y += 18;
      }
    }
    text(`${snapshot.rows.length} ${t('exportLineItems')}`,LEFT,y,17,false,'#65746b'); y += 38;
    ctx.fillStyle = '#eef2ed'; ctx.fillRect(LEFT,y,RIGHT - LEFT,62);
    text('#',LEFT + 8,y + 16,17,true);
    const headers = {product:'exportProduct',country:'countryEdition',unit:'exportUnit',quantity:'exportQuantity',price:'exportUnitPrice',amount:'exportAmount'};
    for (const [key,column] of Object.entries(columns)) {
      font(17,true); lines(wrapText(ctx,t(headers[key]),column.width),column.x,y + 10,17,true,'#405c4c',22);
    }
    y += 76;
  }
  const limit = FOOTER_Y - 32;
  function ensure(height) { if (y + height > limit) startPage(); }
  startPage();
  snapshot.rows.forEach((row,index) => {
    font(21,true); const english = wrapText(ctx,row.name,columns.product.width);
    font(19); const chinese = row.nameZh ? wrapText(ctx,row.nameZh,columns.product.width) : [];
    font(18);
    const edition = wrapText(ctx,row.country ? `${countryName(row.country,snapshot.language)} (${row.country})` : '-',columns.country.width);
    const unit = wrapText(ctx,t(row.unit),columns.unit.width);
    const price = snapshot.priced ? wrapText(ctx,row.unitPrice === null ? t('unknownPrice') : money(row.unitPrice),columns.price.width) : [];
    const amount = snapshot.priced ? wrapText(ctx,row.lineTotal === null ? t('unknownPrice') : money(row.lineTotal),columns.amount.width) : [];
    const productHeight = english.length * 29 + (chinese.length ? 7 + chinese.length * 27 : 0);
    const height = Math.max(productHeight,edition.length * 26,unit.length * 26,price.length * 26,amount.length * 26,30) + 30;
    ensure(height);
    if (y + height > limit) throw new Error('A product name is too long to fit on one page');
    text(index + 1,LEFT + 8,y + 4,18,false,'#788579');
    lines(english,columns.product.x,y,21,true,'#243c30',29);
    lines(chinese,columns.product.x,y + english.length * 29 + 7,19,false,'#687a6b',27);
    lines(edition,columns.country.x,y + 3,18,false,'#526b59',26);
    lines(unit,columns.unit.x,y + 3,18,false,'#405846',26);
    text(row.quantity,columns.quantity.x,y + 3,20,true);
    if (snapshot.priced) {
      lines(price,columns.price.x,y + 3,18,false,'#405846',26);
      lines(amount,columns.amount.x,y + 3,18,true,'#243c30',26);
    }
    pageRows.push({id:row.id,index,y,height});
    y += height; rule(y - 12);
  });
  if (snapshot.priced) {
    ensure(100); y += 16;
    if (snapshot.deliveryFee > 0) { text(t('deliveryFee'),LEFT,y,22,false); font(22,false); text(money(snapshot.deliveryFee),RIGHT - ctx.measureText(money(snapshot.deliveryFee)).width,y,22,false); y += 44; }
    text(t('total'),LEFT,y,25,true);
    font(24,true);
    const total = snapshot.total === null ? t('unknownTotal') : money(snapshot.total);
    const totalLines = wrapText(ctx,total,450);
    totalLines.forEach((line,index) => {
      font(24,true); const x = RIGHT - ctx.measureText(line).width;
      text(line,x,y + index * 32,24,true,'#214e41');
    });
    y += totalLines.length * 32 + 28;
  }
  if (snapshot.note) {
    ensure(90); text(t('note'),LEFT,y,21,true); y += 36;
    font(20); const notes = wrapText(ctx,snapshot.note,RIGHT - LEFT);
    for (const line of notes) { ensure(32); text(line,LEFT,y,20,false,'#4f6657'); y += 30; }
    y += 18;
  }
  font(17); const disclaimer = wrapText(ctx,t('exportDocumentNote'),RIGHT - LEFT);
  ensure(disclaimer.length * 25 + 20); lines(disclaimer,LEFT,y,17,false,'#7b887f',25);
  pages.forEach((page,index) => {
    ctx = page.getContext('2d'); ctx.textBaseline = 'top';
    rule(FOOTER_Y - 12); text(snapshot.id,LEFT,FOOTER_Y,15,false,'#8a958e');
    const pageText = `${t('exportPage')} ${index + 1} / ${pages.length}`;
    font(16); text(pageText,RIGHT - ctx.measureText(pageText).width,FOOTER_Y,16,false,'#7c8c80');
  });
  return {pages,layout};
}

export function jpegData(canvas) {
  const data = canvas.toDataURL('image/jpeg',0.94).split(',')[1];
  return Uint8Array.from(atob(data),character => character.charCodeAt(0));
}

export function buildImagePdf(images) {
  if (!images.length) throw new Error('No PDF pages');
  const encode = value => new TextEncoder().encode(value);
  const chunks = [encode('%PDF-1.4\n% Order document\n')], offsets = [0];
  let length = chunks[0].length;
  const append = chunk => { chunks.push(chunk); length += chunk.length; };
  function object(number,parts) {
    offsets[number] = length; append(encode(`${number} 0 obj\n`));
    for (const part of parts) append(typeof part === 'string' ? encode(part) : part);
    append(encode('\nendobj\n'));
  }
  object(1,['<< /Type /Catalog /Pages 2 0 R >>']);
  object(2,[`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,index) => `${3 + index * 3} 0 R`).join(' ')}] >>`]);
  images.forEach((image,index) => {
    const page = 3 + index * 3, content = page + 1, resource = page + 2;
    object(page,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage ${resource} 0 R >> >> /Contents ${content} 0 R >>`]);
    const commands = 'q\n595.28 0 0 841.89 0 0 cm\n/PageImage Do\nQ';
    object(content,[`<< /Length ${encode(commands).length} >>\nstream\n${commands}\nendstream`]);
    object(resource,[`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,image.data,'\nendstream']);
  });
  const xref = length;
  append(encode(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  const output = new Uint8Array(length); let position = 0;
  for (const chunk of chunks) { output.set(chunk,position); position += chunk.length; }
  return output;
}
