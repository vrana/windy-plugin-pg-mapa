import broadcast from '@windy/broadcast';
import {getLatLonInterpolator} from '@windy/interpolator';
import {map} from '@windy/map';
import store from '@windy/store';
import utils from '@windy/utils';
import windyFetch from '@windy/fetch';
import {getLatLon} from './windy-pgmapa.js';

export {broadcast, getLatLonInterpolator, map, store, utils};

/** Used in API version. */
export function onLaunchLoad() {
}

/** Loads forecast of a point.
 * @param {string} model
 * @param {string} latLon
 * @return {Promise<{header: Object, data: Object<string, Array>}>}
 */
export function fetchForecast(model, latLon) {
	// https://docs.windy-plugins.com/api/modules/fetch.html#getpointforecastdata
	return windyFetch.getDetailPointForecastData(Object.assign({model, step: 1, days: 15}, getLatLon(latLon))).then(forecast => forecast.data);
}

/** Loads airData of a point.
 * @param {string} model
 * @param {string} latLon
 * @return {Promise<{header: Object, data: Object<string, Array>}>}
 */
export function fetchAirData(model, latLon) {
	// https://docs.windy-plugins.com/api/modules/fetch.html#getmeteogramforecastdata
	return windyFetch.getMeteogramForecastData(model, Object.assign({step: 1}, getLatLon(latLon))).then(airData => airData.data);
}

export function getLaunchAttrs(site) {
	return ' href="' + site.url + '" target="_blank"';
}

/** Gets URL of the takeoffs.
 * @param {string} locale 'en' or 'cs'
 * @return {string}
 */
export function getApiUrl(locale) {
	return 'https://pg.vrana.cz/windy/json.php?locale=' + locale;
//~ 	return 'https://pg.vrana.cz/xcontest/pgearth.php';
//~ 	return 'https://www.paragliding-mapa.cz/api/v0.1/launch?locale=' + locale;
//~ 	return 'https://pg.vrana.cz/xcontest/takeoffs.php?season=2021&country=CZ';
//~ 	return 'https://pg.vrana.cz/xcontest/dhv.php';
}

export function getLaunchExtra(site) {
	return '';
}

export function getWindAttrs(latLon) {
	return ' href=\'javascript:W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(Object.assign(getLatLon(latLon), {'display': 'wind'})) + ');\''; // Recommended at https://community.windy.com/topic/28899 but it doesn't work.
}

export function getForecastAttrs(latLon) {
	return ' href=\'javascript:W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(Object.assign(getLatLon(latLon), {'display': 'meteogram'})) + ');\'';
}
