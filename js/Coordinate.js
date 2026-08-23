const R = 6371008.8;

export function degToRad(x){ return x*Math.PI/180; }
export function radToDeg(x){ return x*180/Math.PI; }

export function moveOnEarth(lat, lon, altitude, east, north, vertical, dt){
  const phi = degToRad(lat);
  const dLat = north * dt / R;
  const cosPhi = Math.max(Math.cos(phi), 1e-8);
  const dLon = east * dt / (R * cosPhi);
  return {
    latitude: lat + radToDeg(dLat),
    longitude: ((lon + radToDeg(dLon) + 540) % 360) - 180,
    altitude: Math.max(0, altitude + vertical * dt)
  };
}

export function metersPerDegreeLon(lat){
  return R*Math.cos(degToRad(lat))*Math.PI/180;
}
export function metersPerDegreeLat(){
  return R*Math.PI/180;
}
