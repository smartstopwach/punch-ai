# PUNCH//AI — Real-Time Boxing Interaction

Premium browser-based boxing training / game with futuristic 3D interface, vision architecture, and production-grade engineering.

> Apple-level interaction + AAA fitness game + computer vision technology.

## Concept

Player stands in front of laptop/phone camera. Camera detects body & hands in real time. User punches toward virtual 3D heavy bag. System estimates:

- left/right hand, punch type, velocity, extension, trajectory, target zone, accuracy, estimated power (0-100 camera-based), reaction time, combo, frequency, session duration, performance score.

**Important:** Camera cannot measure Newtons. Power is displayed as **ESTIMATED POWER** with tooltip: "Camera-based estimate from visual movement data."

Architecture is ready for future hardware sensor: `SensorInput → Calibration → ForceMeasurement → PowerScore` (smart gloves / pressure sensors).

## Visual Reference

Premium freestanding human-shaped dummy:

- black/dark graphite rubber material
- torso, head, shoulders, base
- subtle reflections, physically believable
- recreated as stylized 3D game asset in Three.js, not static image

## Tech Stack

- React 18 + TypeScript + Vite
- Three.js + React Three Fiber + Drei
- Framer Motion
- Tailwind CSS
- Zustand (light state)
- WebRTC getUserMedia
- Future: MediaPipe Tasks Vision (Hand Landmarker + Pose Landmarker)

## Architecture

```
/src
  /components   # Landing, HUD, Results, Stats, Settings, CameraFeed, Loading
  /three        # Scene.tsx, Dummy.tsx, ImpactEffects.tsx, Environment
  /game         # GameEngine, ScoreEngine, ComboSystem
  /vision       # VisionEngine abstraction, PunchDetector (state machine), TargetMapper, ImpactEstimator
  /tracking     # MockEngine (demo simulation)
  /audio        # AudioManager (WebAudio)
  /data         # gameModes, mockData
  /utils        # math, smoothing (OneEuroFilter)
  /types        # shared types
  /hooks        # useLocalStorage
```

### Vision Engine Interface

```ts
interface VisionEngineInterface {
  initialize(): Promise<void>
  startCamera(): Promise<MediaStream>
  stopCamera(): void
  getTrackingData(): { leftHand?, rightHand? }
  detectPunch(tracking): PunchEvent | null
}
```

Local processing only. No video upload.

### Punch Detection State Machine

```
IDLE → READY → MOVING → EXTENDING → IMPACT → RECOVERY → READY
```

- Cooldown prevents duplicates
- Velocity threshold + extension threshold
- Temporal smoothing via One Euro Filter

### Impact Estimation

```ts
estimatedPower = 
  normalizedVelocity *0.42 +
  extension *0.28 +
  trajectoryQuality *0.14 +
  accuracy *0.10 +
  consistency *0.06
→ 0-100
```

Future sensor path provided.

### Target Zones

HEAD, LEFT_TEMPLE, RIGHT_TEMPLE, UPPER_CHEST, CENTER_CHEST, LEFT_RIB, RIGHT_RIB, ABDOMEN, CENTER_BODY — each with invisible collider, visual highlight, multiplier.

## Game Modes

- **FREE**: unlimited
- **SPEED**: 60s max punches
- **ACCURACY**: hit highlighted zones 90s
- **COMBO**: follow sequences 75s
- **REACTION**: zone lights up, react fast 60s
- **ENDURANCE**: 180s continuous
- **DEMO**: simulated tracking, no camera

## HUD

Top: Round, Time, Mode
Left: Score, Combo, Punches L/R
Right: Est Power, Accuracy, Last punch
Bottom: Left/Right hand indicator
Center: 3D dummy

## Visual Design

- near-black #07080A background, graphite #121316 panels
- accent #E8FF2A (punch), white, muted #8A8F98
- Geist font, mono for metrics
- Subtle grid, soft spotlight, ambient particles
- No generic dashboard, no excessive glassmorphism, no neon chaos
- Premium restrained effects: expanding ring, particle burst, shockwave, bag sway via spring physics

## Features Implemented

- [x] Cinematic loading screen
- [x] Premium landing with interactive 3D dummy (orbit controls)
- [x] Demo Mode with realistic mock punch engine
- [x] Camera Mode architecture + placeholder UI + permission handling + privacy mode
- [x] Countdown 3-2-1-GO
- [x] Game timer, score, combo, accuracy, power
- [x] Target hit zones with hover + active highlight
- [x] Impact animation (ring + particles + bag physics)
- [x] HUD professional
- [x] Results screen with performance summary + punch log
- [x] Statistics with mock charts
- [x] Settings: sound, graphics, difficulty, privacy, mirror, target size, reduced motion, haptics
- [x] LocalStorage persistence
- [x] Audio architecture (punch, combo, UI)
- [x] Responsive: desktop, laptop, iPad, mobile (simplified HUD + touch buttons)
- [x] Performance: adaptive DPR, 60fps target, efficient loops
- [x] Error states: permission denied, unavailable, player not detected
- [x] Safety notice
- [x] Manual punch fallback (click/space) for testing

## Run

```bash
npm install
npm run dev
# http://localhost:5173
```

Build:

```bash
npm run build
npm run preview
```

## Future Integration Points

- Replace `MockEngine` with `VisionEngine` using MediaPipe
- `PunchDetector` already expects `HandTracking` input
- `TargetMapper` can upgrade to 3D raycasting
- `ImpactEstimator.estimateFromSensor()` for hardware
- Data layer swappable to Firebase/Supabase (currently localStorage)
- PWA / Capacitor ready (core logic platform-independent)

## Safety

"Train within your comfort level. Use appropriate boxing equipment and adequate space. Stop if you feel pain, dizziness, or unusual discomfort. Do not punch harder just to increase a score."

## Quality Checklist

- [x] Desktop, mobile, iPad layouts
- [x] Demo, countdown, timer, simulation, hit zones, impact, score, combo, results, stats, settings, storage, camera architecture, error states, accessibility, performance, no console errors, no broken imports, no placeholder lorem, no dead buttons

---

Built as polished static prototype, fully ready for real-time camera tracking next phase.
