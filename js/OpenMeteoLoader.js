const API = "https://archive-api.open-meteo.com/v1/archive";

// Europe air-domain: includes Iceland and surrounding ocean cells.
// A 2° grid keeps the single HTTP request small enough for a browser.
export const EUROPE_DOMAIN = {
  latMin: 34, latMax: 72,
  lonMin: -26, lonMax: 45,
  step: 2
};

const DAYS = 7;
const START = "2020-04-14";
const END = "2020-04-20";

function buildGrid(){
  const latitudes=[], longitudes=[];
  for(let lat=EUROPE_DOMAIN.latMin;lat<=EUROPE_DOMAIN.latMax+1e-9;lat+=EUROPE_DOMAIN.step) latitudes.push(Number(lat.toFixed(2)));
  for(let lon=EUROPE_DOMAIN.lonMin;lon<=EUROPE_DOMAIN.lonMax+1e-9;lon+=EUROPE_DOMAIN.step) longitudes.push(Number(lon.toFixed(2)));
  const lat=[],lon=[];
  for(const y of latitudes) for(const x of longitudes){lat.push(y);lon.push(x);}
  return {latitudes,longitudes,lat,lon};
}

export function buildApiUrl(){
  const g=buildGrid();
  const hourly=[
    "wind_speed_10m","wind_direction_10m",
    "wind_speed_100m","wind_direction_100m",
    "temperature_2m","relative_humidity_2m",
    "surface_pressure","boundary_layer_height"
  ].join(",");
  const q=new URLSearchParams({
    latitude:g.lat.join(","), longitude:g.lon.join(","),
    start_date:START,end_date:END,
    hourly, wind_speed_unit:"ms", timezone:"GMT", cell_selection:"nearest"
  });
  return `${API}?${q}`;
}

export async function fetchEuropeWeather(onProgress=()=>{}){
  const g=buildGrid();
  onProgress(`유럽 격자 ${g.lat.length.toLocaleString()}개 지점 요청 중…`);
  const url=buildApiUrl();
  const r=await fetch(url);
  if(!r.ok){
    const text=await r.text().catch(()=>"");
    throw new Error(`Open-Meteo ${r.status}: ${text.slice(0,300)}`);
  }
  const raw=await r.json();
  const rows=Array.isArray(raw)?raw:[raw];
  if(rows.length!==g.lat.length) throw new Error(`응답 위치 수 불일치: ${rows.length}/${g.lat.length}`);

  const times=rows[0]?.hourly?.time||[];
  const timeSeconds=times.map(t=>Date.parse(t)/1000);
  const latitudes=g.latitudes, longitudes=g.longitudes;
  const nLat=latitudes.length,nLon=longitudes.length,nTime=times.length;
  const idx=(t,y,x)=>(t*nLat+y)*nLon+x;
  const fields=(name)=>new Float32Array(nTime*nLat*nLon);
  const speed10=fields(),dir10=fields(),speed100=fields(),dir100=fields(),temp=fields(),rh=fields(),pressure=fields(),pbl=fields();

  for(let i=0;i<rows.length;i++){
    const y=Math.floor(i/nLon),x=i%nLon,h=rows[i].hourly;
    for(let t=0;t<nTime;t++){
      const k=idx(t,y,x);
      speed10[k]=h.wind_speed_10m?.[t]??0;
      dir10[k]=h.wind_direction_10m?.[t]??0;
      speed100[k]=h.wind_speed_100m?.[t]??speed10[k];
      dir100[k]=h.wind_direction_100m?.[t]??dir10[k];
      temp[k]=h.temperature_2m?.[t]??0;
      rh[k]=h.relative_humidity_2m?.[t]??70;
      pressure[k]=h.surface_pressure?.[t]??1013;
      pbl[k]=h.boundary_layer_height?.[t]??1000;
    }
  }

  onProgress(`API 데이터 수신 완료 · ${nTime}시간 × ${g.lat.length.toLocaleString()}지점`);
  return {
    source:"Open-Meteo Historical Weather API / ERA5",
    start:START,end:END,
    times:timeSeconds,latitudes,longitudes,
    levels:[
      {pressure:1000,height:()=>0,speed:speed10,direction:dir10,temp,rh,pressure,pbl},
      {pressure:900,height:()=>1000,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:850,height:()=>1500,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:700,height:()=>3000,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:600,height:()=>4200,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:500,height:()=>5600,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:400,height:()=>7200,speed:speed100,direction:dir100,temp,rh,pressure,pbl},
      {pressure:300,height:()=>9200,speed:speed100,direction:dir100,temp,rh,pressure,pbl}
    ],
    surface:{speed:speed10,direction:dir10,temp,rh,pressure,pbl},
    metadata:{gridStep:EUROPE_DOMAIN.step,locations:g.lat.length,nTime,nLat,nLon}
  };
}
