### Windy plugin for paragliding takeoffs

![Screenshot](src/screenshot.png)

Navigate to https://www.windy.com/plugins, find **Paragliding Mapa** and click _Open plugin_.
Next time in the same browser, you can go to https://www.windy.com/plugin/pgmapa.

This plugin displays paragliding takeoffs from these sources:

- https://www.paragliding-mapa.cz/
- https://www.dhv.de/db3/gelaende/
- https://paraglidingearth.com/
- https://www.xcontest.org/

It highlights takeoffs with usable wind direction. Colors:

- **green**: matching wind direction and wind under 4 m/s
- **yellow**: almost matching direction (tolerance ±10°) or wind 4-8 m/s or wind under 1 m/s from any direction
- **silver**: takeoff orientation unknown, wind speed 0-8 m/s
- **red**: wrong direction or wind over 8 m/s
- **black**: takeoff forbidden for legal reasons
- **white**: wind data not loaded

Other data (such as rain or gusts) is not taken into account.

## Development

- `npm start`
- https://www.windy.com/dev
- https://github.com/vrana/windy-plugin-pg-mapa/actions/workflows/publish-plugin.yml
