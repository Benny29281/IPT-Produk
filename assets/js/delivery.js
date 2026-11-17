export const defaultDeliverySettings = Object.freeze({deviceDeliveryFee:120,tereaSmallDeliveryFee:400000,tereaGroupDeliveryFee:450000});

export function deliverySettings(value = {}) {
  return Object.fromEntries(Object.entries(defaultDeliverySettings).map(([key,fallback]) => [key,
    typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 ? value[key] : fallback
  ]));
}

export function calculateDelivery(lines, settings = defaultDeliverySettings) {
  const rates = deliverySettings(settings);
  let devices = 0, packs = 0;
  for (const {product,unit,quantity} of lines) {
    if (product.category === 'device') devices += quantity;
    if (product.category === 'sticks') packs += quantity * (unit === 'carton' ? 10 : 1);
  }
  const fullGroups = Math.floor(packs / 40), remainingPacks = packs % 40;
  return {
    idr:fullGroups * rates.tereaGroupDeliveryFee + (remainingPacks > 0 ? remainingPacks <= 20 ? rates.tereaSmallDeliveryFee : rates.tereaGroupDeliveryFee : 0),
    deviceFee:devices * rates.deviceDeliveryFee
  };
}

// Numeric callbacks remain supported for existing exports and integrations.
export function normalizeDelivery(value) {
  return typeof value === 'number' ? {idr:value,deviceFee:0} : value || {idr:0,deviceFee:0};
}

export function deliveryAmount(idr, deviceFee, money) {
  const amounts = [];
  if (idr || !deviceFee) amounts.push(money(idr));
  if (deviceFee) amounts.push(`\u00a5${deviceFee.toLocaleString('en-US')}`);
  return amounts.join(' + ');
}
