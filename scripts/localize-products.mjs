import fs from 'node:fs';

const file = new URL('../data/products.json', import.meta.url);
const products = JSON.parse(fs.readFileSync(file, 'utf8'));
const flavours = {
  'terea-auburn-edition-indonesia':'香草、杏子、丁香',
  'terea-bermin-pearl-edition-indonesia':'蓝莓、爆珠、薄荷',
  'terea-berrine-edition-indonesia':'清凉与花香',
  'terea-black-green-indonesia':'青果香',
  'terea-black-ruby-indonesia':'红色浆果',
  'terea-blue-indonesia':'胡椒薄荷、奶香',
  'terea-bright-wave-indonesian':'梨、薄荷',
  'terea-bronze-indonesian':'可可、干果',
  'terea-dimensions-apricity':'焦糖与杏子',
  'terea-golden-edition':'李子、丁香',
  'terea-green-indonesian':'梨、薄荷',
  'terea-mulint-edition-indonesia':'清凉与果香',
  'terea-oasis-pearl-indonesian':'热带水果、薄荷、爆珠',
  'terea-passion-fruit':'百香果、爆珠、薄荷、丁香',
  'terea-perint-pearl-edition-indonesia':'梨、丁香、爆珠',
  'terea-purple-wave-indonesian':'蓝莓',
  'terea-riviera-pearl-indonesia':'覆盆子、花香、爆珠',
  'sienna-indonesian':'茶香、木香',
  'terea-strawberry-pearl':'草莓、罗勒、爆珠、丁香、薄荷',
  'terea-sun-pearl-indonesia':'异域水果与薄荷',
  'terea-dimension-yugen':'果香与花香'
};
const labels = {
  'Model':'型号', 'Color':'颜色', 'Device Type':'设备类型', 'Heating Technology':'加热技术',
  'Compatibility':'兼容性', 'Features':'功能', 'Order Unit':'订购单位', 'Origin':'产地',
  'Flavour':'口味', 'Nicotine per Stick':'每支尼古丁含量', 'Session Duration':'每支吸用口数',
  'Pack Size':'每包数量', 'Packs per Carton':'每条数量', 'Carton Weight':'整条重量', 'Carton Dimensions':'整条尺寸'
};
const values = {
  'All-in-one device':'一体式设备', 'Holder and pocket charger':'烟杆及充电盒',
  'SMARTCORE INDUCTION SYSTEM':'SMARTCORE 感应加热系统',
  'TEREA SMARTCORE sticks':'TEREA SMARTCORE 烟草棒', 'IQOS ILUMA series devices':'IQOS ILUMA 系列设备',
  'AutoStart and FlexPuff':'自动启动（AutoStart）与 FlexPuff', 'Touch Screen and Pause Mode':'触控屏与暂停模式',
  '1 device':'1 台设备', 'Indonesia':'印度尼西亚',
  'Approximately 0.5 mg (retailer-reported)':'约 0.5 毫克（零售商提供）',
  'Up to 14 puffs per stick':'每支最多 14 口', '20 TEREA sticks':'20 支 TEREA 烟草棒',
  '10 packs (200 sticks)':'10 包（200 支）', 'Approximately 240 grams':'约 240 克', '162 x 75 x 47 mm':'162 × 75 × 47 毫米'
};
const englishFlavour = value => value
  .replaceAll('Appricot','Apricot').replaceAll('appricot','apricot')
  .replace(/Capsul\b/g,'Capsule').replaceAll('Mentol','Menthol')
  .replaceAll('Tropic Fruity','Tropical Fruit').replaceAll('Exoctic','Exotic')
  .replaceAll('Dry Fruit','Dried Fruit').replaceAll('Cengkeh','Clove');

for (const product of products) {
  if (product.category === 'sticks') {
    if (!flavours[product.id]) throw new Error(`Missing flavour translation: ${product.id}`);
    product.flavorEn = englishFlavour(product.flavor);
    product.flavorZh = flavours[product.id];
    product.descriptionEn = `TEREA ${product.name}. Flavour profile: ${product.flavorEn}. Each pack contains 20 sticks; a carton contains 10 packs (200 sticks). For IQOS ILUMA series devices.`;
    product.descriptionZh = `TEREA ${product.nameZh}，口味为${product.flavorZh}。每包 20 支，每条 10 包（200 支），适用于 IQOS ILUMA 系列设备。`;
  } else {
    const color = product.nameZh.slice(product.model.length).trim();
    const one = product.model === 'Iqos Iluma i One';
    product.descriptionEn = product.description;
    product.descriptionZh = `${product.model}，${color}。${one ? '一体式加热烟草设备，适用于 TEREA 烟草棒，配备自动启动（AutoStart）与 FlexPuff 功能。' : '适用于 TEREA 烟草棒的加热烟草设备，配备触控屏与暂停模式。'}`;
  }
  for (const spec of product.specifications) {
    spec.labelZh = labels[spec.label];
    if (!spec.labelZh) throw new Error(`Missing label translation: ${spec.label}`);
    if (spec.label === 'Model') spec.valueZh = spec.value;
    else if (spec.label === 'Color') spec.valueZh = product.nameZh.slice(product.model.length).trim();
    else if (spec.label === 'Flavour') { spec.valueEn = product.flavorEn; spec.valueZh = product.flavorZh; }
    else spec.valueZh = values[spec.value];
    if (!spec.valueZh) throw new Error(`Missing specification translation: ${spec.value}`);
  }
}
const flavoursId = {
  'terea-auburn-edition-indonesia':'Vanila, aprikot, cengkeh',
  'terea-bermin-pearl-edition-indonesia':'Blueberry, kapsul, mentol',
  'terea-berrine-edition-indonesia':'Sensasi dingin dan aroma bunga',
  'terea-black-green-indonesia':'Aroma buah hijau',
  'terea-black-ruby-indonesia':'Beri merah',
  'terea-blue-indonesia':'Peppermint dan krim',
  'terea-bright-wave-indonesian':'Pir dan mentol',
  'terea-bronze-indonesian':'Kakao dan buah kering',
  'terea-dimensions-apricity':'Karamel dan aprikot',
  'terea-golden-edition':'Plum dan cengkeh',
  'terea-green-indonesian':'Pir dan mentol',
  'terea-mulint-edition-indonesia':'Sensasi dingin dan aroma buah',
  'terea-oasis-pearl-indonesian':'Buah tropis, mentol, kapsul',
  'terea-passion-fruit':'Markisa, kapsul, mentol, cengkeh',
  'terea-perint-pearl-edition-indonesia':'Pir, cengkeh, kapsul',
  'terea-purple-wave-indonesian':'Blueberry',
  'terea-riviera-pearl-indonesia':'Raspberry, aroma bunga, kapsul',
  'sienna-indonesian':'Aroma teh dan kayu',
  'terea-strawberry-pearl':'Stroberi, basil, kapsul, cengkeh, mentol',
  'terea-sun-pearl-indonesia':'Buah eksotis dan mentol',
  'terea-dimension-yugen':'Aroma buah dan bunga'
};
const labelsId = {
  'Model':'Model', 'Color':'Warna', 'Device Type':'Tipe perangkat', 'Heating Technology':'Teknologi pemanasan',
  'Compatibility':'Kompatibilitas', 'Features':'Fitur', 'Order Unit':'Satuan pemesanan', 'Origin':'Asal',
  'Flavour':'Rasa', 'Nicotine per Stick':'Nikotin per batang', 'Session Duration':'Isapan per batang',
  'Pack Size':'Isi per pack', 'Packs per Carton':'Isi per carton', 'Carton Weight':'Berat carton', 'Carton Dimensions':'Ukuran carton'
};
const valuesId = {
  'All-in-one device':'Perangkat all-in-one', 'Holder and pocket charger':'Holder dan pengisi daya portabel',
  'SMARTCORE INDUCTION SYSTEM':'SMARTCORE INDUCTION SYSTEM',
  'TEREA SMARTCORE sticks':'Batang tembakau TEREA SMARTCORE', 'IQOS ILUMA series devices':'Perangkat seri IQOS ILUMA',
  'AutoStart and FlexPuff':'Mulai otomatis (AutoStart) dan FlexPuff', 'Touch Screen and Pause Mode':'Layar sentuh dan mode jeda',
  '1 device':'1 unit perangkat', 'Indonesia':'Indonesia',
  'Approximately 0.5 mg (retailer-reported)':'Sekitar 0,5 mg (informasi retailer)',
  'Up to 14 puffs per stick':'Hingga 14 isapan per batang', '20 TEREA sticks':'20 batang TEREA',
  '10 packs (200 sticks)':'10 pack (200 batang)', 'Approximately 240 grams':'Sekitar 240 gram', '162 x 75 x 47 mm':'162 × 75 × 47 mm'
};
for (const product of products) {
  if (product.category === 'sticks') {
    product.flavorId = flavoursId[product.id];
    if (!product.flavorId) throw new Error(`Missing Indonesian flavour: ${product.id}`);
    product.descriptionId = `TEREA ${product.name}. Profil rasa: ${product.flavorId}. Setiap pack berisi 20 batang; satu carton berisi 10 pack (200 batang). Digunakan dengan perangkat seri IQOS ILUMA.`;
  } else {
    const one = product.model === 'Iqos Iluma i One';
    product.descriptionId = `${product.model} warna ${product.variant}. ${one ? 'Perangkat pemanas tembakau all-in-one untuk batang TEREA, dengan fitur mulai otomatis (AutoStart) dan FlexPuff.' : 'Perangkat pemanas tembakau untuk batang TEREA, dengan layar sentuh dan mode jeda.'}`;
  }
  for (const spec of product.specifications) {
    spec.labelId = labelsId[spec.label];
    spec.valueId = spec.label === 'Model' || spec.label === 'Color' ? spec.value : spec.label === 'Flavour' ? product.flavorId : valuesId[spec.value];
    if (!spec.labelId || !spec.valueId) throw new Error(`Missing Indonesian specification: ${spec.label}`);
  }
}
fs.writeFileSync(file, JSON.stringify(products, null, 2) + '\n');
console.log(`English, Chinese and Indonesian copy prepared for ${products.length} products.`);
