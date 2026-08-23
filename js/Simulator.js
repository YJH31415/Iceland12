import {ConcentrationField} from "./Concentration.js";
export class Simulator{
  constructor({particles,weather,map,onStats,onAlerts}){this.particles=particles;this.weather=weather;this.map=map;this.onStats=onStats;this.onAlerts=onAlerts;this.concentration=new ConcentrationField();this.running=false;this.speed=600;this.dt=300;this.time=Date.parse("2010-04-14T00:00:00Z")/1000;this.lastReal=performance.now();this.accum=0;this.frame=this.frame.bind(this);}
  start(){if(this.running)return;this.running=true;this.lastReal=performance.now();requestAnimationFrame(this.frame);}
  pause(){this.running=false;}
  reset(){this.running=false;this.time=Date.parse("2010-04-14T00:00:00Z")/1000;this.particles.reset();this.concentration.clear();this.map.update([]);this.updateUI();}
  frame(now){if(!this.running)return;const realDelta=Math.min(.25,(now-this.lastReal)/1000);this.lastReal=now;this.accum+=realDelta*this.speed;while(this.accum>=this.dt){this.particles.step(this.dt,this.time,this.weather);this.time+=this.dt;this.accum-=this.dt;}this.map.update(this.particles.particles);this.updateUI();requestAnimationFrame(this.frame);}
  updateUI(){const d=new Date(this.time*1000),s=d.toISOString().replace("T"," ").replace(".000Z"," UTC"),st=this.particles.stats();this.concentration.accumulate(this.particles.particles);const alerts={london:this.concentration.sampleCity(51.5074,-0.1278),paris:this.concentration.sampleCity(48.8566,2.3522),frankfurt:this.concentration.sampleCity(50.1109,8.6821)};this.onStats?.({time:s,...st});this.onAlerts?.(alerts);}
}
