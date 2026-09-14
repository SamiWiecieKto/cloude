"""Merge OSM relation members from API full.json files into closed polygons."""
from pathlib import Path
import json,sys
from shapely.geometry import LineString,box
from shapely.ops import polygonize,unary_union
src=Path(sys.argv[1]);water=[];buildings=json.loads((src/'warsaw-buildings-osm.json').read_text())['elements']
for p in list(src.glob('vistula-*.json'))+list(src.glob('landmark-*.json')):
 data=json.loads(p.read_text())['elements'];nodes={e['id']:e for e in data if e['type']=='node'};ways={e['id']:e['nodes'] for e in data if e['type']=='way'}
 for rel in [e for e in data if e['type']=='relation' and e.get('tags',{}).get('type')=='multipolygon']:
  lines=[LineString([(nodes[n]['lon'],nodes[n]['lat']) for n in ways[m['ref']]]) for m in rel['members'] if m.get('role')=='outer' and m['ref'] in ways]
  shape=unary_union(list(polygonize(lines))).intersection(box(20.965,52.194,21.097,52.275))
  if shape.is_empty:continue
  polys=[shape] if shape.geom_type=='Polygon' else list(shape.geoms)
  target=buildings if 'building' in rel.get('tags',{}) else water
  for i,poly in enumerate(polys):target.append({'id':rel['id']*100+i,'type':'way','tags':rel['tags'],'geometry':[{'lon':x,'lat':y} for x,y in poly.exterior.coords]})
(src/'warsaw-water-osm.json').write_text(json.dumps({'elements':water}));(src/'warsaw-buildings-osm.json').write_text(json.dumps({'elements':{e['id']:e for e in buildings}.values()},default=list))
