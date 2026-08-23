import {MapView} from "./MapView.js";
import {WeatherGrid} from "./WeatherGrid.js";
import {ParticleSystem} from "./ParticleSystem.js";
import {Simulator} from "./Simulator.js";
import {fetchEuropeWeather} from "./OpenMeteoLoader.js";

const map=new MapView("map");
const weather=new WeatherGrid();
const particles=new ParticleSystem({maxParticles:30000});
await map.ready();

const status=document.querySelector("#api-status");
const button=document.querySelector("#load-api");
let loaded=false;
button.onclick=async()=>{
  if(loaded)return;
  button.disabled=true; status.textContent="Open-Meteo API 요청 중…";
  try{
    const data=await fetchEuropeWeather(msg=>status.textContent=msg);
    weather.load(data); loaded=true; button.textContent="✓ API 데이터 불러옴"; status.textContent=`2020-04-14~20 · 유럽 ${data.metadata.locations.toLocaleString()}개 격자 · ${data.metadata.nTime}시간`;
  }catch(e){console.error(e);status.textContent=`API 오류: ${e.message}`;button.disabled=false;}
};

const sim=new Simulator({particles,weather,map,
  onStats:s=>{document.querySelector("#sim-time").textContent=s.time;document.querySelector("#particle-count").textContent=s.count.toLocaleString();document.querySelector("#mass").textContent=s.mass.toExponential(2);document.querySelector("#altitude").textContent=Math.round(s.altitude).toLocaleString();},
  onAlerts:a=>{for(const [id,v] of Object.entries({london:a.london,paris:a.paris,frankfurt:a.frankfurt})){const el=document.querySelector(`#alert-${id}`);el.textContent=`${v.level} · ${(v.loading*1000).toFixed(3)} g/m²`;el.dataset.level=v.level;}}
});

document.querySelector("#play").onclick=()=>sim.start();
document.querySelector("#pause").onclick=()=>sim.pause();
document.querySelector("#reset").onclick=()=>sim.reset();
document.querySelector("#speed").onchange=e=>sim.speed=Number(e.target.value);
document.querySelector("#dt").onchange=e=>sim.dt=Number(e.target.value);
sim.updateUI();
