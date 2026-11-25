# Map provider

## Current preview basemap

- **Provider:** OpenFreeMap public tile service, using the OpenMapTiles `dark` and `positron` styles with OpenStreetMap data. The user can switch between the dark and light styles. This is a street/vector map, not satellite imagery.
- **Configuration:** MapLibre GL JS in the browser; style URLs `https://tiles.openfreemap.org/styles/dark` and `https://tiles.openfreemap.org/styles/positron`. No API key or secret is required.
- **Attribution:** MapLibre reads the style attribution and displays it on the map. Keep this visible. For video or another output that does not use MapLibre's built-in attribution, include `OpenFreeMap © OpenMapTiles Data from OpenStreetMap` in the video or credits.
- **Commercial use:** OpenFreeMap states that commercial use is allowed. Its service is provided as-is without an availability guarantee.
- **Video export:** The provider permits commercial use and specifies attribution for video. Any future renderer must preserve that attribution in exported video and must be checked against the provider's current terms before release.
- **Caching and offline use:** This project does not implement tile downloads or an offline cache. OpenFreeMap's current offline-use policy limits each user-started download to 3,000 tiles and 50 MB, with no more than four parallel requests. Do not add bulk downloads without reviewing the current terms.
- **Rate limits and cost:** The public service currently advertises no request or view limits and no charge; it is donation-funded and has no SLA.
- **Privacy:** The map is not initialized until the user clicks **Показати карту**. Tile requests reveal the approximate area being viewed to the provider. The GPX file and route GeoJSON remain in the browser and are not sent to the tile service.
- **Style sprites:** The current OpenFreeMap Dark style references `circle-11` and `wood-pattern` images that are absent from its sprite sheet. The app supplies small local fallback images for those two style assets; they are generated in the browser and make no additional network requests.

## Satellite imagery

Satellite imagery is not integrated. It requires selecting a separate imagery provider and reviewing its API key, attribution, export, caching, rate, and cost terms before adding it.

## Sources checked

- [OpenFreeMap overview and FAQ](https://openfreemap.org/)
- [OpenFreeMap terms of service](https://openfreemap.org/tos/)
- [OpenFreeMap quick start](https://openfreemap.org/quick_start/)
- [MapLibre GL JS installation and Next.js worker setup](https://maplibre.org/maplibre-gl-js/docs/)
