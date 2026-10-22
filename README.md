# Day Dial (Daily Schedule Mapper)

A daily planner built around a 24-hour dial. Routines you set up once, one-off tasks, a calendar, streaks, insights, and rewards you earn from how much of your week you kept.

For what the app can do and how to use it, see [USER-GUIDE.md](USER-GUIDE.md).

Everything runs locally. Your data is stored in the browser (IndexedDB) on this computer, never on a server.

## One-time setup (about two minutes)

1. Double-click **`update-app.cmd`**. It installs packages the first time, builds the app, and opens `http://localhost:4517`.
2. In that browser window (Edge or Chrome), install it as an app:
   - **Edge:** menu (⋯) → **Apps** → **Install this site as an app**
   - **Chrome:** the install icon at the right end of the address bar, or menu → **Cast, save and share** → **Install page as app**
3. Right-click the new **Day Dial** icon in the taskbar and choose **Pin to taskbar**.
4. Close the `update-app.cmd` window.

From now on, click the taskbar icon. The app opens in its own window **with no server running**, because it is cached by a service worker.

## After changing the code

Run **`update-app.cmd`** again, then open the installed app once. It loads the new version automatically.

## Keep in mind

- **The address must stay `http://localhost:4517`.** Browser data belongs to an address, so a different port means an empty planner. The port is fixed in `vite.config.ts`.
- **Back up now and then:** Settings → *Export a backup*. Clearing the browser's site data for localhost would erase your tasks. Restore from the same page.
- `Daily Planner.cmd` is a fallback launcher (starts the server and opens an Edge app window) if you'd rather not install the app.

## Development

```sh
npm install
npm run dev      # dev server on http://localhost:4517 (stop the preview server first)
npm test         # recurrence, rewards and quick-add tests
npm run build    # type-check and build to dist/
npm run serve    # serve the built app on http://localhost:4517
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, Dexie (IndexedDB), vite-plugin-pwa.

Key files:

- `src/lib/recurrence.ts`: when a task happens (daily, weekdays, every N days, end dates, skips, pauses) and streaks
- `src/lib/rewards.ts`: weekly or monthly scores, tiers, allowance and redemptions
- `src/lib/quickAdd.ts`: turns "skincare every day 9pm for 1 month #self-care" into a task
- `src/components/DayDial.tsx`: the dial on the Today screen
