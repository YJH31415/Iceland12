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

/*
 * Lagrangian turbulent-diffusion parameterisation.
 *
 * Fickian turbulent diffusion is represented by the stochastic term
 *     dX = U dt + sqrt(2 K_h dt) dW
 *     dZ = W dt + sqrt(2 K_v dt) dW_z
 * where K is an eddy diffusivity [m^2/s].
 *
 * We estimate K_h from the standard mixing relation
 *     K_h = sigma_u^2 T_L
 * with sigma_u = I_h |U| and T_L = L/sigma_u, giving
 *     K_h = I_h |U| L.
 *
 * I_h is a dimensionless horizontal turbulence intensity and L is a
 * Lagrangian mixing length. They are bounded so the numerical random walk
 * cannot explode during a 5-minute integration step.
 *
 * This is an effective sub-grid parameterisation, not measured turbulence.
 */
export function turbulentDiffusivity(altitude, u, v){
  const speed=Math.max(1,Math.hypot(u,v));
  const z=Math.max(0,altitude);

  // Neutral/free-tropospheric effective turbulence intensity.
  // The intensity decreases mildly with height, while retaining enough
  // unresolved mixing to represent a regional volcanic-ash plume.
  const intensity=Math.max(0.12,Math.min(0.25,0.25-0.000008*z));

  // Lagrangian mixing length. It grows with altitude but is bounded to keep
  // the stochastic step physically/numerically reasonable.
  const L=Math.max(200,Math.min(800,0.05*Math.max(z,4000)));

  const Kh=Math.max(50,Math.min(1200,intensity*speed*L));

  // Vertical mixing is weaker than horizontal mixing.
  const Kv=Math.max(0.5,Math.min(80,0.08*Kh));
  return {Kh,Kv,intensity,mixingLength:L};
}

export function advectParticle(p,weather,dt,time){
  const s=weather.sample(p.latitude,p.longitude,p.altitude,time);
  const vt=settlingVelocity(p.diameter,p.density,0,70000);

  const {Kh,Kv}=turbulentDiffusivity(p.altitude,s.u,s.v);

  // Euler-Maruyama random walk for the advection-diffusion equation:
  // displacement = deterministic wind advection + sqrt(2*K*dt)*N(0,1).
  const east=s.u*dt + Math.sqrt(2*Kh*dt)*gaussian();
  const north=s.v*dt + Math.sqrt(2*Kh*dt)*gaussian();
  const vertical=(s.w-vt)*dt + Math.sqrt(2*Kv*dt)*gaussian();

  const next=moveOnEarth(
    p.latitude,p.longitude,p.altitude,
    east,north,vertical,1
  );
  p.latitude=next.latitude;
  p.longitude=next.longitude;
  p.altitude=next.altitude;
  p.age+=dt;
  p.lastWind={u:s.u,v:s.v,w:s.w};
  p.settling=vt;
  p.turbulence={Kh,Kv};

  if(p.altitude<=0){
    p.altitude=0;
    p.alive=false;
    p.deposited=true;
  }
}
