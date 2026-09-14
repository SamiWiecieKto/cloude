# Crime City — Śródmieście 4.0

Static browser game: serve this directory; no build or external script loader. Open `index.html`.

## Map

Stage 1 replaces the procedural square street grid with OpenStreetMap street geometry, 9,062 building footprints, park outlines and Vistula polygons. Real street bearings and shared OSM node IDs are retained. Road widths, traffic access and landmark rendering are gameplay adaptations, not a real-world navigation system. The staging outline is approximate; surrounding districts remain explicitly unfinished.

Map data load from three local scripts. A 3000×3000 overview keeps memory bounded; an LRU cache of up to 32 full-resolution 512px tiles sharpens the nearby driving view. Spatial indexes accelerate road/building/water collision checks. Cars follow a directed road graph rather than four cardinal directions. See `maps/LICENSE.md` for ODbL attribution and `ROADMAP.md` for the district sequence.

## Play

WASD/arrows: walk or drive. E: enter/exit. Mouse/click or Space: shoot. R: weapon. Shift: sprint/handbrake. F: missions. M or tap minimap: atlas. Atlas supports +/−, drag, player position and district reset. Escape/P: pause. Touch controls provide joystick and action buttons. Green G: repair while stopped.

Five missions now use Śródmieście locations: palace–Miodowa passenger run, Castle/Kopernik deliveries, a tour of three squares, escape to Muranów and an untimed Old Town–Łazienki trip. Cash and completed tasks persist in local storage. Original melodic music and effects have separate toggles. Police dismount and pursue pedestrians.

## Verification

Run `node tests/game.cjs` (delegates to `tests/srodmiescie.cjs`). Checks actual named streets/non-orthogonal geometry, safe spawn/entry/exit, every mission route and completion, timeout, map pause, car/body collisions, explosions and 30 simulated seconds of traffic. Earlier physics uses the same fixed 60 Hz simulation. Browser verification covers the mobile game view, city atlas and zoom controls. Real phone hardware performance is not measured.

## Geographic data

`maps/srodmiescie-data.js`, `maps/buildings-1.js` and `maps/buildings-2.js` contain the complete derivative database. Coordinates are a local metric projection, rounded to one unit. The mapping source is [OpenStreetMap](https://www.openstreetmap.org/copyright). Source extraction timestamps and license are in `maps/LICENSE.md`.

Compile the source snapshots with `python scripts/build-srodmiescie.py /path/to/snapshots`. Relation assembly uses `scripts/merge-polygons.py` and Shapely. These scripts are development utilities; the browser game has no dependencies.
