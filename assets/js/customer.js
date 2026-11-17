export function normalizeCustomerDetails(customer = {}, fallbackName = '') {
  customer ||= {};
  const clean = value => String(value ?? '').trim();
  return {
    name:clean(customer.name || fallbackName), phone:clean(customer.phone), address:clean(customer.address),
    city:clean(customer.city), region:clean(customer.region), postalCode:clean(customer.postalCode), country:clean(customer.country)
  };
}

export function completeCustomerDetails(customer) {
  const details = normalizeCustomerDetails(customer);
  const limits = {name:80,phone:40,address:600,city:80,region:80,postalCode:32,country:80};
  return ['name','address','city','country'].every(key => details[key].length > 0) && Object.entries(limits).every(([key,max]) => details[key].length <= max);
}

export function normalizeOrderingLocation(location = {}) {
  location ||= {};
  return {country:String(location.country ?? '').trim(),city:String(location.city ?? '').trim()};
}

export function completeOrderingLocation(location) {
  const value = normalizeOrderingLocation(location);
  return Boolean(value.country && value.city && value.country.length <= 80 && value.city.length <= 80);
}

export function addressLines(customer) {
  const value = normalizeCustomerDetails(customer);
  return [value.address,[value.city,value.region,value.postalCode].filter(Boolean).join(', '),value.country].filter(Boolean);
}
