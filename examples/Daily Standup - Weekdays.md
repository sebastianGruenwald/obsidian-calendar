---
date: 2025-01-06
time: "09:00"
recurrence: daily
recurrenceDays: [1, 2, 3, 4, 5]
tags:
  - calendar
  - meeting
color: blue
---

# Daily Standup (Weekdays Only)

Our daily team standup happens every weekday (Monday through Friday) at 9:00 AM.

## Agenda
- What did you do yesterday?
- What will you do today?
- Any blockers?

## Notes
This meeting does not occur on weekends - only Monday through Friday.

The `recurrenceDays` property can be specified in several ways:
- As numbers: `[1, 2, 3, 4, 5]` (0=Sun, 1=Mon, ..., 6=Sat)
- As day names: `["Mon", "Tue", "Wed", "Thu", "Fri"]`
- As a string: `"Mon,Tue,Wed,Thu,Fri"`
