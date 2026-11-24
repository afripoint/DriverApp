# DriverApp

React Native + TypeScript with Expo. Android is the primary release target.

## Run locally

Requires Node.js supported by the installed Expo SDK, npm, and an Android phone or an Android Studio emulator.

```powershell
cd DriverApp
npm install
Copy-Item .env.example .env
npm start
```

Set `EXPO_PUBLIC_API_URL` in `.env` to your backend URL and restart Metro. Scan the QR code using a compatible Expo Go app, or press `a` for an Android emulator. For native modules unavailable in Expo Go, create a development build using the development profile below and start with `npx expo start --dev-client`.

## Preview sign-in

The app opens on the login screen. Tap **Testing the app? Use demo account**, then **Sign in** to view the dashboard.

- Email: `driver@example.com`
- Password: `Driver123!`

Authentication is local demo behavior in `src/services/auth.ts`; it does not contact a server or persist a session. Replace `signIn` with your login endpoint before release. The dashboard uses sample values from the supplied design, including its date and load details. Forgot-password and Fleet Admin actions explain the next step until those services are configured.

## Project structure

- `App.tsx`: safe area provider and signed-in screen state.
- `src/screens/LoginScreen.tsx`: initial login form and validation.
- `src/screens/DashboardScreen.tsx`: dashboard and bottom navigation with Jobs, Marketplace, and Profile views.
- `src/services/auth.ts`: demo sign-in boundary for future endpoint integration.
- `src/data/demo.ts`: sample active-load data.
- `src/theme.ts`: shared colors and heading typography.
- `src/components/Screen.tsx`: reusable scrolling screen with safe area handling.
- `src/services/api/client.ts`: typed JSON requests, optional bearer authentication, timeout, and HTTP errors.

Add new screens under `src/screens` as the app grows. The earlier starter screens and navigation types remain available but are no longer shown.

## Connect an endpoint

Create services under `src/services/api` using your actual backend contract:

```typescript
import { request } from './client';

type Job = { id: string; status: string };
export const getJobs = (token: string) =>
  request<Job[]>('/jobs', { token });
```

The `/jobs` route is an example, not a configured backend. Handle loading, empty, and error states in your screens. The generic response type does not validate server data at runtime. Public Expo environment variables are included in the app bundle; keep secrets on your server. Use secure native storage for persistent authentication tokens when adding sign-in.

## Checks

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android
```

## Marketplace preview

Open the Marketplace tab after demo sign-in. Search by city/state/load ID, toggle the filters, or tap the sort label to cycle price ordering. These filters use local fixtures, including a sample near-me flag; GPS and live load availability are not connected.

Tap a load to view its route, schedule, and cargo specifications. Select **Place a bid**, choose an available matching truck, and the form scrolls to the offer section. Change the offer with the slider or numeric field. Both use the same per-truck range (₦250,000–₦320,000 in the fixtures); empty/out-of-range amounts and unavailable trucks cannot be submitted. The total is the current offer multiplied by selected truck count. Single-truck loads allow switching selection; two-truck fixtures support multi-selection.

Review the route, selected trucks, offer, and total in the confirmation sheet. Cancelling preserves the form; confirming saves a bid in memory for the signed-in demo session and prevents a duplicate bid on that load. Bids survive tab switches but reset on sign-out or reload. No bid is sent to a backend. Replace the fixture eligibility flags and local `onBid` handler with your matching and submission endpoints before release, and enforce the same rules on the server.

`src/features/marketplace/` contains the listing, detail/bid flow, shared UI, and typed data/validation model. `tests/marketplace.test.cjs` checks truck eligibility, selection limits, amount boundaries, and totals. Screenshots in `previews/` show the browser render; the Android bundle is also checked.

For an optional browser preview, run `npm run web`.

## My Jobs preview

Tap **My Jobs** in the bottom navigation to open the Assigned tab with three sample job cards from the screen reference. Search by address, city/state, or load ID (`LAQ-6201` through `LAQ-6203`), use the quick filters or filter sheet, change sorting, and open each job's details. Bidding shows marketplace offers submitted during the current demo session. In Transit and Completed show empty states until jobs with those statuses are available. Jobs data and near-me/today flags are local fixtures in `src/features/jobs/model.ts`, pending backend integration.

The Bidding tab also starts with the pending `LAQ-5400` reference bid. Its detail view includes the route dropdown, expandable bottom panel, schedule, cargo, five submitted trucks, bid timestamp, and withdrawal confirmation. A new marketplace bid for the same load replaces this reference with its actual offer and trucks. Confirmed withdrawal removes the pending bid across tab switches for the current session; no backend request is made. Connect bid status/withdrawal endpoints before release.

## Google Maps

The bidding details use an interactive Google map instead of the reference image. The web component loads the Maps JavaScript API with Places, supports pan/zoom, and geocodes pickup/delivery addresses when Geocoding is enabled. Without successful geocoding, it shows the demo's approximate city-area pins. Android uses `react-native-maps` with the Google provider and the coordinates in the job details model. Replace these fixture coordinates with your endpoint's actual pickup/drop-off coordinates. This is an interactive route-area map, not live driver GPS tracking or turn-by-turn road routing.

Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` locally for browser preview. Enable Maps JavaScript API in its Google Cloud project, billing, and website restrictions that allow your preview and production origins. Enable Geocoding API for address resolution. Environment values prefixed `EXPO_PUBLIC_` are client-visible; the actual local key is git-ignored and not included in source ZIPs.

For Android release builds, set `GOOGLE_MAPS_ANDROID_API_KEY` in your EAS environment and enable Maps SDK for Android. Restrict that native key to your final package and signing SHA-1 fingerprint. `app.config.ts` injects it through the `react-native-maps` plugin (local development falls back to the browser key). Rebuild native binaries after key configuration changes. Google Maps is available in Expo Go for Android testing. For Google Maps on iOS builds, also configure `GOOGLE_MAPS_IOS_API_KEY` and enable Maps SDK for iOS.

References: [Expo Google Maps setup](https://docs.expo.dev/versions/latest/sdk/map-view/), [Google Maps JavaScript loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api).

## Android builds and Google Play

Replace `com.example.driverapp` in `app.json` with your final unique Android package identifier before the first store release. Replace starter icons and configure your production API URL in the EAS production environment.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
```

Development builds include the development client; preview builds produce an installable APK; production builds produce an AAB for Google Play with automatically incremented version codes. `build:configure` links the project to your Expo account. The short `npm run build:android` scripts require `eas-cli` installed and available on PATH.

Create the app in Google Play Console, complete its required listing, privacy policy, data safety declarations, and testing requirements, and configure signing/submission credentials. Then submit the production build to internal testing:

```powershell
npx eas-cli@latest submit --platform android --profile production
```

This repository provides build configuration; no signed build or store submission has been performed.

References: [Expo setup](https://docs.expo.dev/get-started/create-a-project/), [Android builds](https://docs.expo.dev/build/setup/), [Google Play submission](https://docs.expo.dev/submit/android/).
#   D r i v e r A p p  
 