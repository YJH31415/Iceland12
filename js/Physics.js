import {moveOnEarth} from "./Coordinate.js";

const G=9.80665;
const R_AIR=287.05;

export function airDensity(temperatureC, pressurePa){
  return pressurePa/(R_AIR*(temperatureC+273.15));
}

export function dynamicViscosity(Tc){
  const T=Tc+273.15;
  const C=110.4, mu0=1.716e-5, T0=273.15;
  return mu0*Math.pow(T/T0,1.5)*(T0+C)/(T+C);
}

export function settlingVelocity(diameter, particleDensity, temperatureC=0, pressurePa=70000){
  const rho=airDensity(temperatureC,pressurePa);
  const mu=dynamicViscosity(temperatureC);
  const d=diameter;
  let vt=(particleDensity-rho)*G*d*d/(18*mu);
  for(let k=0;k<8;k++){
    const Re=Math.max(1e-12,rho*Math.abs(vt)*d/mu);
    let Cd;
    if(Re<1000) Cd=24/Re*(1+0.15*Math.pow(Re,0.687));
    else Cd=0.44;
    const area=Math.PI*d*d/4;
    const target=Math.sqrt((4*d*(particleDensity-rho)*G)/(3*Cd*rho));
    vt=0.5*vt+0.5*target;
  }
  return Math.max(0,Math.min(vt,8));
}

export function gaussian(){
  let u=0,v=0;
  while(u===0)u=Math.random();
  while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

export function advectParticle(p,weather,dt,time){
  const s=weather.sample(p.latitude,p.longitude,p.altitude,time);
  const vt=settlingVelocity(p.diameter,p.density,0,70000);
  const Kxy=30 + 0.02*Math.max(p.altitude,0); // m²/s, tunable effective diffusivity
  const sigma=Math.sqrt(2*Kxy*dt);
  const east=s.u + sigma*gaussian()/dt;
  const north=s.v + sigma*gaussian()/dt;
  const vertical=s.w - vt + Math.sqrt(2*8*dt)*gaussian()/dt;

  const next=moveOnEarth(
    p.latitude,p.longitude,p.altitude,
    east,north,vertical,dt
  );
  p.latitude=next.latitude;
  p.longitude=next.longitude;
  p.altitude=next.altitude;
  p.age+=dt;
  p.lastWind={u:s.u,v:s.v,w:s.w};
  p.settling=vt;

  // 지표면 도달 시 침적
  if(p.altitude<=0){
    p.altitude=0;
    p.alive=false;
    p.deposited=true;
  }
}
