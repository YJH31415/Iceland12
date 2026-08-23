"""
Convert downloaded ERA5 pressure-level NetCDF into the simulator's
lat/lon/time/height grid.

Requirements:
  pip install xarray netcdf4 numpy

The output is JSON for transparency/debugging. For a large production run,
replace the final JSON writer with chunked Float32Array/ArrayBuffer files.
"""
import json, sys
from pathlib import Path
import numpy as np
import xarray as xr

SRC=Path(sys.argv[1] if len(sys.argv)>1 else "data/raw/era5_2010-04-14_20.nc")
DST=Path(sys.argv[2] if len(sys.argv)>2 else "data/weather.json")

ds=xr.open_dataset(SRC)

# Normalize coordinate names
rename={}
for a,b in [("valid_time","time"),("latitude","latitude"),("longitude","longitude"),("pressure_level","level")]:
    if a in ds.coords and a!=b: rename[a]=b
ds=ds.rename(rename)

# ERA5 may have descending latitude. Sort it.
if "latitude" in ds.coords:
    ds=ds.sortby("latitude")
if "longitude" in ds.coords:
    ds=ds.sortby("longitude")

def var(*names):
    for n in names:
        if n in ds: return ds[n]
    raise KeyError(names)

z=var("z")
u=var("u")
v=var("v")
w=var("w")
t=var("t")

# Geopotential z [m2/s2] -> geopotential height [m].
g=9.80665
height=z/g

times=[int(x.astype("datetime64[s]").astype(np.int64)) for x in ds.time.values]
lats=ds.latitude.values.astype(float).tolist()
lons=ds.longitude.values.astype(float).tolist()

levels=[]
for lev in ds.level.values:
    sub=lambda x: np.asarray(x.sel(level=lev).values,dtype=np.float32)
    # Expected dimension order time,lat,lon.
    levels.append({
        "pressure":float(lev),
        "height":sub(height).reshape(-1).tolist(),
        "u":sub(u).reshape(-1).tolist(),
        "v":sub(v).reshape(-1).tolist(),
        "w":sub(w).reshape(-1).tolist(),
    })

out={"times":times,"latitudes":lats,"longitudes":lons,"levels":levels}
DST.parent.mkdir(parents=True,exist_ok=True)
DST.write_text(json.dumps(out,separators=(",",":")),encoding="utf-8")
print("Wrote",DST)
