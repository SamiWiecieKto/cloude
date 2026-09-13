# Crime City Classic — Street Edition 2.0

Standalone top-down driving sandbox. Serve this directory as static files; no build, external script loader or dependencies are needed. `index.html` loads `game.js` from the same deployment.

## Play

- WASD / arrows: walk; accelerate, reverse and steer in cars.
- E: enter or leave a nearby working car. Slow down before exiting.
- Mouse + click / Space: aim and shoot on foot. R: cycle three weapons.
- Shift: sprint on foot, handbrake in a car.
- F: start an optional timed drive at a yellow dollar marker.
- Escape / P: pause. Focus loss and backgrounding pause automatically.
- Touch: directional joystick; contextual action, gas/shoot and brake/sprint buttons.
- Green G: free car repair and health recovery while stopped in a car.

Sound is opt-in. Day/night is manual. Cash and best cash are saved locally in this browser; world position and missions are session-only. `?controls=touch` enables the touch controls on desktop for interaction checks.

## Implementation

A fixed 60 Hz simulation is independent of display refresh rate. Map generation uses a deterministic seed and caches static geometry. Cars follow intersection waypoints and traffic lights, brake for vehicles ahead, and use oriented-box collision checks. Police use road routing and approach directly when the path is clear. Health, car damage, destruction, arrest, respawn, timed deliveries, local cash persistence, procedural audio, minimap and night headlights are included.

## Verification

Run `node tests/game.cjs` from this directory. The isolated simulation test checks entry/exit, throttle/brake, cooldowns, pause, destruction, garages, job rewards, touch controls, matching travel at 30/60/120 display FPS, and one simulated minute of traffic. This is complemented by browser checks of start, vehicle controls, weapons, pause, sound and night mode. Mobile hardware performance still requires device testing.

## Source lineage

Reworks the sandbox originally deployed from `SamiWiecieKto/cloude` commit `5b74cfa9f96a398df617826509ed23acff7a14e0`, path `crime-city-classic/index.html`. Deployment now contains the actual game assets rather than a `document.write` loader pinned to that old commit.
