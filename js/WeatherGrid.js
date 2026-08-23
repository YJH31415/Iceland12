export class WeatherGrid {
  constructor(){this.ready=false;this.times=[];this.latitudes=[];this.longitudes=[];this.levels=[];this.source="";this.dataStart=0;}
  load(d){
    this.times=d.times||[]; this.dataStart=this.times[0]||0; this.latitudes=d.latitudes||[]; this.longitudes=d.longitudes||[]; this.levels=d.levels||[]; this.source=d.source||"";
    this.ready=this.times.length>0&&this.latitudes.length>1&&this.longitudes.length>1;
  }
  bracket(a,x){
    if(x<=a[0]) return {i:0,j:0,f:0};
    if(x>=a[a.length-1]) return {i:a.length-1,j:a.length-1,f:0};
    let lo=0,hi=a.length-1; while(hi-lo>1){const m=(lo+hi)>>1;if(a[m]<=x)lo=m;else hi=m;}
    return {i:lo,j:hi,f:(x-a[lo])/(a[hi]-a[lo])};
  }
  flat(ti,yi,xi){return (ti*this.latitudes.length+yi)*this.longitudes.length+xi;}
  interp(arr,ti,la,lo){
    const q=(y,x)=>arr[this.flat(ti,y,x)];
    const a=q(la.i,lo.i),b=q(la.i,lo.j),c=q(la.j,lo.i),d=q(la.j,lo.j);
    const ab=a+(b-a)*lo.f, cd=c+(d-c)*lo.f; return ab+(cd-ab)*la.f;
  }
  sample(lat,lon,altitude,time){
    if(!this.ready) return {u:15,v:3,w:0};
    // Simulation clock is 2010; weather dataset is 2020. Map elapsed simulation time onto the 2020 dataset.
    const simStart=Date.parse("2010-04-14T00:00:00Z")/1000;
    const weatherTime=this.dataStart + Math.max(0, time-simStart);
    const ti=this.bracket(this.times,weatherTime),la=this.bracket(this.latitudes,lat),lo=this.bracket(this.longitudes,lon);
    const sampleTime=k=>{
      const vals=this.levels.map((L,i)=>{
        const speed=this.interp(L.speed,k,la,lo), dir=this.interp(L.direction,k,la,lo);
        // Meteorological direction is where wind comes from. Convert to motion vector.
        const rad=dir*Math.PI/180;
        return {h:typeof L.height==="function"?L.height(i):L.height,u:-speed*Math.sin(rad),v:-speed*Math.cos(rad),w:0};
      }).sort((a,b)=>a.h-b.h);
      if(altitude<=vals[0].h)return vals[0]; if(altitude>=vals.at(-1).h)return vals.at(-1);
      for(let i=0;i<vals.length-1;i++){
        const a=vals[i],b=vals[i+1]; if(altitude>=a.h&&altitude<=b.h){const f=(altitude-a.h)/Math.max(1,b.h-a.h);return {u:a.u+(b.u-a.u)*f,v:a.v+(b.v-a.v)*f,w:a.w+(b.w-a.w)*f};}
      }
      return vals.at(-1);
    };
    const A=sampleTime(ti.i),B=sampleTime(ti.j);
    return {u:A.u+(B.u-A.u)*ti.f,v:A.v+(B.v-A.v)*ti.f,w:A.w+(B.w-A.w)*ti.f};
  }
}
