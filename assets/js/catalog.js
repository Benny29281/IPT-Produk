import {displayName} from './order.js';
import {countryName} from './countries.js';
export {countryName,editionCountries} from './countries.js';

export function filterCatalog(products, {category = 'all', country = 'all', query = ''} = {}) {
  const search = query.trim().toLocaleLowerCase();
  return products.filter(product => {
    const categoryMatch = category === 'all' || product.category === category || (product.model || product.name) === category;
    const countryMatch = country === 'all' || product.country === country;
    const names = ['en','zh','id'].map(language => countryName(product.country,language));
    const haystack = [displayName(product),product.nameZh,product.flavor,product.flavorEn,product.flavorZh,product.flavorId,...names].filter(Boolean).join(' ').toLocaleLowerCase();
    return categoryMatch && countryMatch && haystack.includes(search);
  });
}
