# Example Calendar Pages

This folder contains example pages that demonstrate how to use the Calendar View Plugin, including recurring events and multiple dates features.

## Setup Instructions

1. Copy these files to your Obsidian vault
2. Install and enable the Calendar View Plugin
3. Open the Calendar View from the ribbon or command palette
4. Navigate to January/February 2025 to see the examples
5. The pages should appear on their respective dates in the calendar

## Example Files

### Basic Events

**Doctor Appointment - Jan 15.md**
- Simple event with time
- Shows basic calendar integration

**Team Meeting - Jan 15.md**
- Basic meeting note
- Standard event format

**Valentine's Day Dinner.md**
- Personal event example
- Date range demonstration

**Project Deadline - March 15.md**
- Project milestone example
- Future date event

### Recurring Events (New!)

**Daily Standup.md**
- Demonstrates `recurrence: daily`
- Shows daily recurring pattern
- Perfect for daily team syncs

**Weekly Team Standup.md**
- Demonstrates `recurrence: weekly`
- **Perfect example of "jour fixe" pattern**
- Weekly Monday meetings at 10:00 AM

**Monthly Review Meeting.md**
- Demonstrates `recurrence: monthly`
- Shows monthly recurring pattern
- Occurs on the 15th of each month

### Multiple Dates (New!)

**Training Sessions.md**
- Demonstrates multiple dates in one note
- Array of 4 specific dates in January
- Shows how to track related events without duplicate notes

**Important Dates.md**
- Multiple unrelated dates throughout the year
- Shows flexibility of the multiple dates feature
- Good for tracking various company events

### Advanced Example (New!)

**Advanced - Multiple Dates with Recurrence.md**
- Combines both multiple dates AND recurrence
- Creates multiple recurring series from one note
- Advanced scheduling scenario

## Page Format

### Basic Format
Each calendar page should have:
- The configured tag (default: `#calendar`)
- A date property in the frontmatter (default: `date`)

Example:
```markdown
---
date: 2024-01-15
tags:
  - calendar
---

# My Calendar Entry

This page will appear on January 15, 2024.
```

### Recurring Event Format
```markdown
---
date: 2025-01-06
recurrence: weekly
time: "10:00"
tags:
  - calendar
---

# Weekly Team Meeting

This meeting recurs every week starting from January 6, 2025.
```

Recurrence options:
- `daily` - Every day
- `weekly` - Every week (same day of week) - **Use this for jour fixe!**
- `monthly` - Every month (same date)
- `yearly` - Every year (same date)
- `none` - No recurrence (default)

### Multiple Dates Format
```markdown
---
date:
  - 2025-01-10
  - 2025-01-17
  - 2025-01-24
  - 2025-01-31
tags:
  - calendar
---

# Training Sessions

This note appears on all four dates in January.
```

## Testing the Examples

1. **Navigate to January 2025**: You'll see all the recurring and multi-date examples
2. **Click on dates**: See multiple events on dates with recurring patterns
3. **Check different weeks**: Weekly events appear consistently
4. **View month boundaries**: Monthly events cross month transitions

## Use Cases Demonstrated

1. **Daily Standups**: Regular daily team meetings
2. **Weekly Jour Fixe**: Fixed weekly appointment times
3. **Monthly Reviews**: Regular monthly planning sessions
4. **Training Series**: Multiple sessions for the same course
5. **Company Events**: Multiple important dates in one note
6. **Complex Scheduling**: Combined recurring and multiple dates

## Quick Tips

- Use `recurrence: weekly` for jour fixe meetings
- Use multiple dates array for non-recurring but related events
- Combine recurrence with time for scheduled events
- Use color property to categorize different types of events
- All recurring events start from their base date and go forward