Paragliding Mapa
<script>
import broadcast from '@windy/broadcast';
import {getLatLonInterpolator} from '@windy/interpolator';
import {map} from '@windy/map';
import store from '@windy/store';
import utils from '@windy/utils';
import windyFetch from '@windy/fetch';
import {onDestroy} from 'svelte';

/** Used in API version. */
function onLaunchLoad() {
}

/** Gets model usable for forecast.
 * @return {string}
 */
function getModel() {
	const product = store.get('product');
	// https://github.com/windycom/windy-plugins/blob/master/docs/WINDY_API.md#module-plugin-data-loader
	return ['gfs', 'icon', 'iconD2', 'iconEu'].indexOf(product) != -1 ? product : 'ecmwf';
}

function getLaunchAttrs(site) {
	return ' href="' + site.url + '" target="_blank"';
}

function getApiUrl() {
	return 'https://pg.vrana.cz/xcontest/pgmapa.php?locale=' + translate('en', 'cs');
//~ 	return 'https://pg.vrana.cz/xcontest/pgearth.php';
//~ 	return 'https://www.paragliding-mapa.cz/api/v0.1/launch?locale=' + translate('en', 'cs');
//~ 	return 'https://pg.vrana.cz/xcontest/takeoffs.php?season=2021&country=CZ';
//~ 	return 'https://pg.vrana.cz/xcontest/dhv.php';
}

function getLaunchExtra(site) {
	return '';
}

function getWindAttrs(latLon) {
	return ' href=\'javascript:W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(Object.assign(getLatLon(latLon), {'display': 'wind'})) + ');\''; // Recommended at https://community.windy.com/topic/28899 but it doesn't work.
}

function getForecastAttrs(latLon) {
	return ' href=\'javascript:W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(Object.assign(getLatLon(latLon), {'display': 'meteogram'})) + ');\'';
}

export const onopen = function () {
	const openInApp = document.getElementById('open-in-app');
	if (openInApp) {
		openInApp.style.display = 'none';
	}
	init();
}

onDestroy(() => {
	Object.values(markers).forEach(marker => marker.remove());
	broadcast.off('redrawFinished', redraw);
});

// Same as https://pg.vrana.cz/mapa/ from here.

/** @typedef {{
 *   latitude: number,
 *   longitude: number,
 *   name: string,
 *   url: string,
 *   urls: ?Array<string>,
 *   altitude: number,
 *   superelevation: number,
 *   flights: number,
 *   flying_status: number,
 *   active: number,
 *   wind_usable_from: ?number,
 *   wind_usable_to: ?number,
 *   wind_usable: ?Array<[number, number]>,
 *   link_meteo: string,
 *   link_webcam: string,
 *   parkings: Array<{name: string, latitude: number, longitude: number}>,
 * }} */
let Site;
/** @type {Object<string, Array<Site>>} key: latLon */
const sites = {};
/** @type {Object<string, L.Marker>} key: latLon */
const markers = {};
/** @type {?L.Marker} */
let activeMarker = null;
/** @typedef {{wind: number, dir: number}} */
let Wind;
/** @type {Object<string, Wind>} key: model:level:path:latLon */
const winds = {};
/** @typedef {{
 *   hour: number,
 *   wind: number,
 *   gust: number,
 *   windDir: number,
 *   icon: number,
 *   moonPhase: number,
 *   mm: number,
 * }} */
let Forecast;
/** @typedef {{
 *   day: Array<string>,
 *   hour: Array<number>,
 *   wind: Array<number>,
 *   gust: Array<number>,
 *   windDir: Array<number>,
 *   icon: Array<number>,
 *   moonPhase: Array<number>,
 *   mm: Array<number>,
 * }} */
let ForecastArray;
/** @type {Object<string, Object<string, {
 *   header: {note: string, sunrise: number, sunset: number},
 *   data: Object<string, Array<ForecastArray>>,
 * }>>} key: model, key2: latLon, key in data: day */
const forecasts = {};
/** @typedef {{header: {modelElevation: ?number}, data: {
 *   hours: Array<number>,
 *   dewpoint-surface: Array<number>,
 *   temp-surface: Array<number>,
 *   temp-1000h: Array<number>,
 *   gh-1000h: Array<number>,
 * }}}
 */
let AirData;
/** @type {Object<string, Object<string, AirData>>} key: model, key2: latLon */
const airDatas = {ecmwf: {}};
/** @type {boolean} Whether to display sounding. */
let displaySounding = false;

function init() {
	broadcast.on('redrawFinished', redraw);
	if (Object.keys(sites).length) {
		// Opening already loaded layer.
		return;
	}
	fetch(getApiUrl()).then(response => response.json()).then(launch => {
		const sitesLatLon = {}; // latLonRounded: [latLon]
		launchLoop: for (const site of launch.data) {
			site.wind_usable = site.wind_usable_from != null ? [[site.wind_usable_from, site.wind_usable_to]] : site.wind_usable;
			for (let y = -1; y <= 1; y += 2) { // Search only in nearby squares.
				for (let x = -1; x <= 1; x += 2) {
					const lat = (site.latitude + y / 20).toFixed(1);
					const lon = (site.longitude + x / 20).toFixed(1);
					if (sitesLatLon[lat + ' ' + lon]) {
						for (const latLon of sitesLatLon[lat + ' ' + lon]) {
							if (utils.isNear(getLatLon(latLon), {lat: site.latitude, lon: site.longitude})) {
								// Merge two sites if they are close to each other, e.g. Raná SZ and Raná JV.
								sites[latLon].push(site);
								continue launchLoop;
							}
						}
					}
				}
			}
			// Store latitude and longitude in one key to avoid having sites[latitude] = sites[latitude] || {}.
			sites[site.latitude + ' ' + site.longitude] = [site];
			const latLonRounded = site.latitude.toFixed(1) + ' ' + site.longitude.toFixed(1);
			sitesLatLon[latLonRounded] = sitesLatLon[latLonRounded] || [];
			sitesLatLon[latLonRounded].push(site.latitude + ' ' + site.longitude);
		}

		map.on('popupclose', () => activeMarker = null);
		redraw(); // Redraw might be finished before the data is loaded.
		onLaunchLoad();
	});
}

function createMarker(latLon) {
	const marker = L.marker(getLatLon(latLon), {
		icon: newIcon(getIconUrl(sites[latLon], null), sites[latLon]),
		riseOnHover: true,
		title: sites[latLon].map(site => site.name + (site.superelevation ? ' (' + site.superelevation + ' m)' : '')).join('\n'),
	});
	// Leaflet supports binding function but that function is called only the first time the popup is opened.
	marker.bindPopup(getTooltip(latLon), {minWidth: 200, maxWidth: 400, autoPan: false});
	// Leaflet tooltips close when you hover the tooltip and they work poorly on mobile. Use popup instead.
	marker.on('popupopen', () => {
		activeMarker = marker;
		loadForecast(latLon);
		if (!airDatas['ecmwf'][latLon]) {
			windyFetch.getMeteogramForecastData('ecmwf', Object.assign({step: 1}, getLatLon(latLon))).then(airData => {
				airDatas['ecmwf'][latLon] = airData.data;
				markers[latLon].setPopupContent(getTooltip(latLon));
			});
		}
	});
	return marker;
}

async function redraw() {
	const interpolator = await getLatLonInterpolator();
	const mapBounds = map.getBounds();
	for (const latLon in sites) {
		const flights = sites[latLon].reduce((acc, site) => Math.max(acc, site.flights), 0);
		if (map.getZoom() > (flights > 100 ? 4 : (flights > 10 ? 7 : 8)) && mapBounds.contains(getLatLon(latLon))) {
			if (!markers[latLon]) {
				markers[latLon] = createMarker(latLon);
			}
			if (!winds[getWindsKey(latLon)]) {
				if (store.get('overlay') == 'wind') {
					// If the displayed overlay is 'wind' then use it.
					const data = interpolator(getLatLon(latLon));
					winds[getWindsKey(latLon)] = data && utils.wind2obj(data);
				} else if (!loadForecast(latLon) && markers[latLon]._icon) {
					// Preserve the old icon, just resize it.
					const url = markers[latLon]._icon.src;
					markers[latLon].setIcon(newIcon(url, sites[latLon]));
					continue;
				}
			}
			updateMarker(latLon);
			markers[latLon].addTo(map);
		} else if (markers[latLon]) {
			markers[latLon].remove();
		}
	}
	if (activeMarker) {
		activeMarker.fire('popupopen');
	}
}

/** Loads forecast if not already loaded.
 * @param {string} latLon
 * @return {boolean} True if forecast is already loaded.
 */
function loadForecast(latLon) {
	const model = getModel();
	forecasts[model] = forecasts[model] || {};
	if (forecasts[model][latLon]) {
		return true;
	}
	windyFetch.getPointForecastData(model, Object.assign({step: 1}, getLatLon(latLon)), 'detail').then(forecast => {
		forecasts[model][latLon] = forecast.data;
		// After loading the forecast, update the tooltip and possibly also the icon.
		updateMarker(latLon);
	});
	return false;
}

/** Gets wind data.
 * @param {string} latLon
 * @return {?Wind}
 */
function getWind(latLon) {
	if (winds[getWindsKey(latLon)]) {
		return winds[getWindsKey(latLon)];
	}
	const data = forecasts[getModel()] && forecasts[getModel()][latLon] && getForecast(forecasts[getModel()][latLon]);
	return data && {wind: data.wind, dir: data.windDir};
}

/** Sets color, opacity and tooltip of a marker.
 * @param {string} latLon
 */
function updateMarker(latLon) {
	const wind = getWind(latLon);
	const color = getColor(sites[latLon], wind);
	markers[latLon].setIcon(newIcon(getIconUrl(sites[latLon], wind), sites[latLon]));
	markers[latLon].setOpacity(color != 'red' && color != 'silver' ? 1 : .6);
	markers[latLon].setPopupContent(getTooltip(latLon));
}

function getUrlLink(url) {
	if (/paragliding-mapa\.cz/.test(url)) {
		return ' <a href="' + url + '" target="_blank"><img src="https://www.paragliding-mapa.cz/favicon/favicon-32x32.png" width="12" height="12" alt="" title="Paragliding Mapa"></a>';
	} else if (/dhv\.de/.test(url)) {
		return ' <a href="' + url + '" target="_blank"><img src="https://service.dhv.de/dbresources/dhv/images/ci/dhv.ico" width="12" height="12" alt="" title="DHV"></a>';
	} else if (/paraglidingearth\.com/.test(url)) {
		return ' <a href="' + url + '" target="_blank"><img src="https://www.paraglidingearth.com/assets/img/favicon.ico" width="12" height="12" alt="" title="Paragliding Earth"></a>';
	}
	return ''; // No icon for XContest because there's already an XContest icon below.
}

/** Gets tooltip with site names, wind info and forecast.
 * @param {string} latLon
 * @return {HTMLElement}
 */
function getTooltip(latLon) {
	const localSites = sites[latLon];
	const model = getModel();
	const wind = getWind(latLon);
	const forecast = forecasts[model] && forecasts[model][latLon];
	const airData = airDatas['ecmwf'][latLon]; // ECMWF predicts height the best.
	const colors = ['green', 'orange', 'gray', 'red'];
	const tooltips = localSites.map(site => {
		return '<b style="font-size: 1.25em;' + (site.name.length >= 20 ? 'text-overflow: ellipsis; max-width: 180px; display: inline-block; overflow: hidden; vertical-align: text-bottom;" title="' + html(site.name) : '') + '"><a' + getLaunchAttrs(site)
			+ (isSiteForbidden(site) ? ' style="color: red;"' + (site.flying_status == 4 ? ' title="' + translate('flying forbidden', 'létání zakázáno') + '"' : '') : '') + '>' + html(site.name) + '</a></b>'
			+ (localSites.length > 1 && site.wind_usable ? ' <img src="' + getIconUrl([site], wind, colors) + '" width="12" height="12" alt="">' : '')
			+ [site.url].concat(site.urls || []).map(getUrlLink).join('')
			+ (site.altitude ? ' <span title="' + translate('elevation', 'nadmořská výška') + '">' + site.altitude + ' ' + translate('masl', 'mnm') + '</span>' : '')
			+ (site.superelevation ? ' (<span title="' + translate('vertical metre', 'převýšení') + '">' + site.superelevation + ' m</span>)' : '')
			+ (site.parkings && site.parkings.length
				? site.parkings.map(parking => ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + parking.latitude + ',' + parking.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('parking', 'parkoviště') + html(parking.name == site.name && site.parkings.length == 1 ? '' : ' ' + parking.name) + '" style="vertical-align: middle;"></a>').join('')
				: ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + site.latitude + ',' + site.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>'
			)
			+ ' <a href="https://mapy.cz/turisticka?source=coor&id=' + site.longitude + ',' + site.latitude + '" target="_blank"><img src="https://mapy.cz/img/favicon/common/plain/favicon-16x16.png" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>'
			+ getLaunchExtra(site)
		;
	});
	const data = forecast && !/FAKE/.test(forecast.header.note) && getForecast(forecast);
	let extra = [];
	if (wind) {
		// TODO: Get the high wind from airData for the other overlays.
		const windHeight = ' ' + (store.get('level') == 'surface' || store.get('overlay') != 'wind' ? translate('on surface', 'na zemi') : translate('at', 'v') + ' ' + store.get('level'));
		extra.push('<a' + getWindAttrs(latLon) + '>'
			+ '<span style="color: ' + colors[getDirIndex(localSites, wind.dir)] + ';" title="' + translate('wind direction', 'směr větru') + windHeight + '">'
			+ '<span style="display: inline-block; transform: rotate(' + wind.dir + 'deg)">↓</span> ' + wind.dir + '°</span>'
			+ ' <span style="color: ' + colors[getSpeedIndex(wind.wind)] + ';" title="' + translate('wind speed', 'rychlost větru') + windHeight + '">' + wind.wind.toFixed(1) + ' m/s'
			+ (data && data.gust != null ? ',</span> <span style="color: ' + colors[getSpeedIndex(data.gust - 4)] + ';" title="' + translate('gusts on surface', 'nárazy na zemi') + '">G: ' + data.gust.toFixed(1) + ' m/s' : '')
			+ '</span></a>');
	}
	if (data) {
		// We don't have data about twilight, use sunrise and sunset instead.
		const sunrise = new Date(forecast.header.sunrise).getHours();
		const sunset = new Date(forecast.header.sunset).getHours();
		const icon = data.icon + (data.hour > sunrise && data.hour <= sunset ? '' : '_night_' + data.moonPhase);
		extra.push('<a' + getForecastAttrs(latLon) + '>'
			+ '<img src="https://www.windy.com/img/icons7/png_25px/' + icon + '.png" style="height: 1.3em; vertical-align: middle;" title="' + translate('weather', 'počasí') + ' ' + model + '"></a>'
			+ (data.mm ? ' <span title="' + translate('precipitation', 'srážky') + '">' + data.mm + ' mm</span>' : '')
		);
	}
	tooltips.push(extra.join(' '));
	extra = [];
	function addLinks(links, title, icon) {
		const meteoLinks = (links || '').matchAll(/(https?:\/\/[^\s,;]+\w)( \([^()]+\))?/g);
		Array.from(meteoLinks).forEach(link => extra.push('<a href="' + html(link[1]) + '" class="iconfont" style="vertical-align: middle;" title="' + title + html(link[2] || '') + '" target="_blank">' + icon + '</a>'));
	}
	addLinks(localSites[0].link_meteo, translate('weather station', 'meteostanice'), '');
	addLinks(localSites[0].link_webcam, translate('webcam', 'webkamera'), 'l');
	let xcontestLink;
	localSites.some(site => xcontestLink = [site.url].concat(site.urls || []).find(url => /xcontest\.org/.test(url))); // flights-search requires login and it can include other sites.
	extra.push('<a href="' + (xcontestLink || 'https://www.xcontest.org/world/en/flights-search/?list[sort]=pts&filter[point]=' + latLon.replace(/(.+) (.+)/, '$2+$1') + '&filter[radius]=2000&filter[date_mode]=period#filter-mode') + '" target="_blank"><img src="https://s.xcontest.org/img/xcontest.gif" width="25" height="12" alt="XContest" style="vertical-align: middle;"></a>' + (localSites[0].flights != null ? ' <span title="' + translate('per year', 'za rok') + '">(' + localSites[0].flights + ' ' + translate('flights', 'letů') + ')</span>,' : ''));
	let s = localSites[0].name;
	if (localSites.length > 1) {
		const words = {};
		for (const site of localSites) {
			site.name.split(/[- ,.]+/).forEach(word => words[word] = (words[word] || 0) + 1);
		}
		const names = Object.keys(words).filter(word => words[word] == localSites.length);
		s = names.length ? names.join(' ') : s;
	}
	const t = store.get('path').replace(/(\d{4})\/?(\d{2})\/?(\d{2})\/?(\d+)/, (match, year, month, day, hour) => year + '-' + month + '-' + day + 'T' + String(Math.round(hour / 3) * 3).padStart(2, 0) + ':00:00Z');
	const [ceiling, cloudBase] = (airData ? computeCeiling(airData) : [0, false]);
	extra.push((cloudBase ? translate('Cloud base', 'Základny') : translate('Cloudless', 'Bezoblačná')) + ':'
		+ ' <a class="climb" href="http://www.xcmeteo.net/?p=' + latLon.replace(/(.+) (.+)/, '$2x$1') + ',t=' + t + ',s=' + encodeURIComponent(s) + '" target="_blank" title="' + (airData ? translate('source', 'zdroj') + ': Windy ' + airData.header.model : '') + '">'
		+ (airData ? Math.round(ceiling / 10) * 10 + ' m' : '-')
		+ '</a>' + (displaySounding ? ' <a href="https://pg.vrana.cz/gfs/#explain" target="_blank"><sup>?</sup></a>' : '')
	);
	tooltips.push(extra.join(' '), '');
	const div = document.createElement('div');
	div.style.whiteSpace = 'nowrap';
	div.innerHTML = tooltips.join('<br>');
	if (airData) {
		if (displaySounding) {
			div.appendChild(showSounding(airData));
		}
		div.querySelector('.climb').onclick = () => {
			displaySounding = !displaySounding;
			markers[latLon].setPopupContent(getTooltip(latLon));
			return false;
		};
	}
	let nextWheelMove = Date.now();
	div.onwheel = event => {
		if (Date.now() > nextWheelMove) {
			store.set('timestamp', store.get('timestamp') + Math.sign(event.deltaY) * 60*60*1000);
			nextWheelMove = Date.now() + 100;
		}
	};
	return div;
}

/** Gets forecast for current time.
 * @param {{data: Object<string, Array<ForecastArray>>}} forecast Loaded forecast.data.
 * @return {?Forecast} Null if there's no forecast.
 */
function getForecast(forecast) {
	let i = 0;
	for (; i < forecast.data.day.length; i++) {
		// Use last non-future forecast (e.g. 21:00 forecast for 23:00 path with 3 hours granularity).
		if (forecast.data.ts[i] > store.get('timestamp')) {
			break;
		}
	}
	const result = {};
	for (let key in forecast.data) {
		result[key] = forecast.data[key][i - 1];
	}
	return (i ? result : null);
}

/** Gets URL with SVG image.
 * @param {Array<Site>} sites
 * @param {Wind} wind
 * @param {Array<string>} colors
 * @return {string}
 */
function getIconUrl(sites, wind, colors = ['lime', 'yellow', 'silver', 'red']) {
	const svg = [];
	const sortOrder = {0: 5, 1: 4, 2: 1, 3: 3, '-1': 2};
	for (const site of sites) {
		for (const [from, to] of (site.wind_usable || [[0, 360]])) {
			const color = getColor([site], wind, colors);
			const circle = (to - from >= 359
				? '<circle cx="19" cy="19" r="18" fill="' + color + '"/>'
				: getCircleSlice(from - 90, to - 90, 38, color)
			) + '\n';
			svg.push([sortOrder[colors.indexOf(color)], circle]);
		}
	}
	svg.sort();
	return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n' + svg.map(x => x[1]).join('') + '<circle cx="19" cy="19" r="18" stroke="#333" stroke-width="2" fill-opacity="0"/>\n</svg>');
}

/** Gets color for wind.
 * @param {Array<Site>} sites
 * @param {Wind} wind
 * @param {Array<string>} colors
 * @return {string}
 */
function getColor(sites, wind, colors = ['lime', 'yellow', 'silver', 'red']) {
	if (sites.every(isSiteForbidden)) {
		return 'black';
	}
	if (!wind) {
		return 'white';
	}
	const dirIndex = getDirIndex(sites, wind.dir);
	return colors[wind.wind < 1 && dirIndex == 3 ? 1 : Math.max(getSpeedIndex(wind.wind), dirIndex)];
}

/** Checks if site forbidden.
 * @param {Site} site
 * @return {boolean}
 */
function isSiteForbidden(site) {
		return (site.flying_status == 4 || site.active == 0);
}

/** Gets color index for wind speed.
 * @param {number} speed
 * @return {int} 0 good, 1 stronger, 3 too strong
 */
function getSpeedIndex(speed) {
	if (speed.toFixed(1) >= 8) { // Round here to not have 7.99 displayed as 8 shown in yellow.
		return 3;
	} else if (speed.toFixed(1) >= 4) {
		return 1;
	}
	return 0;
}

/** Gets color index for wind direction.
 * @param {Array<Site>} sites
 * @param {number} dir
 * @return {int} 0 good, 1 almost, 2 unknown, 3 bad
 */
function getDirIndex(sites, dir) {
	let result = 2;
	for (const site of sites) {
		if (!site.wind_usable) {
			continue;
		} else if (result == 2) {
			result = 3;
		}
		if (isSiteForbidden(site)) {
			continue;
		}
		for (const [from, to] of site.wind_usable) {
			if (isDirIn(dir, from, to)) {
				return 0;
			} else if (isDirIn(dir, from, to, 10)) {
				result = 1;
			}
		}
	}
	return result;
}

/** Checks whether dir is between from and to with tolerance.
 * @param {number} dir Range <0, 360).
 * @param {number} from Range <0, 360).
 * @param {number} to Range <0, 360>.
 * @param {number} tolerance Range <0, 360).
 * @return {boolean}
 */
function isDirIn(dir, from, to, tolerance = 0) {
	to += (to < from ? 360 : 0);
	return (dir >= from - tolerance && dir <= to + tolerance) || dir <= to + tolerance - 360 || dir >= from - tolerance + 360;
}

/** Creates new icon.
 * @param {string} url
 * @param {Site} site
 * @return {L.Icon}
 */
function newIcon(url, site) {
	const zoom = map.getZoom();
	let size = zoom > 9 ? 38 : zoom > 6 ? 19 : zoom > 5 ? 9 : 5;
	const amount = (site[0].flights ?? (site[0].superelevation || 0));
	if (amount < 10) {
		size /= 2;
	} else if (amount < 100) {
		size *= 3/4;
	}
	return L.icon({
		iconUrl: url,
		iconSize: [size, size],
		iconAnchor: [(size - 1) / 2, (size - 1) / 2],
	});
}

/** Gets SVG path for circle slice.
 * @param {number} startAngle
 * @param {number} endAngle
 * @param {number} size
 * @param {string} color
 * @return {string}
 */
function getCircleSlice(startAngle, endAngle, size, color) {
	const hSize = size / 2;
	const x1 = hSize + hSize * Math.cos(Math.PI * startAngle / 180);
	const y1 = hSize + hSize * Math.sin(Math.PI * startAngle / 180);
	const x2 = hSize + hSize * Math.cos(Math.PI * endAngle / 180);
	const y2 = hSize + hSize * Math.sin(Math.PI * endAngle / 180);
	const largeArc = (endAngle - startAngle + 360) % 360 > 180 ? 1 : 0;
	return '<path d="M' + hSize + ',' + hSize + ' L' + x1 + ',' + y1 + ' A' + hSize + ',' + hSize + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + color + '"/>';
}

/** Gets {lat, lon} object.
 * @param {string} latLon Latitude and longitude separated with space.
 * @return {{lat: number, lon: number}}
 */
function getLatLon(latLon) {
	const parts = /(.+) (.+)/.exec(latLon);
	return {lat: +parts[1], lon: +parts[2]};
}

/** Gets key used for winds cache.
 * @param {string} latLon
 * @return {string}
 */
function getWindsKey(latLon) {
	return (store.get('overlay') == 'wind' ? store.get('product') + ':' + store.get('level') : getModel() + ':surface')
		+ ':' + store.get('path')
		+ ':' + latLon
	;
}

function svgLine(svg, coords, stroke, strokeWidth, attributes = {}) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', 'M' + coords.map(coord => coord.join(' ')).join('L'));
	for (const key in attributes) {
		path.setAttribute(key, attributes[key]);
	}
	path.style.stroke = stroke;
	path.style.strokeWidth = strokeWidth;
	path.style.fill = 'none';
	return svg.appendChild(path);
}

function svgText(svg, textContent, x, y, color, attributes = {}) {
	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.textContent = textContent;
	text.setAttribute('x', x);
	text.setAttribute('y', y);
	text.setAttribute('text-anchor', 'middle');
	for (const key in attributes) {
		text.setAttribute(key, attributes[key]);
	}
	text.style.fill = color;
	return svg.appendChild(text);
}

function interpolate(airData, layer, hour, height) {
	const {header, data} = airData;
	let above = {value: Infinity};
	let below = {key: 'surface', value: header.modelElevation};
	for (const key in data) {
		const match = /^gh-(.+)/.exec(key);
		const value = data[key][hour];
		if (match && value) {
			if (value < above.value && value > height) {
				above = {key: match[1], value};
			}
			if (value > below.value && value <= height) {
				below = {key: match[1], value};
			}
		}
	}
	const up = data[layer + '-' + above.key][hour];
	const down = data[layer + '-' + below.key][hour];
	return down + (up - down) / (above.value - below.value) * (height - below.value);
}

function splitWindDir(layers) {
	let prev;
	const segments = [];
	for (const dir of layers.wind_u.map((u, i) => [(180 * Math.atan2(-layers.wind_v[i][0], u[0]) / Math.PI - 90 + 360) % 360, u[1]])) {
		if (prev) {
			if (Math.abs(prev[0] - dir[0]) <= 180) {
				segments.push([prev, dir]);
			} else {
				segments.push([prev, [dir[0] + (prev[0] < dir[0] ? -360 : 360), dir[1]]]);
				segments.push([[prev[0] + (prev[0] < dir[0] ? 360 : -360), prev[1]], dir]);
			}
		}
		prev = dir;
	}
	return segments;
}

/** Shows sounding.
 * @param {AirData} airData
 * @return {Element}
 */
function showSounding(airData) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.width = '435px';
	svg.style.height = '420px';
	svg.style.zoom = '75%';
	for (let i = 0; i <= 400; i += 50) {
		svgLine(svg, [[20, i], [420, i]], '#bbb', .5);
		svgLine(svg, [[20 + i, 0], [20 + i, 400]], '#bbb', .5);
	}
	const {header, data} = airData;
	const hour = getCurrentHour(airData);
	const layers = {temp: [], dewpoint: [], wind_u: [], wind_v: []};
	let maxTemp = -Infinity;
	const zeroK = -273.15;
	const ground = header.modelElevation;
	const ceiling = 4000 + Math.floor(ground / 500) * 500;
	for (const key in data) {
		const match = /^(temp|dewpoint|wind_u|wind_v)-(.+)/.exec(key);
		if (match) {
			const gh = (match[2] == 'surface' ? ground : data['gh-' + match[2]][hour]);
			if (gh >= ground) {
				layers[match[1]].push([data[key][hour], (ceiling - gh) / 10]);
				if (match[1] == 'temp' || match[1] == 'dewpoint') {
					maxTemp = Math.max(5 * Math.ceil((data[key][hour] + zeroK) / 5), maxTemp);
				}
			}
		}
	}
	for (const key in layers) {
		layers[key].sort((a, b) => b[1] - a[1]);
	}
	const groundTemp = layers.temp[0][0];
	const cloudBase = ground + (groundTemp - layers.dewpoint[0][0]) * 122;
	layers.temp = layers.temp.map(a => [420 + (a[0] + zeroK - maxTemp) * 10, a[1]]);
	layers.dewpoint = layers.dewpoint.map(a => [420 + (a[0] + zeroK - maxTemp) * 10, a[1]]);
	const clipPath = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'));
	clipPath.id = 'clip';
	const polygon = clipPath.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'));
	polygon.setAttribute('points', '20,0 420,0 420,400 20,400 20,0');
	const g = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
	g.setAttribute('clip-path', 'url(#clip)');
	const cloudBasePoint = [0, layers.temp[0][1] - (layers.temp[0][0] - layers.dewpoint[0][0]) / (.98 * 4/5)]; // 5 is used by XCMeteo.
	cloudBasePoint[0] = layers.temp[0][0] - (layers.temp[0][1] - cloudBasePoint[1]) * .98;
	svgLine(g, [layers.temp[0], cloudBasePoint], '#db5', 1);
	svgLine(g, [cloudBasePoint, [cloudBasePoint[0] - cloudBasePoint[1] * .98 * .6, 0]], '#db5', 1);
	svgLine(g, [layers.dewpoint[0], cloudBasePoint], '#db5', 1);
	svgLine(g, layers.temp, '#a22', 2);
	svgLine(g, layers.dewpoint, '#23a', 2);
	svgLine(g, layers.wind_u.map((u, i) => [20 + Math.sqrt(Math.pow(u[0], 2) + Math.pow(layers.wind_v[i][0], 2)) * 25, u[1]]), '#293', 1.5);
	for (const segment of splitWindDir(layers)) {
		svgLine(g, segment.map(a => [20 + a[0] / 360 * 400, a[1]]), '#52bea8', 1.5, {'stroke-dasharray': '5 5'});
	}
	svgLine(svg, [[20, 0], [420, 0]], '#555', .5, {'stroke-dasharray': '5 1.5', 'class': 'guideline'}).style.visibility = 'hidden';
	for (let i = Math.ceil(ground / 1000); i <= ceiling / 1000; i++) {
		svgText(svg, i + 'km', 15, 10 + ceiling / 10 - i * 100, '#555'); // Thin space: ' '.
	}
	const xAxis = {};
	for (let i = maxTemp; i >= maxTemp - 20; i -= 5) {
		xAxis[420 - (maxTemp - i) * 10] = {text: i + '°C', color: '#a22'};
	}
	for (let i = 0; i <= 6; i += 2) {
		xAxis[20 + i * 25] = {text: i + 'm/s', color: '#293'};
	}
	const windDir = (180 * Math.atan2(-layers.wind_v[0][0], layers.wind_u[0][0]) / Math.PI - 90 + 360) % 360;
	function drawWindDir(windDir) {
		const x = 20 + windDir * 400 / 360;
		delete xAxis[x];
		svgText(svg, '↓', x, 415, '#52bea8', {transform: 'rotate(' + windDir + ',' + x + ',410)'});
	}
	drawWindDir(Math.floor(windDir / 45) * 45);
	drawWindDir(Math.ceil(windDir / 45) * 45);
	for (const x in xAxis) {
		svgText(svg, xAxis[x].text, x, 415, xAxis[x].color);
	}
	svgText(svg, airData.header.model, 395, 22, '#999');
	svgText(svg, (new Date(data.hours[hour])).getHours() + ':00', 395, 37, '#999');
	svgText(svg, '', 395, 64, '#555', {'class': 'height'});
	svgText(svg, '', 378, 79, '#52bea8', {'class': 'windDir'});
	svgText(svg, '', 385, 79, '#293', {'class': 'windSpeed', 'text-anchor': 'start'});
	svgText(svg, '', 395, 94, '#a22', {'class': 'tempDiff'});
	svg.onmousemove = (event) => {
		const zoom = parseInt(svg.style.zoom) / 100;
		const x = event.offsetX / zoom;
		const y = event.offsetY / zoom;
		if (x >= 20 && x <= 420 && y <= layers.temp[0][1]) {
			const height = ceiling - y * 10;
			svg.querySelector('.height').textContent = Math.round(height / 10) * 10 + 'm';
			svg.querySelector('.windDir').textContent = '↓';
			const u = interpolate(airData, 'wind_u', hour, height);
			const v = interpolate(airData, 'wind_v', hour, height);
			svg.querySelector('.windDir').setAttribute('transform', 'rotate(' + ((180 * Math.atan2(-v, u) / Math.PI - 90 + 360) % 360) + ',378,74)');
			svg.querySelector('.windSpeed').textContent = Math.sqrt(Math.pow(u, 2) + Math.pow(v, 2)).toFixed(1) + 'm/s';
			svg.querySelector('.tempDiff').textContent = 'Δ ' + (groundTemp - (Math.min(cloudBase, height) - ground + Math.max(height - cloudBase, 0) * .6) * .98 / 100 - interpolate(airData, 'temp', hour, height)).toFixed(1) + '°C';
			svg.querySelector('.guideline').style.visibility = 'visible';
			svg.querySelector('.guideline').setAttribute('d', 'M20 ' + y + 'L420 ' + y);
		} else {
			svg.querySelector('.height').textContent = '';
			svg.querySelector('.windDir').textContent = '';
			svg.querySelector('.windSpeed').textContent = '';
			svg.querySelector('.tempDiff').textContent = '';
			svg.querySelector('.guideline').style.visibility = 'hidden';
		}
	};
	return svg;
}

/** Computes ceiling: min(dry abiabat crossing humidity, temperature crossing dry adiabat).
 * @param {AirData} airData
 * @return [number, boolean] [Altitude in meters, is cloud base]
 */
function computeCeiling(airData) {
	const {header, data} = airData;
	const hour = getCurrentHour(airData);
	const elevation = header.modelElevation;
	let dryAdiabatTemp = data['temp-surface'][hour];
	// TODO: This depends on pressure: http://slovnik.cmes.cz/heslo/9
	const cloudBase = elevation + (dryAdiabatTemp - data['dewpoint-surface'][hour]) * 122;
	const layers = {temp: {}, gh: {}};
	for (const key in data) {
		const match = /^(temp|gh)-(\d+)h$/.exec(key);
		if (match) {
			layers[match[1]][match[2]] = data[key][hour];
		}
	}
	let ceiling = elevation;
	let prevTemp = dryAdiabatTemp;
	Object.keys(layers.temp).sort((a, b) => b - a).some(pressure => {
		const gh = layers.gh[pressure];
		if (gh > ceiling) {
			const temp = layers.temp[pressure];
			const height = gh - ceiling;
			if (temp > dryAdiabatTemp - height * .01) {
				// X = -.01 * Y + dryAdiabatTemp
				// X = ((temp - prevTemp) / height) * Y + prevTemp
				// -.01 * Y + dryAdiabatTemp = ((temp - prevTemp) / height) * Y + prevTemp
				// (((temp - prevTemp) / height) + .01) * Y = dryAdiabatTemp - prevTemp
				// Y = (dryAdiabatTemp - prevTemp) / (((temp - prevTemp) / height) + .01)
				ceiling += (dryAdiabatTemp - prevTemp) / (((temp - prevTemp) / height) + .01);
				return true;
			}
			dryAdiabatTemp -= height * .01;
			ceiling = gh;
			prevTemp = temp;
		}
	});
	return [Math.min(ceiling, cloudBase), ceiling > cloudBase];
}

function getCurrentHour(airData) {
	const {data} = airData;
	const now = store.get('timestamp');
	let hour = 0;
	for (const key in data.hours) {
		if (data.hours[key] > now) {
			break;
		}
		hour = key;
	}
	return hour;
}

/** Gets translation.
 * @param {string} english
 * @param {string} czech
 * @return {string}
 */
function translate(english, czech) {
	const lang = store.get('lang');
	return (lang == 'auto' ? store.get('usedLang') : lang) == 'cs' ? czech : english;
}

/** Escapes special HTML characters.
 * @param {string} text
 * @return {string}
 */
function html(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
</script>

<style lang="less">
.onwindy-plugin-pg-mapa { }
#windy-plugin-pg-mapa { }
</style>
