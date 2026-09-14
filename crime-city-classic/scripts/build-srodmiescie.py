"""Compile the OSM snapshot to compact game data. Coordinates retain local metric proportions.
Usage: python scripts/build-srodmiescie.py /path/to/downloads
Source files are Overpass JSON named warsaw-{roads,extra,buildings,water,parks}-osm.json.
The generated database is ODbL 1.0, independent of the game source license.
"""
import json,sys,math
from pathlib import Path
src=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]
def read(name):
 p=src/('warsaw-'+name+'-osm.json')
 return json.loads(p.read_text()).get('elements',[]) if p.exists() else []
def xy(p):return [round((p['lon']-20.965)*68000),round((52.275-p['lat'])*111200)]
def geom(e):return [xy(p) for p in e.get('geometry',[]) if 'lon' in p]
def valid(p):return 60<p[0]<8940 and 60<p[1]<8940
roads=[]
for e in {e['id']:e for e in read('roads')+read('extra')}.values():
 t=e.get('tags',{});pts=geom(e)
 if len(pts)<2:continue
 kind=t.get('highway','');foot=kind in ['pedestrian','footway','path','steps']; one=t.get('oneway') in ['yes','1','-1'] or t.get('junction')=='roundabout'
 width=(24 if one else 40) if kind in ['trunk','primary','secondary'] else (18 if one else 30) if kind in ['tertiary'] else (15 if one else 26)
 if foot:width=18
 part=[];ids=[]
 for i,p in enumerate(pts):
  if valid(p):part.append(p);ids.append(e['nodes'][i])
  if (not valid(p) or i==len(pts)-1) and len(part)>1:
   if t.get('oneway')=='-1':part.reverse();ids.reverse()
   roads.append({'id':e['id'],'name':t.get('name',''),'kind':kind,'width':width,'one':one,'foot':foot,'bridge':t.get('bridge') not in [None,'no'],'tunnel':t.get('tunnel') not in [None,'no'],'layer':int(t.get('layer','0')) if t.get('layer','0').lstrip('-').isdigit() else 0,'points':part,'nodes':ids});part=[];ids=[]
  elif not valid(p):part=[];ids=[]
buildings=[]
for e in read('buildings'):
 p=geom(e);t=e.get('tags',{})
 if len(p)<4 or not any(valid(v) for v in p):continue
 if p[0]!=p[-1]:continue
 area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:])))/2
 if area<35:continue
 buildings.append({'id':e['id'],'points':p})
land={}
for kind in ['water','parks']:
 land[kind]=[{'points':geom(e),'name':e.get('tags',{}).get('name','')} for e in read(kind) if len(geom(e))>=4 and geom(e)[0]==geom(e)[-1]]
data={'version':'4.0-srodmiescie','source':'© OpenStreetMap contributors','license':'ODbL-1.0','snapshot':'2026-05-31','projection':{'west':20.965,'north':52.275,'lonScale':68000,'latScale':111200},'roads':roads,'buildings':buildings,**land}
print({k:len(data[k]) for k in ['roads','buildings','water','parks']})
header='/* Geographic database: ODbL 1.0; © OpenStreetMap contributors. See maps/LICENSE.md. */\n'
all_buildings=data.pop('buildings');data['buildings']=[]
(root/'maps/srodmiescie-data.js').write_text(header+'window.WARSAW_MAP='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
for i,part in enumerate([all_buildings[:len(all_buildings)//2],all_buildings[len(all_buildings)//2:]]):
 (root/('maps/buildings-'+str(i+1)+'.js')).write_text(header+'window.WARSAW_MAP.buildings.push(...'+json.dumps(part,ensure_ascii=False,separators=(',',':'))+');\n')
