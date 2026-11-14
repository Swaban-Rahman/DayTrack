# DayTrack – Personal Productivity & Task Management App

**DayTrack** is a Windows desktop productivity application designed to help users organize daily tasks, track working time, manage priorities, and analyze productivity.

It provides an offline-first experience with local SQLite storage, allowing users to manage their daily workflow without depending on an internet connection.

## Features

### Task Management
- Create, update, and delete daily tasks.
- Organize tasks by category and priority.
- Set deadlines and estimated completion times.
- Add notes and track task completion status.
- Keep track of pending tasks.

### Time Tracking
- Start, pause, resume, and stop task timers.
- Track actual time spent on tasks.
- Compare estimated time with actual working time.
- Preserve timer-related data across application restarts.

### Daily Planning
- Plan tasks for the next day.
- Save notes for upcoming tasks.
- Review pending tasks and daily plans.

### Productivity Analysis
- Monitor daily productivity.
- Review completed and pending tasks.
- Analyze estimated versus actual working time.
- View productivity reports over different periods.

### Reminders
- Get reminders about unfinished tasks.
- Receive reminders when a next-day plan needs to be saved.
- Support application and Windows lifecycle events where configured.

### Local Data Storage
- Uses SQLite for persistent local storage.
- Works offline.
- Keeps application data on the local machine.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe development |
| Vite | Frontend build tool |
| Electron | Windows desktop application |
| SQLite | Local database |
| better-sqlite3 | SQLite database integration |
| electron-builder | Windows application packaging |

## Project Structure

```text
daytrack/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── ...
├── electron/
│   ├── main.ts
│   └── preload.ts
├── scripts/
├── public/
├── dist/
├── dist-electron/
├── release/
├── package.json
└── README.md
```

*The exact directory structure may vary depending on the current implementation.*

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone <https://github.com/Swaban-Rahman/DayTrack.git>
```

### 2. Navigate to the Project

```bash
cd daytrack
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run in Development Mode

```bash
npm run dev
```

### 5. Build for Windows

```bash
npm run package
```

The Windows installer will be generated inside the `release/` directory.

## Available Scripts

| Command | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Build the frontend |
| `npm run preview` | Preview the production frontend |
| `npm run package` | Build and package the Windows application |
| `npm run make-icon` | Generate the application icon |

## Data Storage

DayTrack uses SQLite to store application data locally.

Your tasks, notes, and productivity records are intended to remain available between application sessions.

**Note:** Keep your application data directory safe when updating or reinstalling the application.

## Platform

- Windows Desktop
- x64 architecture

## Project Goal

The goal of DayTrack is to make daily productivity management simpler by combining task planning, time tracking, reminders, and productivity analysis in one desktop application.

## Future Improvements

- More detailed productivity analytics.
- Improved reminder scheduling.
- Advanced weekly and monthly reports.
- Additional customization options.
- Enhanced task organization.

## Author

**S. R. Daniel**

Computer Science & Engineering Student

---

*DayTrack – Plan your day. Track your progress. Improve your productivity.*
