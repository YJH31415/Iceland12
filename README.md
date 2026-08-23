# Eyjafjallajökull 2010 화산재 확산 시뮬레이터

## 실행
정적 파일이므로 `file://`로 직접 열지 말고 로컬 서버를 사용하세요.

```bash
python -m http.server 8000
```

그 다음 `http://localhost:8000` 접속.

## 핵심 모델
- Lagrangian super-particle
- 3-D weather interpolation 인터페이스
- 지구 곡률을 고려한 lat/lon 이동
- 바람에 의한 advection
- 입자 크기별 terminal settling velocity
- Reynolds number에 따른 drag coefficient
- stochastic turbulent diffusion
- 지표면 침적
- 질량 기반 농도 표현
- MapLibre GL JS globe + WebGL 렌더링

## 중요한 데이터 주의사항
Open-Meteo Historical Weather API의 ERA5 archive는 1940년부터 제공하지만, 현재 문서의 Historical Weather API 표면 hourly 변수에는 10 m/100 m 바람이 명시되어 있습니다.
반면 Open-Meteo Historical Forecast/모델 API 문서에는 pressure-level wind, geopotential height 등이 명시되어 있습니다.

따라서 2010년의 `위도·경도·고도별` 바람을 엄밀하게 사용하려면 `WeatherGrid`에 별도의 3-D pressure-level dataset을 공급하는 것이 필요합니다.
이 프로젝트는 데이터 공급자를 `WeatherGrid.sample(lat,lon,altitude,time)`으로 추상화하여, 물리 엔진을 바꾸지 않고 데이터 소스를 교체할 수 있게 만들었습니다.

## Production 데이터 포맷
`data/weather.json` 예:

```json
{
  "times": [1271203200, 1271206800],
  "latitudes": [50,50.25,50.5],
  "longitudes": [-25,-24.75,-24.5],
  "levels": [
    {
      "pressure": 850,
      "height": [1500,1501,1502,1503,1504,1505],
      "u": [20,20,21,21,22,22],
      "v": [5,5,6,6,7,7],
      "w": [0,0,0,0,0,0]
    }
  ]
}
```

실제 서비스에서는 JSON 대신 Float32Array/ArrayBuffer를 권장합니다.

## 다음 고도화
1. 실제 2010 pressure-level dataset 전처리
2. 시간축 보간
3. 습식 침적
4. 입자 크기 bin과 응집(coagulation)
5. WebGL instanced particle renderer
6. 항공 위험도용 ash concentration contour


## 실제 데이터의 근거

Copernicus CDS ERA5 pressure-level dataset:
https://cds.climate.copernicus.eu/datasets/reanalysis-era5-pressure-levels

Open-Meteo Historical Weather API:
https://open-meteo.com/en/docs/historical-weather-api

Open-Meteo Historical Forecast API:
https://open-meteo.com/en/docs/historical-forecast-api
