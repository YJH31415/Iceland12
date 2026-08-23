export class MapView{
  constructor(container="map"){
    this.map=new maplibregl.Map({
      container,
      style:{
        version:8,
        sources:{
          osm:{
            type:"raster",
            tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize:256,
            attribution:"© OpenStreetMap contributors"
          },
          ash:{type:"geojson",data:{type:"FeatureCollection",features:[]}}
        },
        layers:[
          {id:"osm",type:"raster",source:"osm"},
          {
            id:"ash",
            type:"circle",
            source:"ash",
            paint:{
              "circle-radius":[
                "interpolate",["linear"],["zoom"],
                2,2,5,4,7,8,9,15
              ],
              "circle-color":[
                "interpolate",["linear"],["get","mass"],
                0,"rgba(255,220,80,0)",
                1e6,"rgba(255,190,40,0.25)",
                1e8,"rgba(255,90,20,0.55)",
                1e9,"rgba(150,20,10,0.85)"
              ],
              "circle-blur":0.45
            }
          }
        ]
      },
      center:[-5,58],
      zoom:4,
      projection:"globe",
      antialias:true
    });
    this.map.addControl(new maplibregl.NavigationControl(),"top-right");
  }

  ready(){
    return new Promise(resolve=>this.map.once("load",resolve));
  }

  update(particles){
    const features=particles.filter(p=>p.alive).map(p=>({
      type:"Feature",
      geometry:{type:"Point",coordinates:[p.longitude,p.latitude]},
      properties:{mass:p.mass,diameter:p.diameter}
    }));
    const source=this.map.getSource("ash");
    if(source) source.setData({type:"FeatureCollection",features});
  }
}
