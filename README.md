# GPX Video

GPX Video is a browser based studio for turning GPS activities into route videos. The first release is planned around a private, local GPX workflow: import a track, preview it in 2D with available metrics, then expand the studio over time.

## Current status

The first browser workflow is in place: choose or drop a GPX file, parse its track locally, view it on an online OpenStreetMap-based map, and see metrics supported by the source data. The route preview includes play, pause, restart, and seek controls; its 20-second preview clock animates the route and synchronizes distance and available source activity time. Satellite imagery and video export are not implemented yet.

Distance uses great-circle distance between adjacent points within each segment. Duration and average speed are shown only if every track point has a valid, strictly increasing timestamp. Elevation gain/loss sums raw differences between adjacent points that both have elevation; no smoothing is applied. Animation follows cumulative distance, keeps GPX segments separate, and jumps the marker at segment boundaries without drawing a connector. Missing timestamps never produce a fabricated activity time.

Map provider details, attribution, and usage assumptions are recorded in [docs/MAP_PROVIDER.md](./docs/MAP_PROVIDER.md). The map loads only after the user chooses to show it, because tile requests disclose the approximate map area to the provider.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Project direction

See [GPX_VIDEO_PROJECT_BLUEPRINT.md](./GPX_VIDEO_PROJECT_BLUEPRINT.md) for product principles, the MVP scope, architecture, and milestone plan. GPX files contain sensitive location history; the planned first workflow should process them in the browser and must not send them to an external service without explicit consent.
