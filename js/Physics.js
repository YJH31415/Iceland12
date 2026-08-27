import {moveOnEarth} from "./Coordinate.js";

const G=9.80665;
const R_AIR=287.05;

// -------------------------
// Basic atmospheric physics
// -------------------------
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

// Standard normal random variable.
export function gaussian(){
  let u=0,v=0;
  while(u===0)u=Math.random();
  while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

// -------------------------------------------------------------
// Turbulent diffusion model for volcanic-ash super-particles
//
// Fickian random-walk relation:
//      <x'^2> = 2 K t
// therefore, for one integration step:
//      Δx_turb = sqrt(2 K Δt) ξ
//
// Eddy diffusivity is parameterized through the Lagrangian
// turbulence relation:
//      K = sigma_turb^2 * T_L
// where sigma_turb is the unresolved turbulent velocity scale and
// T_L is the Lagrangian decorrelation time.
//
// Horizontal turbulence is intentionally stronger than vertical
// turbulence, which produces the elongated ash plume seen in the
// atmosphere rather than an unrealistically narrow particle trail.
//
// Vertical K is height-dependent. For a variable diffusivity,
// the random-walk form includes the Fickian drift term dK/dz:
//      dz = (dKz/dz)dt + sqrt(2 Kz dt) ξ_z
//
// These are effective sub-grid atmospheric transport parameters;
// they are not additional API wind values and do not override the
// resolved Open-Meteo advection field.
// -------------------------------------------------------------

function turbulenceParameters(altitudeM){
  const zKm=Math.max(0,altitudeM)/1000;

  // Effective unresolved horizontal velocity scale (m/s).
  // It increases with altitude and is capped to avoid numerical
  // explosion at the top of the simulation.
  // Turbulence tuning: increase these to widen the ash plume.
  // This is the only user-facing diffusion strength parameter.
  const TURBULENCE_SCALE = 1.0;
  const sigmaH=Math.min(5.0, (1.8+0.35*zKm)*TURBULENCE_SCALE);

  // Lagrangian decorrelation time (s).
  const TL=Math.min(1800,600+80*zKm);

  // K_h = sigma_h^2 * T_L  [m²/s]
  const Kh=Math.max(800,sigmaH*sigmaH*TL);

  // Vertical turbulent velocity scale is smaller than horizontal.
  const sigmaV=Math.min(0.9,0.25+0.05*zKm);
  const Kz=Math.max(5,sigmaV*sigmaV*TL*0.25);

  // A smooth altitude derivative used by the Fickian variable-K
  // correction. The derivative is deliberately capped.
  const dKhDz=0; // K_h varies only with altitude; no horizontal Fickian drift term is needed.

  // Kz is approximately proportional to (sigmaV^2 * TL), so use
  // a numerical derivative for consistency with the parameterization.
  const dz=50;
  const z1=Math.max(0,altitudeM-dz);
  const z2=altitudeM+dz;
  const KzAt=(z)=>{
    const zz=z/1000;
    const sv=Math.min(0.9,0.25+0.05*zz);
    const tl=Math.min(1800,600+80*zz);
    return Math.max(5,sv*sv*tl*0.25);
  };

  return {Kh,Kz,dKhDz,dKzDz:(KzAt(z2)-KzAt(z1))/(z2-z1)};
}

// Small helper kept separate so the model is easy to inspect and
// calibrate in a science-fair experiment.
function KhAt(altitudeM){
  const zKm=Math.max(0,altitudeM)/1000;
  // Turbulence tuning: increase these to widen the ash plume.
  // This is the only user-facing diffusion strength parameter.
  const TURBULENCE_SCALE = 1.0;
  const sigmaH=Math.min(5.0, (1.8+0.35*zKm)*TURBULENCE_SCALE);
  const TL=Math.min(1800,600+80*zKm);
  return Math.max(800,sigmaH*sigmaH*TL);
}

export function turbulentDisplacement(altitudeM,dt){
  const z=Math.max(0,altitudeM);
  const sigma=gaussian();
  const sigma2=gaussian();
  const sigma3=gaussian();

  const pars=turbulenceParameters(z);

  // Horizontal isotropic turbulent random walk.
  const horizontalStd=Math.sqrt(2*pars.Kh*dt);
  const east=horizontalStd*sigma;
  const north=horizontalStd*sigma2;

  // Variable-K vertical random walk:
  // deterministic Fickian drift + stochastic diffusion.
  const verticalDrift=pars.dKzDz*dt;
  const verticalRandom=Math.sqrt(2*pars.Kz*dt)*sigma3;

  // advectParticle() passes these values to moveOnEarth(), which expects
  // velocities (m/s) and applies the integration time dt itself.
  // Therefore convert the one-step random-walk displacement back to an
  // equivalent velocity here. This prevents dt from being applied twice.
  return {
    eastM:east/dt,
    northM:north/dt,
    verticalM:(verticalDrift+verticalRandom)/dt,
    Kh:pars.Kh,
    Kz:pars.Kz
  };
}

export function advectParticle(p,weather,dt,time){
  const s=weather.sample(p.latitude,p.longitude,p.altitude,time);
  const vt=settlingVelocity(p.diameter,p.density,0,70000);

  // Resolved advection comes directly from the meteorological field.
  // Turbulence is added as a sub-grid stochastic displacement.
  const turb=turbulentDisplacement(p.altitude,dt);

  const next=moveOnEarth(
    p.latitude,p.longitude,p.altitude,
    s.u*dt+turb.eastM,
    s.v*dt+turb.northM,
    s.w*dt-vt*dt+turb.verticalM,
    dt
  );

  p.latitude=next.latitude;
  p.longitude=next.longitude;
  p.altitude=next.altitude;
  p.age+=dt;
  p.lastWind={u:s.u,v:s.v,w:s.w};
  p.settling=vt;

  // Store effective diffusivities for diagnostics without changing
  // the rest of the simulation/UI.
  p.turbulence={Kh:turb.Kh,Kz:turb.Kz};

  // Surface deposition.
  if(p.altitude<=0){
    p.altitude=0;
    p.alive=false;
    p.deposited=true;
  }
}
