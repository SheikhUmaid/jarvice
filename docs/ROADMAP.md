# JARVIS — Roadmap

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Visual foundation | **Complete** (2026-11-06) |
| 2 | Graphics engine | **Next** |
| 3 | Voice engine | Planned |
| 4 | AI brain (Claude) | Planned |
| 5 | Image processing laboratory | Planned |
| 6 | Live computer vision | Planned |
| 7 | Screen intelligence | Planned |
| 8 | Local agent | Planned |
| 9 | Memory | Planned |
| 10 | Experimental environments | Planned |
| 11 | Final integration | Planned |

## Milestone 1 — delivered

- [x] Development environment inspected (Node 22.19, pnpm 10.23, Iris Xe, Chrome 154; disk 97 % full noted)
- [x] Architecture and dependency plan ([ARCHITECTURE.md](ARCHITECTURE.md))
- [x] pnpm monorepo: 3 apps, 3 packages, strict TypeScript 6, ESLint 10, Prettier, esbuild bundles for Node apps
- [x] Design system `@jarvis/ui`: tokens, effects, 12 holographic components (+ grid plane)
- [x] 3D reactor with five continuously blended states, audio reactivity, bloom, quality tiers, SVG fallback
- [x] Command centre: top bar, nav rail, command deck, HUD, transcript, left/right panels, drawers
- [x] Navigation across all eight modes: lazy loading, transitions, hash routing, mode wheel, hotkeys
- [x] Local command layer + typed client tool registry (time, mode, quality, fullscreen, microphone, diagnostics, clear)
- [x] Backend WebSocket hub (typed, origin-checked, rate-limited) and hardened local-agent health service
- [x] Holographic, Spatial and System modes as working previews; standby screens with real readiness checks
- [x] Verified: typecheck, lint, build, browser walkthrough (all modes, mobile, WebGL fallback, link loss/recovery)

## Milestone 2 — Graphics engine (next)

Goal: make the visuals production-grade and measurable, and finish the Holographic Environment.

1. **GPU-time-based adaptive quality** — measure real GPU frame time with
   `EXT_disjoint_timer_query_webgl2`, so throttled refresh rates (embedded or background windows) no
   longer read as GPU load; add hysteresis, and show GPU ms next to FPS.
2. **Reactor polish** — volumetric core glow, ring-segment lighting tied to `uExec`, smoother
   state-change choreography (staggered ring responses), optional `ToneMapping` (AgX) evaluation.
3. **Audio-reactive pipeline** — a shared `VoiceLevel` source abstraction (mic now, TTS boundary
   events in M3) with band-specific mappings (bass → core, mids → rings, highs → particles).
4. **Particle systems** — a reusable GPU particle engine (emitters, lifetime, curl-noise flow) for
   data streams and transitions, replacing ad-hoc point clouds.
5. **Holographic mode → online** — window snapping and keyboard focus cycling, window layout
   persistence (localStorage), more 3D panels with live data (drei `<Html transform>` cards),
   interactive circular HUD gestures (mouse wheel zoom/rotate).
6. **Performance controls** — a render settings panel (DPR cap, bloom strength, particle density,
   FPS limiter), `frameloop="demand"` when nothing animates, pause rendering when the tab is
   hidden, and a frame-time overlay.
7. **Sound design (optional)** — Web Audio synthesized UI sounds (startup, confirm, notify) with a
   master mute and volume.
8. **Testing foundation** — Vitest for the interpreter, tool registry, schemas, origin parsing and
   window geometry; Playwright smoke test for mode navigation.
9. Fix forward: replace R3F's deprecated `THREE.Clock` warning when the R3F release supports
   `THREE.Timer`.

Exit criteria: 60 fps at medium on Iris Xe in Chrome; holographic mode marked online; tests in CI
script; typecheck/lint/build green.

## Later milestones (summary)

- **M3 Voice** — audio state machine, Web Speech recognition (disclosed as cloud-backed in
  Chrome), optional Whisper adapter, SpeechSynthesis with voice/rate selection, interruption,
  wake-word interface (off by default).
- **M4 AI brain** — `@anthropic-ai/sdk` in the backend, `claude-opus-5-5` with explicit effort,
  streaming over WebSocket, backend-owned tool loop with permission gate, refusal handling and
  fallbacks, prompt caching, conversation context; AI Laboratory online.
- **M5 Vision lab** — OpenCV.js worker, 15 image operations, Tesseract OCR, Claude vision,
  compare/export, detection overlays.
- **M6 Live vision** — MediaPipe Tasks (objects, faces, hands, gestures, pose), overlays,
  frame capture → Claude; strict camera permission UX.
- **M7 Screen intelligence** — `getDisplayMedia`, OCR, screenshot analysis, error explanation.
- **M8 Local agent** — pairing, allowlisted apps/directories/scripts, `systeminformation`
  metrics, audit log, rate limits; System mode online.
- **M9 Memory** — SQLite (better-sqlite3) conversations, facts, preferences, saved commands,
  tool logs; memory management screen; no silent saving of sensitive data.
- **M10 Experimental** — spatial suite (orbits, 3D model viewer GLB/GLTF/OBJ), virtual lab
  simulations, gesture interface, document intelligence.
- **M11 Integration** — end-to-end tests, security audit, performance pass, docs.

## Known issues and follow-ups

- `THREE.Clock … deprecated` warning in the console comes from React Three Fiber 9.8 creating a
  `THREE.Clock` with three r187; harmless.
- Embedded/unfocused browsers can cap `requestAnimationFrame` at ~24 fps; `auto` quality reads
  that as load and steps down (fixed properly by GPU timing in M2).
- The shared 3D vendor chunk is ~1 MB (267 KB gzip). It loads with the default Command mode; M2
  evaluates trimming drei imports.
- No automated tests yet (M2 adds Vitest + a Playwright smoke test).
- The repository is not under version control yet.
