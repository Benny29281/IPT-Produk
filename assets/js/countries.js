import {translate} from './i18n.js';

export const editionCountries = ['ID','KR','JP'];
const countryKeys = {ID:'countryIndonesia',KR:'countryKorea',JP:'countryJapan'};

export function countryName(code, language = 'en') {
  return code ? countryKeys[code] ? translate(language,countryKeys[code]) : String(code) : '';
}
