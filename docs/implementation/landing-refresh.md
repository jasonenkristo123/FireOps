# Landing page simplification — 2026-10-16

Owner request: retain the existing FireOps identity, use a clean light interface,
and substantially reduce copy and decorative UI. Test cases and Playwright
remain deferred under the owner's prior instruction.

## Implementation

- Keep the existing landing sections and authenticated CTA destinations. Preserve
  the cookie-aware identity read behind the existing Suspense boundary.
- Use the existing white/slate/navy palette with red-600 accents. Do not change
  the application-wide theme or operational screens.
- Replace the centered marketing text, telemetry bars and statistic cards with
  a short left-aligned hero and a single map illustration alongside it.
- Reduce workflow to three short steps, geography to a plain district list,
  the data caveat to one sentence, and the footer to essential links.
- Keep only header navigation and example-marker selection as Client Components.
  Hero, workflow, districts, caveat and footer now render on the server.
- Support compact mobile navigation, Escape dismissal, native anchor navigation,
  visible focus and 44-pixel example-marker targets.
- Remove unsupported operational counts, active-feed badges, made-up risk scores,
  staffed-post assertions, agency partnership claims and accessibility-certification
  claims from the rendered landing page.

Changed components: `src/app/page.tsx` and the seven rendered components under
`src/features/landing/`. Existing unused experimental components are preserved
and are not imported by the landing route. No new dependency is installed.

## Geographic illustration and example provenance

`public/maps/borneo-coastline.svg` is derived from the Natural Earth 1:50m land
coastline, not a generated administrative boundary. Dataset, projection, hash
and [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)
are recorded in `public/maps/README.md`. The 435 coastline vertices are retained
and converted to a compact SVG. No NASA API or external tile service is requested
while loading the landing page.

Three synthetic UI markers have generic example identifiers. They contain no
real observation coordinates, sensor measurements, relative detection timestamps,
human confirmations, priorities or risk classifications. A persistent caption
labels the map and points as a visual simulation, separate from operational LIVE
data. The diagram is not used for jurisdiction, data ingestion or authorization.

## Validation and limits

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: production compilation/type generation/prerendering passed.
- `git diff --check`: passed.
- No test suite, Playwright, browser automation or visual screenshot review was
  run. Responsive behavior and subjective visual acceptance remain to be
  reviewed in the browser by the owner.
- No database migration, RLS change, hosted write, environment edit, NASA request,
  privilege change or operational priority/risk policy change was performed.

This closes the implementation slice, not the remaining operational LIVE-data
setup or whole-project release gates.
