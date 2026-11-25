# GPX Video — Project Blueprint for Codex

> Purpose: This document is the product and engineering source of truth for the GPX Video MVP.
> Read this file together with `AGENTS.md` before making changes.

## 1. Product vision

GPX Video is a web application that turns GPS activity files into cinematic videos featuring:
- Satellite map imagery
- An animated route line and moving position marker
- Smooth camera movement
- Synchronized activity metrics
- An elevation profile
- Downloadable MP4 exports

The product is a video creation studio, not a GPS tracker or a Strava replacement.

**Tagline:** Your activity. Your movie.

## 2. MVP user journey

1. User opens the Studio.
2. User uploads a `.gpx` file.
3. The application validates and parses the file.
4. The application calculates only metrics supported by the source data.
5. The route appears on a satellite map.
6. User previews the animated route.
7. User configures camera mode, video aspect ratio, duration, route appearance, and visible metrics.
8. User renders and downloads an MP4.

The first MVP should prioritize one complete, reliable GPX-to-video workflow over a large feature set.

## 3. Product principles

- Do not fabricate GPS or activity metrics.
- Clearly distinguish source data from derived estimates.
- Missing values should be unavailable, not displayed as zero.
- Preserve GPX track segments and timestamps.
- Treat user location history as sensitive data.
- Do not upload GPS files to external services without explicit user consent.
- Respect satellite imagery licensing, attribution, caching, and commercial video-export terms.
- Never expose provider API keys or secrets in source control.
- Do not claim a feature works until it has been tested.
- Keep the application usable when optional data is missing.

## 4. MVP scope

### Required

- Desktop-first responsive Studio UI
- GPX file upload
- GPX validation and parsing
- Track segments and waypoints
- Distance calculation
- Duration calculation when timestamps are available
- Speed calculation when timestamps are reliable
- Elevation gain/loss when elevation data is available
- Elevation profile
- Satellite map with route, start, and finish markers
- Route auto-fit
- Route animation with moving marker
- Follow, Overview, and basic Cinematic camera modes
- Play, pause, resume, restart, and seek
- Synchronized metrics
- Video settings
- MP4 export, initially at a modest resolution and frame rate
- Clear render progress, cancellation, and error states

### Later, not required for first MVP

- Strava OAuth/API integration
- TCX and FIT imports
- User accounts and cloud projects
- 4K rendering
- AI-generated editing and scene selection
- Music and voiceover
- Advanced 3D terrain
- Team or social features

Do not implement later features until the core GPX-to-MP4 workflow is reliable.

## 5. Recommended technology

Use stable, compatible versions and verify current official documentation before selecting versions.

- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS, shadcn/ui
- Map: MapLibre GL JS
- GPX parsing: `@tmcw/togeojson` or another maintained GPX-compatible parser
- Geospatial utilities: Turf.js where appropriate
- Charts: Recharts
- Tests: Vitest and Playwright
- Video rendering: evaluate Remotion and/or a custom frame-rendering pipeline
- Encoding: evaluate FFmpeg
- Local persistence: IndexedDB for initial local projects
- Later backend: PostgreSQL, object storage, and background render workers if required

Do not add a database, authentication, queue, or cloud storage before the MVP needs them.

## 6. Suggested architecture

Keep these responsibilities separate:

1. **UI layer**
   - Dashboard
   - Studio layout
   - Upload controls
   - Settings
   - Playback controls
   - Export interface

2. **GPX domain layer**
   - File validation
   - Parsing
   - Normalized track model
   - Track segment handling
   - Metric calculations

3. **Map layer**
   - MapLibre initialization
   - Satellite style/provider integration
   - Route rendering
   - Start/end markers
   - Camera control

4. **Animation layer**
   - Route progress
   - Distance-based interpolation
   - Current position
   - Camera movement
   - Playback clock
   - Seeking and playback controls

5. **Video layer**
   - Video composition
   - Map frame capture/rendering
   - Metric overlays
   - Elevation profile overlay
   - Encoding
   - Export and download

6. **Persistence layer**
   - Project metadata
   - Video settings
   - Track data
   - Render metadata

GPS parsing and calculations must not be implemented inside React presentation components. Animation timing should not depend on React rerenders.

## 7. Suggested repository structure

Adapt this structure to the existing repository rather than forcing unnecessary files.

```text
gpx-video/
├── app/
│   ├── page.tsx
│   ├── studio/
│   │   └── page.tsx
│   └── api/
├── components/
│   ├── upload/
│   ├── map/
│   ├── editor/
│   ├── metrics/
│   └── export/
├── lib/
│   ├── gpx/
│   ├── geo/
│   ├── animation/
│   ├── video/
│   └── persistence/
├── public/
│   └── assets/
├── tests/
├── docs/
├── AGENTS.md
├── PROJECT_BLUEPRINT.md
└── README.md
```

## 8. GPX data model

Create a normalized internal model. The exact implementation may vary, but it should preserve the source information.

```ts
type Coordinate = {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
};

type TrackSegment = {
  points: Coordinate[];
};

type TrackData = {
  name?: string;
  segments: TrackSegment[];
  waypoints: Coordinate[];
  sourceFileName: string;
};

type ActivityMetrics = {
  totalDistanceMeters: number;
  durationSeconds?: number;
  movingTimeSeconds?: number;
  averageSpeedMps?: number;
  maximumSpeedMps?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  elevationProfile?: Array<{
    distanceMeters: number;
    elevationMeters: number;
  }>;
};
```

Rules:
- Use WGS84 latitude/longitude.
- Validate coordinate ranges.
- Preserve segment boundaries.
- Do not connect separate segments with an artificial line.
- Handle missing timestamps and elevation.
- Avoid division by zero and invalid numeric values.
- Document assumptions used for smoothing elevation or detecting pauses.
- Do not infer heart rate, cadence, or power from ordinary GPX data.

## 9. Metric calculation requirements

- Distance: calculate geodesic distance along valid points, respecting segment boundaries.
- Duration: use valid timestamps where available; handle inconsistent timestamps explicitly.
- Speed: derive from distance and elapsed time only when timestamp quality is sufficient.
- Average speed: document whether it uses total elapsed time or moving time.
- Maximum speed: protect against GPS spikes and document filtering rules.
- Elevation gain/loss: calculate only when elevation exists; document any noise filtering.
- Elevation profile: use cumulative distance as the horizontal axis.
- Missing source data must remain missing.

Add unit tests for calculations and edge cases.

## 10. Map and imagery requirements

Use MapLibre GL JS with a satellite imagery provider whose terms explicitly permit the intended use.

Before integrating a provider, document:
- Provider name
- Required API key/configuration
- Attribution requirements
- Commercial-use terms
- Video export and offline rendering restrictions
- Tile caching restrictions
- Rate limits and expected costs

Do not assume that a publicly accessible tile URL is licensed for commercial video export.

The map must support:
- Satellite basemap
- Track line
- Separate track segments
- Start and finish markers
- Fit route bounds
- Camera controls
- Responsive resizing
- Attribution

## 11. Animation requirements

Implement an animation engine independent of React UI.

It should support:
- Normalized progress from 0 to 1
- Distance-based interpolation along the route
- Current coordinate
- Current cumulative distance
- Current elapsed activity time when available
- Current speed when available
- Progressive route drawing
- Follow camera
- Overview camera
- Basic Cinematic sequence
- Play, pause, resume, restart, and seek

Use a stable animation clock. Avoid updating React state on every frame unless required for visible UI.

When a track has multiple segments, do not animate an artificial connection between segments. Decide and document how segment gaps are represented in the timeline.

## 12. Video settings

Suggested settings model:

```ts
type VideoSettings = {
  durationSeconds: number;
  fps: 30 | 60;
  resolution: "720p" | "1080p" | "4k";
  aspectRatio: "16:9" | "9:16" | "1:1";
  cameraMode: "follow" | "overview" | "cinematic";
  cameraZoom: number;
  cameraPitch: number;
  routeColor: string;
  routeWidth: number;
  showMetrics: boolean;
  showElevation: boolean;
  showStartEnd: boolean;
};
```

Only expose settings that the current renderer can actually honor. If a setting is not supported, disable it or explain the limitation rather than silently ignoring it.

## 13. Video export strategy

Video export is a technical risk and must be validated early.

First create a proof of concept that renders a short clip containing:
- A real satellite map frame
- A moving route marker
- A progressively drawn route
- At least two synchronized metrics
- A playable MP4 output

Evaluate:
- MapLibre canvas capture
- Browser rendering and MediaRecorder
- FFmpeg/WASM
- Remotion
- Server-side browser rendering with a worker

Document the selected architecture and tradeoffs.

Start with a short 720p/30 FPS test. Then target 1080p/30 FPS.

Do not promise 4K or 60 FPS until the pipeline has been tested. Confirm that map imagery provider terms permit video rendering and export.

Never show fake render progress. Provide real progress where measurable, cancellation where supported, and useful error messages.

## 14. UI direction

Design: premium dark cinematic video studio.

Suggested palette:
- Background: `#0B0D10`
- Panels: `#151920`
- Borders: `#272D36`
- Accent: `#FF6B35`
- Primary text: white
- Secondary text: muted gray

Studio layout:
- Left: project/file and track information
- Center: large satellite map preview
- Right: video and metric settings
- Bottom: timeline, playback, and elevation profile
- Export action: clearly visible

Prioritize desktop editing. Make upload and preview usable on smaller screens.

## 15. Development milestones

Implement one milestone at a time. Do not skip ahead without verifying the previous milestone.

### Milestone 0 — Foundation
- Inspect repository
- Initialize or verify Next.js and TypeScript
- Configure styling and linting
- Add test setup
- Create README and AGENTS.md
- Ensure local development server works

### Milestone 1 — Studio UI
- Dashboard and Studio layout
- Upload component
- Map placeholder
- Metric cards
- Settings panel
- Timeline and playback controls
- Responsive layout

### Milestone 2 — GPX processing
- Upload and validation
- Parser and normalized model
- Track segments and waypoints
- Metric calculations
- Elevation profile data
- Unit tests and sample fixtures

### Milestone 3 — Satellite map
- Select licensed provider
- Configure MapLibre
- Display route and markers
- Fit bounds and map controls
- Verify attribution and provider terms

### Milestone 4 — Route animation
- Animation clock
- Interpolation
- Progressive route drawing
- Marker movement
- Camera follow and overview
- Playback and seeking
- Tests

### Milestone 5 — Dynamic metrics
- Synchronized metrics
- Metric visibility controls
- Elevation profile
- Click-to-seek
- Tests

### Milestone 6 — Video settings
- Camera modes
- Aspect ratio
- Duration and FPS
- Route appearance
- Metric overlay configuration
- Preview synchronization

### Milestone 7 — Video export
- Rendering proof of concept
- Short 720p test
- MP4 encoding
- 1080p export
- Real progress and cancellation
- End-to-end playback verification

### Milestone 8 — Local projects
- IndexedDB persistence
- Create, rename, open, autosave, delete
- Restore after reload

### Milestone 9 — QA and release preparation
- Unit and integration tests
- Playwright user-flow tests
- Large and malformed GPX fixtures
- Missing-data tests
- Rendering tests
- Accessibility and responsive checks
- README and deployment documentation

## 16. MVP definition of done

The MVP is complete only when a user can:
- Open the application
- Upload a real GPX file
- See its route on a licensed satellite map
- View valid calculated metrics
- Play and pause route animation
- Follow the route with a smooth camera
- Seek through the timeline
- View a synchronized elevation profile when data exists
- Configure supported video settings
- Generate a playable MP4
- Download the MP4

All of the above must be verified, not merely represented in the UI.

## 17. How Codex should work

For every task:
1. Inspect the repository and read `AGENTS.md` and this blueprint.
2. State a short implementation plan.
3. Make a focused change.
4. Add or update tests.
5. Run tests, type checking, and lint.
6. Fix errors introduced by the change.
7. Summarize changed files, verification performed, and known limitations.

Do not implement the whole product in one pass.
Do not invent successful test results.
Do not silently replace real functionality with mock data.
Do not start the next milestone until the current milestone is verified.

## 18. First task

Start with **Milestone 0 only**.

Inspect the existing repository. If it is empty, initialize the project. If it already contains code, preserve useful existing work.

Set up the foundation, documentation, and a minimal working landing page. Run the available checks and report:
- What was created or changed
- Commands executed
- Test/typecheck/lint results
- How to run the project locally
- Any unresolved setup decisions

Do not implement GPX parsing, map integration, animation, or video rendering in this first task.
