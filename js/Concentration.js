export class ConcentrationField{
  constructor(){this.cells=new Map();this.cellDeg=0.5;}
  clear(){this.cells.clear();}
  accumulate(particles){
    this.clear(); const d=this.cellDeg;
    for(const p of particles){if(!p.alive)continue;const lat=Math.floor(p.latitude/d)*d+d/2,lon=Math.floor(p.longitude/d)*d+d/2;const key=`${lat.toFixed(3)},${lon.toFixed(3)}`;const c=this.cells.get(key)||{latitude:lat,longitude:lon,mass:0};c.mass+=p.mass;this.cells.set(key,c);}
    for(const c of this.cells.values()){
      const h=111320*d, w=h*Math.cos(c.latitude*Math.PI/180); c.area=Math.max(1,h*w); c.surfaceLoading=c.mass/c.area; // kg/m²
    }
  }
  sampleCity(lat,lon,radiusKm=60){
    let mass=0,area=0;
    for(const c of this.cells.values()){
      const dy=(c.latitude-lat)*111.32,dx=(c.longitude-lon)*111.32*Math.cos(lat*Math.PI/180);
      if(Math.hypot(dx,dy)<=radiusKm){mass+=c.mass;area+=c.area;}
    }
    const loading=area?mass/area:0;
    let level="GREEN"; if(loading>=0.05)level="RED"; else if(loading>=0.01)level="ORANGE"; else if(loading>=0.001)level="YELLOW";
    return {mass,area,loading,level};
  }
  features(){return [...this.cells.values()].map(c=>({type:"Feature",geometry:{type:"Point",coordinates:[c.longitude,c.latitude]},properties:{mass:c.mass,surfaceLoading:c.surfaceLoading}}));}
}
