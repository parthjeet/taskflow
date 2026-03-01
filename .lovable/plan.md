

# TaskFlow — Final Implementation Plan

## Overview
A DevOps task management app for a team of 6 engineers. All data persisted in localStorage via a mock API layer (easily swappable to a real backend). Built with React, TypeScript, Tailwind CSS, and shadcn/ui components.

---

## Pages & Navigation

### Header
- Persistent top header: "TaskFlow" logo + nav links: **Dashboard**, **Team**, **Settings**
- Clean, minimal design

### 1. Dashboard (`/`)
- **"New Task" button** → opens create-task dialog
- **Filter bar**: Status dropdown, Priority dropdown, Assigned To dropdown (includes "Unassigned" option), text search (searches title, description, and GEAR ID)
- **Sort dropdown**: Recently Updated, Priority, Status
- **Task card grid** — 3 cols desktop, 2 tablet, 1 mobile
- Each card: title, priority badge (High=red, Medium=yellow, Low=blue), status badge (To Do=gray, In Progress=blue, Blocked=red, Done=green), GEAR ID, assignee, sub-task progress bar, relative/absolute date
- **Blocked tasks**: 3px solid red (#EF4444) border + red shadow, blocking reason truncated to ~50 chars with "..."
- Click card → task detail page
- Empty state: specific messages like "No tasks match your filters" or "No tasks yet — create your first task!"

### 2. Task Detail (`/tasks/:id`)
- Back button, Edit & Delete buttons in header
- Full task info: title, description, status, priority, GEAR ID, assignee
- If blocked: red callout box with full blocking reason
- **Sub-tasks**: checkboxes (toggleable), strikethrough on completed items, progress bar, inline add/delete
- **Daily Updates**: timestamped log with author name, relative dates for recent / absolute for older; add via dialog with Author dropdown (active team members) + text field; edit/delete only within 24 hours; "(edited)" indicator
- Confirmation dialog for task deletion

### 3. Team Members (`/team`)
- Cards: name, email, active/inactive badge, assigned task count, edit/delete buttons
- Add Member dialog: name, email, active toggle
- Cannot delete members with assigned tasks → shows specific error message
- Empty state message

### 4. Settings (`/settings`)
- Disabled database config fields (host, port, db name, username, password)
- Info banner: "Settings will be functional when connected to real backend"

---

## Task Form (Create & Edit Dialog)
- Fields: Title (required), Description, Status, Priority, Assigned To (active members), GEAR ID (4-digit)
- When status = "Blocked": red-highlighted blocking reason textarea appears (required)
- Blocking reason auto-clears when changing away from Blocked
- **Validation**: field-level errors below each input + form-level error banner at top
- GEAR ID must be exactly 4 digits if provided
- Loading state on submit, Esc closes dialog

---

## Mock API Layer
- localStorage-backed module, all methods return Promises with 300-500ms simulated delays
- Pre-populated seed data: 6 tasks (2 blocked), 3 team members, sub-tasks, daily updates
- Swappable to real API by changing one import
- Enforces: blocked reason required, no deleting members with tasks, 24-hour edit window on updates

---

## Key UX Details
- **Dates**: relative ("2 hours ago") for <7 days, absolute ("Feb 14") for older
- **Search**: matches title, description, and GEAR ID
- **Toasts** for success/error feedback on all actions
- **Confirmation dialogs** for all delete actions
- **Esc key** closes all dialogs
- **Loading spinners** during data fetches
- **Fully responsive** layout

