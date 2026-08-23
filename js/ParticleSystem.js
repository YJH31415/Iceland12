import {advectParticle} from "./Physics.js";

function logNormal(meanMicron,sigma){
  const u=Math.random(),v=Math.random();
  const z=Math.sqrt(-2*Math.log(Math.max(u,1e-12)))*Math.cos(2*Math.PI*v);
  return Math.max(0.5,meanMicron*Math.exp(sigma*z));
}

export class ParticleSystem{
  constructor({maxParticles=30000}={}){
    this.maxParticles=maxParticles;
    this.particles=[];
    this.totalMass=0;
  }

  reset(){
    this.particles=[];
    this.totalMass=0;
  }

  emit(count,time){
    const sourceLat=63.63, sourceLon=-19.62;
    for(let i=0;i<count && this.particles.length<this.maxParticles;i++){
      const diameter=logNormal(35,0.85)*1e-6;
      const density=2300;
      const massPerParticle=2.5e6;
      const angle=Math.random()*Math.PI*2;
      const radius=Math.sqrt(Math.random())*0.08;
      const altitude=Math.max(800,Math.min(6500,
        3300 + 1200*Math.sqrt(-2*Math.log(Math.max(Math.random(),1e-9)))*
        Math.cos(2*Math.PI*Math.random())
      ));
      this.particles.push({
        latitude:sourceLat+radius*Math.cos(angle),
        longitude:sourceLon+radius*Math.sin(angle),
        altitude,
        diameter,
        density,
        mass:massPerParticle,
        age:0,
        alive:true,
        deposited:false,
        lastWind:{u:0,v:0,w:0},
        settling:0
      });
    }
    this.totalMass=this.particles.reduce((a,p)=>a+p.mass,0);
  }

  step(dt,time,weather){
    // 시간당/5분당 분출량을 단순화한 source model
    const emissionRate=900;
    this.emit(Math.max(1,Math.round(emissionRate*dt/3600)),time);

    for(const p of this.particles){
      if(p.alive) advectParticle(p,weather,dt,time);
    }

    // 죽은 입자를 제거하지 않고 일정 시간 후 제거하여 통계/침적을 안정화
    this.particles=this.particles.filter(p=>p.alive || p.age<36*3600);
  }

  getActive(){
    return this.particles.filter(p=>p.alive);
  }

  stats(){
    const active=this.getActive();
    const mass=active.reduce((s,p)=>s+p.mass,0);
    const altitude=active.length?active.reduce((s,p)=>s+p.altitude,0)/active.length:0;
    return {count:active.length,mass,altitude};
  }
}
