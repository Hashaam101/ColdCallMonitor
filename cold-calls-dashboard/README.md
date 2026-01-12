# Cold Calls Dashboard

A modern, feature-rich web dashboard for managing and tracking cold call data. Built with real-time updates, team collaboration, and powerful data management capabilities.

![Dashboard](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Appwrite](https://img.shields.io/badge/Appwrite-Backend-pink?style=flat-square&logo=appwrite)

---

## ✨ Features

### 📊 Data Management

- **Interactive Data Table** — View all cold calls in a feature-rich table with:
  - Resizable columns (drag to resize, double-click to auto-fit)
  - Column visibility toggle to show/hide specific fields
  - Drag-and-drop column reordering
  - Persistent column preferences saved to local storage
  - Inline editing for quick updates
  - Click-to-sort on any column (ascending/descending)

- **Advanced Filtering** — Narrow down results with:
  - Date range picker with dual calendar view
  - Interest level filters (High 7-10, Medium 4-6, Low 1-3)
  - Multi-select call outcome filtering
  - Claimed by filter (My Claims, Unclaimed, by team member)
  - Active filter pills for easy removal
  - Full-text search across company, recipient, location, and summary

- **Bulk Actions** — Perform operations on multiple records:
  - Bulk export to CSV
  - Bulk delete with confirmation
  - Bulk outcome changes
  - Bulk claim/unclaim

### 👥 Team Collaboration

- **Claim System** — Assign cold calls to team members:
  - Click to claim a call as your own
  - Visual indicators showing who claimed what
  - Avatar display with team member initials
  - Filter to see only your claims or unclaimed calls

- **Team Member Management** — Role-based access with admin and member roles

### 🔔 Alerts & Reminders

- **Custom Alerts** — Set reminders on any cold call:
  - Schedule alerts for a specific date/time
  - Instant alerts for immediate action items
  - Custom alert messages
  - Bell notification in header with unread count

- **Alerts Page** — Dedicated view for managing all alerts:
  - Overview stats (Total Active, Due Now, Scheduled, Need Action)
  - Mark alerts as done/dismissed
  - Delete completed alerts
  - Quick navigation to related cold call

### 🎨 User Experience

- **Modern UI** — Clean, professional design with:
  - Light and dark theme support
  - Responsive layout for all screen sizes
  - Smooth animations and transitions
  - Glassmorphism header with backdrop blur

- **Collapsible Sidebar** — Space-efficient navigation:
  - Expand/collapse with button or keyboard shortcut
  - Tooltip labels when collapsed
  - Badge indicators for alerts
  - "Coming soon" labels for future features

- **Keyboard Shortcuts**:
  - `?` — Show keyboard shortcuts dialog
  - `Ctrl + B` — Toggle sidebar
  - `G` then `H` — Navigate to home
  - `Esc` — Close dialogs

- **Call Details Sheet** — Slide-out panel showing full call information:
  - Complete transcript view
  - All call metadata at a glance
  - Quick action buttons
  - Set alerts directly from details view

### 📈 Dashboard Stats

- **At-a-Glance Metrics**:
  - Total calls count
  - Interested leads count
  - Follow-ups needed
  - Average interest level
  - Trend indicators with percentages

### 🔄 Real-Time Updates

- **Live Sync** — Changes made by team members appear instantly:
  - Real-time database subscriptions via Appwrite
  - Automatic UI updates without page refresh
  - Synced across all connected users

### 🔐 Authentication

- **Secure Login** — Email/password authentication:
  - Protected routes with automatic redirect
  - User profile in header with dropdown menu
  - Session management and secure logout

---

## 🗂️ Data Fields Tracked

The dashboard uses a normalized database schema. Cold calls reference a separate companies table:

### Cold Call Fields

| Field | Description |
|-------|-------------|
| Company | Company name (from linked company record) |
| Recipients | Person(s) spoken to |
| Call Outcome | Result (Interested, Not Interested, Callback, No Answer, Wrong Number, Other) |
| Interest Level | 1-10 rating of prospect interest |
| Summary | AI-generated call summary |
| Follow-up Actions | Next steps to take |
| Claimed By | Team member who owns the follow-up |
| Date | When the call was recorded |

### Company Fields (Separate Table)

| Field | Description |
|-------|-------------|
| Company Name | Name of the company contacted |
| Owner Name | Decision maker / company owner |
| Location | Company location |
| Google Maps Link | Location link for easy navigation |

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | Radix UI Primitives |
| Backend | Appwrite (Database, Auth, Realtime) |
| State | TanStack Query (React Query) |
| Notifications | Sonner Toast |
| Date Handling | date-fns |

---

## 🚀 Roadmap

The following features are planned for future releases:

- 📊 **Analytics Dashboard** — Visualize call performance, conversion rates, and trends
- 👥 **Team Management** — Add/remove team members, manage roles
- 📅 **Schedule View** — Calendar view of follow-ups and scheduled calls
- ⚙️ **Settings** — Customize preferences, notifications, and integrations