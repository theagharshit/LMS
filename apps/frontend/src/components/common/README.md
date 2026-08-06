# 🧩 `src/components/common/` Directory Overview

This directory contains shared UI layout components and global application widgets.

---

## 📄 Files in `src/components/common/`

- **`AcademicCalendarView.tsx`**: Interactive calendar component showing Nepalese school term holidays, exam dates, sports week events, and routine schedules.
- **`Header.tsx`**: Main top navigation bar displaying active role indicator, user profile avatar switcher, quick search, and notification triggers.
- **`MessagesView.tsx`**: Student-Teacher-Parent chat and messaging channels interface with real-time thread rendering.
- **`NotificationDrawer.tsx`**: Slide-over drawer listing recent school announcements, grade returns, and homework reminders.
- **`Sidebar.tsx`**: Left navigation menu for switching views. 
  - *Layout*: Uses a floating `fixed` / `sticky` layout (margin offset and `rounded-2xl`) so it appears as a floating island separated from the screen edge.
  - *Environment Logic*: Uses `import.meta.env.DEV` to display a detailed "Current Context" debugging box in Development mode, but switches to a clean "Welcome Back 👋" banner in Production.
