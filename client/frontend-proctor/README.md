# Proctor — AI Student Monitoring System (Frontend)

A production-style React + Tailwind dashboard for teachers/admins to monitor
students during online exams. Real-time updates, AI alerts, live feed previews,
search/filter, analytics charts, dark mode, and a deep student detail view.

## Stack
- React 18 + Vite
- Tailwind CSS (class-based dark mode)
- React Router
- Recharts (analytics)
- Lucide React (icons)
- Socket.IO client (interface ready; mock layer used by default)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Folder structure

```
src/
  components/     Reusable UI (cards, charts, feeds, modal, navbar, toasts)
  context/        MonitorContext (state) + ThemeContext (dark mode)
  hooks/          useFilteredStudents (search/filter/sort logic)
  services/       socket.js — mock real-time layer (swap for real Socket.IO)
  data/           mockData.js — student/alert generators
  pages/          Dashboard.jsx — main view
  utils/          formatting helpers
```

## Wiring a real backend

Everything flows through `src/services/socket.js`. It currently uses a mock
class that emits the same events a real server should send. To go live:

1. `npm install socket.io-client` (already in deps).
2. Replace the `MockMonitorService` body with a real client:

```js
import { io } from 'socket.io-client'
const socket = io('https://your-server')
// re-emit the same event names the app listens for:
//   'connected', 'students:init', 'students:tick', 'alert'
```

The app listens for those four events in `context/MonitorContext.jsx`.
Keep the event payload shapes identical to `data/mockData.js` and nothing
else needs to change.

## Live feeds

`components/LiveFeed.jsx` renders an animated canvas placeholder. For real
camera/screen streams, replace the `<canvas>` with a `<video>` element fed by
a WebRTC track from each student session.

## Notes
- All AI detection (face/gaze/emotion/objects) happens on the **student/agent
  side**; this dashboard is the teacher console that consumes those results.
- Alert reports export to CSV from the Alert Center.
