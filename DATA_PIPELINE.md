# Data pipeline

1. The user clicks **API 데이터 불러오기**.
2. The browser makes one Open-Meteo Historical Weather API request for a regular Europe/Iceland air-domain grid.
3. The request uses 2020-04-14 through 2020-04-20 ERA5 data.
4. Surface/near-surface wind, temperature, humidity, pressure and boundary-layer height are returned.
5. No API requests are made per particle or per simulation timestep. All interpolation is local in `WeatherGrid.js`.
6. London, Paris and Frankfurt warnings are calculated from local simulated ash surface loading.

## Important scientific limitation
Open-Meteo's 1940+ Historical Weather API exposes the 2020 ERA5 archive, but its documented historical endpoint does not provide the full pressure-level wind fields needed for a true 3-D upper-air reconstruction. Pressure-level fields are documented in the Historical Forecast API, whose archive starts around 2021. Therefore this version uses the 2020 ERA5 historical archive's surface/100 m wind fields and applies a simple vertical wind profile for the ash model. This must be described as a proxy meteorological field, not the actual 2010 upper-air field.
