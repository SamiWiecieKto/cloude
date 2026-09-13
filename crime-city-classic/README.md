# Crime City Classic — Warszawa 3.0

Standalone top-down driving sandbox. Serve this directory as static files; no build, external script loader or dependencies are needed. `index.html` loads `game.js` from the same deployment.

## Play

- WASD / arrows: walk; accelerate, reverse and steer in cars.
- E: enter or leave a nearby working car. Slow down before exiting.
- Mouse + click / Space: aim and shoot on foot. R: cycle three weapons.
- Shift: sprint on foot, handbrake in a car.
- F / MISJE: choose one of five replayable missions.
- M / tap the minimap: open the city map and mission route.
- Escape / P: pause. Focus loss and backgrounding pause automatically.
- Touch: directional joystick; contextual action, gas/shoot and brake/sprint buttons.
- Green G: free car repair and health recovery while stopped in a car.

Effects are opt-in; original melodic Web Audio music has its own toggle and starts after a user gesture. Day/night is manual. Cash, best cash and completed mission IDs are saved locally; position and active mission progress are session-only. `?controls=touch` enables the touch controls on desktop for interaction checks.

## Implementation

A fixed 60 Hz simulation is independent of display refresh rate. Map generation uses a deterministic seed and caches static geometry. Cars follow intersection waypoints and traffic lights, brake for vehicles ahead, and use oriented-box collision checks. Police use road routing, dismount near a wanted pedestrian, pursue with obstacle-aware foot paths, and reboard when the pursuit ends. Health, car damage, destruction, arrest, respawn, five multi-step missions, local cash persistence, procedural audio, minimap and night headlights are included.

## Verification

Run `node tests/game.cjs` from this directory. The isolated simulation test checks entry/exit, throttle/brake, cooldowns, pause, destruction, garages, job rewards, touch controls, matching travel at 30/60/120 display FPS, and one simulated minute of traffic. This is complemented by browser checks of start, vehicle controls, weapons, pause, sound and night mode. Mobile hardware performance still requires device testing.

## Source lineage

Reworks the sandbox originally deployed from `SamiWiecieKto/cloude` commit `5b74cfa9f96a398df617826509ed23acff7a14e0`, path `crime-city-classic/index.html`. Deployment now contains the actual game assets rather than a `document.write` loader pinned to that old commit.

## Warsaw edition

The map is an original, stylized and compressed interpretation, not a street-for-street navigation map. The Vistula separates the west-bank districts from Praga. Four vehicle bridges connect the road graph; traffic and route hints cannot cross water elsewhere. Landmarks include the Palace of Culture, Central Station, Old Town, Royal Castle, Copernicus Science Centre, National Stadium, Saxon Garden and Łazienki. Street names and landmark geography are simplified for play.

The five missions are a stadium passenger run, two foot deliveries, a three-checkpoint bridge loop, a wanted escape to Wola, and an untimed Old Town/Łazienki visit. Missions pause with menus and the city map. Completion awards złoty and records progress; tasks can be replayed or cancelled.

Verification additionally checks river collision, all four bridges, reachability of objectives, road routing, foot routing around the palace, patrol dismount/chase/reboarding, pedestrian–car collisions, explosion cleanup and persistent bodies. The 390×844 browser check covers mission selection, the first passenger pickup and the city map. Real mobile hardware performance is not measured.

Geographic references: [Warsaw tourism: viewpoints](https://go2warsaw.pl/punkty-widokowe/), [Warsaw tourism: National Stadium](https://go2warsaw.pl/stadion-pge-narodowy/), [PGE Narodowy](https://www.pgenarodowy.pl/). All game geometry and audio are generated locally; no map tiles or commercial recordings are bundled.
