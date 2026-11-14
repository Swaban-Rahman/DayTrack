# DayTrack – Personal Productivity & Task Management Desktop Application

<p align="center">
  <strong>Plan Your Day. Track Your Time. Improve Your Productivity.</strong>
</p>

DayTrack is a Windows-based desktop productivity and task management application built to help users organize their daily activities, manage unfinished tasks, plan the next day, track working time, and analyze their productivity.

The main purpose of DayTrack is to provide a centralized workspace where users can manage their daily tasks and monitor how effectively they spend their time.

Unlike a traditional web-based task manager, DayTrack is designed as a desktop application using Electron. It uses SQLite for local data storage, allowing users to maintain their productivity records directly on their computer.

---

# Table of Contents

1. [Project Overview](#project-overview)
2. [Project Objectives](#project-objectives)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Why These Technologies Were Used](#why-these-technologies-were-used)
6. [Application Architecture](#application-architecture)
7. [How the Application Works](#how-the-application-works)
8. [Task Management System](#task-management-system)
9. [Time Tracking System](#time-tracking-system)
10. [Daily Planning and Notes](#daily-planning-and-notes)
11. [Reminder and Notification System](#reminder-and-notification-system)
12. [Database and Data Persistence](#database-and-data-persistence)
13. [Productivity Analysis](#productivity-analysis)
14. [Project Setup](#project-setup)
15. [Available Commands](#available-commands)
16. [Building the Windows Application](#building-the-windows-application)
17. [Project Structure](#project-structure)
18. [Future Improvements](#future-improvements)
19. [Author](#author)

---

# Project Overview

DayTrack is developed to solve a common productivity problem: people often create task lists but struggle to track their progress, remember unfinished work, and understand how much time they actually spend on different activities.

DayTrack combines several productivity-related functionalities into one desktop application.

The application focuses on four major areas:

- **Task Organization:** Create, manage, categorize, prioritize, and complete tasks.
- **Time Management:** Track the actual time spent working on individual tasks.
- **Daily Planning:** Prepare tasks and notes for the next day.
- **Productivity Monitoring:** Review completed tasks, pending work, and time usage.

The application is designed to work locally on Windows and store user data in an SQLite database.

# Project Objectives

The main objectives of DayTrack are:

1. Make daily task management easier and more organized.
2. Help users identify and prioritize important tasks.
3. Track actual working time instead of relying only on estimated time.
4. Reduce the possibility of forgetting unfinished tasks.
5. Encourage users to prepare their next-day plans in advance.
6. Preserve task and timer information across application restarts.
7. Provide productivity insights through daily, weekly, and monthly analysis.
8. Provide a desktop-based experience without requiring a continuously available internet connection.

# Key Features

## 1. Task Management

DayTrack provides a task management system that allows users to organize their daily activities.

Users can:

- Create new tasks.
- Update existing tasks.
- Delete unnecessary tasks.
- Assign categories to tasks.
- Set task priorities.
- Add deadlines.
- Set estimated completion times.
- Add additional notes.
- Track task completion status.
- Identify pending and completed tasks.

**Purpose:** To help users organize their responsibilities and maintain a clear overview of their daily workload.

## 2. Task Priority Management

Tasks can be organized according to their importance.

Priority management helps users identify which activities should be completed first.

For example:

- High Priority – Important tasks that require immediate attention.
- Medium Priority – Tasks that should be completed within the planned schedule.
- Low Priority – Less urgent tasks that can be completed later.

**Purpose:** To support better decision-making when multiple tasks need attention.

## 3. Time Tracking

DayTrack includes a timer-based time tracking system.

Users can start a timer when they begin working on a task.

The timer supports:

- Start
- Pause
- Resume
- Stop

The application records the time spent on tasks so users can understand how long different activities actually take.

It also supports comparing estimated completion time with actual working time.

**Example:**

| Task | Estimated Time | Actual Time |
|---|---:|---:|
| Complete assignment | 2 hours | 2.5 hours |
| Practice React | 1 hour | 1.5 hours |
| Read documentation | 30 minutes | 25 minutes |

**Purpose:** To help users understand their time usage and improve future task estimation.

## 4. Daily Planning

Daily planning allows users to prepare their work in advance.

Users can organize tasks for the current day and prepare a plan for the following day.

This helps maintain continuity between work sessions.

**Purpose:** To make it easier to start working without spending unnecessary time deciding what to do next.

## 5. Next-Day Notes

The application provides a facility to save notes for the next day.

Users can write important instructions, reminders, or additional information related to their upcoming activities.

The notes are intended to be stored persistently so they remain available when the application is opened again.

**Purpose:** To help users remember important information and prepare for upcoming work.

## 6. Pending Task Reminders

DayTrack is designed to remind users about unfinished tasks.

For example, if two tasks remain incomplete, the application can notify the user that pending work still exists.

The user can choose to review the tasks or use the "Remind Me Later" option.

Dismissing a reminder should not mark a task as completed.

**Purpose:** To reduce the chance of forgetting unfinished work.

## 7. Next-Day Planning Reminder

The application is also designed to remind users to save their next-day plan when one has not been prepared.

This reminder is intended to work alongside pending-task reminders.

For example:

- Two tasks are still pending.
- No plan has been saved for tomorrow.

The application should be able to communicate both conditions instead of showing only one reminder.

**Purpose:** To encourage consistent daily planning.

## 8. Productivity Reports

DayTrack aims to provide productivity information across different time periods.

The reporting system is intended to help users understand:

- How many tasks were completed.
- How many tasks remain pending.
- How much time was spent working.
- How actual time compares with estimated time.
- How productivity changes over time.

The reporting periods include:

- Daily
- Weekly
- Monthly

**Purpose:** To help users evaluate their productivity and identify areas that need improvement.

---

# Technology Stack

DayTrack uses the following technologies:

| Technology | Role in the Project |
|---|---|
| React | Frontend user interface |
| TypeScript | Type-safe application development |
| Vite | Development server and build tool |
| Electron | Desktop application framework |
| Node.js | Backend runtime environment |
| SQLite | Local relational database |
| better-sqlite3 | SQLite integration with Node.js |
| electron-builder | Windows application packaging |
| npm | Dependency and package management |

# Why These Technologies Were Used

## 1. React

**What is React?**

React is a JavaScript library used to build interactive user interfaces.

**Why was it used in DayTrack?**

DayTrack contains multiple interactive elements, including task lists, forms, buttons, timers, reminders, and productivity information.

React makes it easier to build these elements as reusable components.

**How it works in the project:**

- Renders the application interface.
- Displays task information.
- Handles user interactions.
- Updates the interface when application data changes.
- Manages interactive UI states using React hooks.
- Supports reusable components.

For example, when a user marks a task as completed, React can update the displayed task status without requiring the entire application to reload.

## 2. TypeScript

**What is TypeScript?**

TypeScript is a programming language built on JavaScript that adds static type checking.

It helps developers identify certain programming errors during development.

**Why was it used in DayTrack?**

DayTrack manages different types of information, such as:

- Task IDs
- Task titles
- Task priorities
- Deadlines
- Time values
- Completion statuses
- Notes
- Database records

TypeScript helps maintain consistency when working with this information.

**How it works in the project:**

- Defines data types and interfaces.
- Helps prevent incorrect data usage.
- Provides better code completion.
- Improves code readability.
- Makes application maintenance easier.

Example:

```typescript
interface Task {
  id: number;
  title: string;
  priority: string;
  completed: boolean;
  estimatedTime: number;
}
```

This interface describes the expected structure of a task object.

## 3. Vite

**What is Vite?**

Vite is a modern frontend development and build tool.

It provides a fast development server and optimizes frontend files for production.

**Why was it used in DayTrack?**

Vite makes React development faster and provides an efficient production build process.

**How it works in the project:**

- Starts the frontend development server.
- Processes React and TypeScript source files.
- Bundles frontend assets.
- Generates optimized production files.
- Produces the frontend output inside the `dist` directory.

Development command:

```bash
npm run dev
```

Production frontend build:

```bash
npm run build
```

## 4. Electron

**What is Electron?**

Electron is a framework for building desktop applications using web technologies such as HTML, CSS, and JavaScript.

It combines Chromium for rendering the interface with Node.js capabilities for desktop operations.

**Why was it used in DayTrack?**

DayTrack is intended to run as a Windows desktop application rather than only inside a browser.

Electron allows the React interface to run inside a native desktop application window.

**How it works in the project:**

Electron provides two important execution environments:

### Main Process

The main process controls the desktop application.

It is responsible for operations such as:

- Creating and managing application windows.
- Managing the application lifecycle.
- Interacting with operating-system functionality.
- Handling application startup and shutdown.
- Managing native desktop notifications.
- Communicating with the renderer process.
- Accessing local application resources.

### Renderer Process

The renderer process displays the user interface.

In DayTrack, React runs inside the Electron renderer process.

It handles:

- Task-related screens.
- Forms and buttons.
- User interactions.
- Timers and displayed information.
- Application navigation.

### Preload Script

The preload script provides a controlled communication bridge between the renderer process and the Electron main process.

This is important because Electron applications should not expose unrestricted Node.js functionality directly to the frontend.

The preload script can expose selected APIs that the React application needs.

**Overall purpose:** Electron connects the web-based frontend with desktop application capabilities.

## 5. Node.js

**What is Node.js?**

Node.js is a JavaScript runtime environment that allows JavaScript to execute outside a web browser.

**Why is it used in DayTrack?**

Electron uses Node.js in its main process to perform desktop-related operations.

It also allows the application to interact with local resources and native modules.

Examples include:

- Accessing the SQLite database.
- Managing application files.
- Handling system-level events.
- Running desktop application logic.

## 6. SQLite

**What is SQLite?**

SQLite is a lightweight relational database management system.

Unlike many database systems, SQLite does not require a separate database server.

It stores information in a local database file.

**Why was it used in DayTrack?**

DayTrack is designed as an offline-first productivity application.

SQLite is suitable because it:

- Stores data locally.
- Does not require a separate database server.
- Supports structured relational data.
- Works without an internet connection.
- Provides persistent data storage.

**What kind of data can be stored?**

- Tasks
- Task priorities
- Task categories
- Deadlines
- Completion status
- Time tracking records
- Daily planning information
- Notes

The exact database schema depends on the implemented application code.

## 7. better-sqlite3

**What is better-sqlite3?**

better-sqlite3 is a Node.js library that provides an interface for working with SQLite databases.

It allows Node.js applications to execute SQL queries directly.

**Why was it used in DayTrack?**

Electron's main process needs a way to communicate with the local SQLite database.

better-sqlite3 provides this integration.

**How it works in the project:**

1. The application opens a local SQLite database.
2. The main process executes SQL queries.
3. Data is inserted, updated, retrieved, or deleted.
4. The application sends the required result to the frontend through the application's communication layer.

Example:

```javascript
const Database = require("better-sqlite3");

const db = new Database("daytrack.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )
`);
```

This example demonstrates creating a simple task table. It is illustrative and does not necessarily represent the exact schema used in DayTrack.

**Important:** better-sqlite3 is a native Node.js dependency. It must be compatible with the Electron version when building the desktop application. The project uses electron-builder's dependency installation/rebuild process to handle this.

## 8. electron-builder

**What is electron-builder?**

electron-builder is a packaging and distribution tool for Electron applications.

**Why was it used in DayTrack?**

A desktop application should be distributable as an installable Windows program.

electron-builder packages the Electron application and its required resources into a Windows installer.

**How it works in the project:**

- Packages the Electron application.
- Includes the built frontend files.
- Includes Electron main and preload files.
- Handles native dependencies.
- Generates Windows application files.
- Creates an NSIS installer.

The project generates a Windows installer using:

```bash
npm run package
```

The installer is generated inside the `release` directory.

---

# Application Architecture

DayTrack follows a desktop application architecture in which the React frontend communicates with Electron's main process.

The main process handles desktop operations and database access.

The database stores the application's persistent information.

```text
                 DAYTRACK APPLICATION
                         |
             +-----------+-----------+
             |                       |
        React Frontend          Electron Main
        (Renderer Process)      (Main Process)
             |                       |
      User Interactions       Desktop Operations
      Task Management         Application Lifecycle
      Timers                  Notifications
      Daily Planning          Database Operations
             |                       |
             +------ Communication --+
                                     |
                              better-sqlite3
                                     |
                                  SQLite
                                     |
                              Local Database
```

## Architecture Components

### Frontend Layer

The frontend is responsible for displaying information and receiving user input.

It includes:

- Application screens.
- Task management interface.
- Forms.
- Buttons.
- Timers.
- Reports.
- Reminder-related UI.

### Desktop Application Layer

The Electron main process manages desktop-specific functionality.

It is responsible for:

- Application window management.
- Desktop notifications.
- Application lifecycle events.
- Local database integration.
- Communication with the frontend.

### Database Layer

The database layer stores application information locally.

It ensures that information can be retrieved again after the application is closed and reopened.

---

# How the Application Works

A typical workflow in DayTrack looks like this:

**Step 1 – Open the Application**

The user launches DayTrack on Windows.

**Step 2 – Review Daily Tasks**

The user checks the tasks planned for the current day.

**Step 3 – Manage Tasks**

The user creates new tasks, updates existing tasks, sets priorities, and manages deadlines.

**Step 4 – Start Working**

When the user starts a task, they can start its timer.

**Step 5 – Track Progress**

The user pauses, resumes, or stops the timer as necessary.

**Step 6 – Complete Tasks**

After finishing a task, the user marks it as completed.

**Step 7 – Review Pending Tasks**

The user checks any unfinished tasks.

**Step 8 – Prepare Tomorrow's Plan**

Before ending the work session, the user saves tasks and notes for the following day.

**Step 9 – Review Productivity**

The user can review available productivity information to understand their progress.

---

# Task Management System

The task management system is one of the core modules of DayTrack.

Each task represents an activity that the user wants to complete.

A task can contain information such as:

| Field | Purpose |
|---|---|
| Task ID | Uniquely identifies a task |
| Title | Stores the task name |
| Category | Groups related tasks |
| Priority | Indicates task importance |
| Deadline | Defines the expected completion date |
| Estimated Time | Stores the planned duration |
| Notes | Stores additional information |
| Status | Indicates whether the task is completed |

The actual fields depend on the current database implementation.

## Task Lifecycle

```text
       Create Task
            |
            v
       Pending Task
            |
            v
       Start Working
            |
            v
       Track Time
            |
            v
       Complete Task
            |
            v
      Completed Task
```

If the task is not completed, it remains pending and can be reviewed later.

---

# Time Tracking System

Time tracking helps users understand the actual duration of their work.

For example, a user estimates that a programming task will take one hour but actually spends ninety minutes.

DayTrack can use this information to help compare estimated and actual working time.

## Timer Operations

| Operation | Description |
|---|---|
| Start | Begins tracking time |
| Pause | Temporarily stops the timer |
| Resume | Continues a paused timer |
| Stop | Ends the current tracking session |

A reliable timer should calculate elapsed time using timestamps rather than depending entirely on a continuously running screen counter.

This approach helps preserve accurate elapsed-time information when the application is interrupted or restarted.

---

# Daily Planning and Notes

Planning is an important part of DayTrack.

Users can prepare their upcoming activities before finishing the current work session.

The next-day planning system is intended to support:

- Saving upcoming tasks.
- Writing additional notes.
- Reviewing previously saved plans.
- Updating existing plans.
- Loading saved information in a later session.

The purpose is to make the next working session easier to begin.

---

# Reminder and Notification System

DayTrack is designed to help users remember unfinished work and missing daily plans.

## Pending Task Reminder

When unfinished tasks exist, the application can display a reminder about the remaining work.

## Missing Next-Day Plan Reminder

When the user has not saved a plan for the next day, the application is designed to remind them.

## Combined Reminder

If pending tasks exist and no next-day plan has been saved, both conditions should be included in the reminder.

## Remind Me Later

The user can dismiss the current reminder temporarily.

Dismissing a reminder should not:

- Complete a pending task.
- Delete a task.
- Save an empty plan.
- Permanently suppress future reminders.

## Windows Lifecycle Support

The intended reminder workflow considers different Windows application states:

- Application running.
- Application minimized or in the background.
- Windows lock and unlock.
- Sleep and resume.
- Windows restart and login.
- Application closed before the next login.

**Important limitation:** Windows cannot display an application notification while the computer is fully powered off. A reminder can be displayed after Windows starts and the user logs in, provided the required startup or scheduled-launch integration is configured.

---

# Database and Data Persistence

DayTrack uses SQLite through better-sqlite3 for local database operations.

## Why Persistent Storage Matters

Without persistent storage, application information may disappear when the application closes.

Persistent storage allows users to continue their work across multiple sessions.

For example:

1. A user creates a task.
2. The application saves the task in SQLite.
3. The user closes DayTrack.
4. The user opens DayTrack again.
5. The application retrieves the previously saved task.

## Data Operations

The database layer supports the common CRUD operations:

| Operation | Meaning | Example |
|---|---|---|
| Create | Insert new information | Create a task |
| Read | Retrieve stored information | Load today's tasks |
| Update | Modify existing information | Change task status |
| Delete | Remove information | Delete a task |

## Local Database Benefits

- No separate database server required.
- Offline data access.
- Persistent storage.
- Structured data management.
- Suitable for a single-user desktop application.

**Data safety:** Application updates and reinstallations should preserve the database stored in Electron's user data directory. Users should still maintain backups of important data.

---

# Productivity Analysis

Productivity analysis helps users understand their daily work patterns.

The intended analysis includes:

## Daily Analysis

- Tasks completed during the day.
- Remaining tasks.
- Time spent on activities.
- Estimated versus actual time.

## Weekly Analysis

- Weekly task completion.
- Total tracked working time.
- Changes in task completion patterns.

## Monthly Analysis

- Monthly productivity trends.
- Completed and pending task patterns.
- Time management comparisons.

These reports are intended to help users identify how effectively they manage their time.

---

# Project Setup

## Prerequisites

Before running DayTrack in development mode, install:

- Node.js
- npm
- Git

Check your installation:

```bash
node --version
npm --version
git --version
```

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
```

## 2. Navigate to the Project Directory

```bash
cd daytrack
```

## 3. Install Dependencies

```bash
npm install
```

This command installs the dependencies defined in `package.json`.

The project also uses a post-installation process to prepare native dependencies for Electron.

## 4. Run the Development Server

```bash
npm run dev
```

This starts the Vite development server.

**Note:** This command starts the Vite server. Whether the Electron window also opens depends on the project's development configuration.

## 5. Build the Frontend

```bash
npm run build
```

This generates optimized frontend production files.

## 6. Package the Windows Application

```bash
npm run package
```

This command builds the frontend and packages the Electron application for Windows.

---

# Available Commands

| Command | Function |
|---|---|
| `npm install` | Installs all required dependencies |
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Builds the frontend for production |
| `npm run preview` | Previews the production frontend |
| `npm run package` | Builds and packages the Windows application |
| `npm run make-icon` | Runs the application icon generation script |

---

# Building the Windows Application

DayTrack uses electron-builder to generate a Windows installer.

The packaging process includes several stages.

### Stage 1 – Frontend Build

Vite processes the React application and generates production assets inside:

```text
dist/
```

### Stage 2 – Electron Main Process Build

The Electron main process is compiled into:

```text
dist-electron/main.js
```

### Stage 3 – Electron Preload Build

The preload script is compiled into:

```text
dist-electron/preload.js
```

### Stage 4 – Native Dependency Preparation

The native SQLite dependency is prepared for the Electron runtime.

### Stage 5 – Application Packaging

electron-builder packages the application and generates the Windows distribution files.

### Output

The generated files are stored inside:

```text
release/
```

The Windows installer is expected to be named:

```text
DayTrack Setup 1.0.0.exe
```

The unpacked application is generated inside:

```text
release/win-unpacked/
```

---

# Project Structure

The following is a conceptual overview of the main project areas. Actual folder and file names may differ depending on the implementation.

```text
daytrack/
│
├── src/
│   ├── components/
│   │   └── Reusable UI Components
│   │
│   ├── pages/
│   │   └── Application Screens
│   │
│   ├── hooks/
│   │   └── Reusable React Hooks
│   │
│   ├── services/
│   │   └── Application Services
│   │
│   └── ...
│
├── electron/
│   ├── main.ts
│   │   └── Electron Main Process
│   │
│   └── preload.ts
│       └── Secure Communication Bridge
│
├── public/
│   └── Static Assets
│
├── scripts/
│   └── Utility Scripts
│
├── dist/
│   └── Frontend Production Build
│
├── dist-electron/
│   └── Compiled Electron Files
│
├── release/
│   └── Windows Installer and Packaged App
│
├── package.json
│   └── Dependencies and Scripts
│
└── README.md
```

---

# Future Improvements

Potential improvements for future versions include:

- More advanced productivity analytics.
- Improved weekly and monthly reporting.
- More flexible task categories.
- Customizable reminder schedules.
- Enhanced Windows startup integration.
- Better notification controls.
- Task search and filtering.
- Database backup and restore functionality.
- Exporting productivity reports.
- Improved application performance.

---

# Author

**S. R. Daniel**

Computer Science & Engineering Student

GitHub: https://github.com/Swaban-Rahman

---

# License

This project is currently maintained as a personal productivity application.

A license can be added when the project is prepared for public distribution.

---

<p align="center">
  <strong>DayTrack</strong><br/>
  Plan your day. Track your progress. Build better habits.
</p>
