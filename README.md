# Calendar View Plugin

A modern, beautiful calendar view plugin for Obsidian that displays and manages your notes by date. Features recurring events, event colors, time support, search, multiple view modes, and more.

![Calendar View](https://img.shields.io/badge/version-2.0.0-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-1.0.0+-purple)

## ✨ Features

### Core Features
- **Modern UI**: Clean, responsive design with smooth animations
- **Tag-based filtering**: Display only pages with a specific tag (e.g., `#calendar`)
- **Multiple tags**: Filter by multiple tags with AND/OR logic
- **Flexible date property**: Use any frontmatter property to specify dates
- **Interactive calendar**: Click on dates to view and manage associated notes
- **Quick note creation**: Create new notes directly from the calendar
- **Search & Filter**: Real-time search across event titles

### View Modes
- **Month View**: Traditional monthly calendar grid
- **Week View**: Expanded view of the current week with event details
- **Day View**: Timeline view with hourly breakdown

### Event Features
- **Event Colors**: Assign colors to events via frontmatter
- **Time Support**: Display event times from frontmatter
- **Recurring Events**: Support for daily, weekly, monthly, and yearly recurrence (perfect for jour fixe meetings)
- **Multiple Dates**: Single note can appear on multiple specific dates
- **Date Ranges**: Events can span multiple days with start and end dates
- **Hover Preview**: Preview note content on hover

### Customization
- **Week numbers**: Optional ISO week number display
- **Customizable week start**: Choose Sunday or Monday as the first day
- **Locale support**: Display dates in your preferred language
- **Theme integration**: Automatically adapts to your Obsidian theme
- **Custom accent color**: Personalize the calendar's accent color
- **Auto-refresh**: Automatically updates when files change

## 📥 Installation

### Manual Installation

1. Download the latest release from the GitHub releases page
2. Extract `main.js`, `styles.css`, and `manifest.json` to your Obsidian plugins folder: 
   `{vault}/.obsidian/plugins/calendar-view-plugin/`
3. Enable the plugin in Obsidian's Community Plugins settings

### Development Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/obsidian-calendar.git

# Navigate to the project
cd obsidian-calendar

# Install dependencies
npm install

# Build for production
npm run build

# Or start development mode with file watching
npm run dev
```

## 🚀 Usage

### Setup

1. Enable the plugin in Obsidian's Community Plugins settings
2. Click the calendar icon in the ribbon or use the command palette
3. Configure settings to match your workflow

### Settings Overview

#### Data Settings
| Setting | Description | Default |
|---------|-------------|---------|
| Tag Filter | Tag(s) to filter pages by (without #) | `calendar` |
| Multiple Tags | Enable filtering by multiple tags | Off |
| Tag Filter Mode | How multiple tags are matched (AND/OR) | AND |
| Date Property | Frontmatter property containing the date | `date` |

#### Time & Recurrence
| Setting | Description | Default |
|---------|-------------|---------|
| Enable Time | Show event times | Off |
| Time Property | Frontmatter property for time | `time` |
| Enable Recurring | Support recurring events | Off |
| Recurring Property | Frontmatter property for recurrence | `recurring` |

#### Date Ranges & Colors
| Setting | Description | Default |
|---------|-------------|---------|
| Enable Date Ranges | Events can span multiple days | Off |
| End Date Property | Frontmatter property for end date | `endDate` |
| Enable Colors | Color-code events | Off |
| Color Property | Frontmatter property for color | `color` |
| Default Event Color | Default color for all events | Blue |

#### Display Settings
| Setting | Description | Default |
|---------|-------------|---------|
| Note Folder | Folder for new calendar notes | (vault root) |
| Date Format | Format for dates in note titles | `YYYY-MM-DD` |
| Note Template | Template for new notes | `# {{title}}...` |
| Locale | Language for date formatting | en-US |
| Week Starts On | First day of the week | Monday |
| Show Week Numbers | Display ISO week numbers | Off |
| Show Preview on Hover | Preview notes on hover | Off |
| Accent Color | Custom accent color (hex) | (theme default) |

### Creating Calendar Notes

#### Basic Event
```markdown
---
date: 2024-01-15
tags:
  - calendar
---

# Team Meeting

This note will appear on January 15, 2024 in the calendar view.
```

#### Event with Time
```markdown
---
date: 2024-01-15
time: "14:30"
tags:
  - calendar
---

# Doctor Appointment

Appears at 2:30 PM on January 15th.
```

#### Colored Event
```markdown
---
date: 2024-01-15
color: red
tags:
  - calendar
---

# Important Deadline

This event will appear in red.
```

Available colors: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `gray`

#### Recurring Event
```markdown
---
date: 2024-01-15
recurrence: weekly
tags:
  - calendar
---

# Weekly Standup

Repeats every week starting January 15th.
```

Recurrence options: `daily`, `weekly`, `monthly`, `yearly`, `none`

**Examples:**
- `daily`: Every day (e.g., daily standup meetings)
- `weekly`: Every week on the same day (e.g., weekly team meetings, jour fixe)
- `monthly`: Every month on the same date (e.g., monthly reviews)
- `yearly`: Every year on the same date (e.g., anniversaries, birthdays)

#### Multi-Day Event
```markdown
---
date: 2024-01-15
endDate: 2024-01-17
tags:
  - calendar
---

# Conference

Spans from January 15th to 17th.
```

#### Multiple Dates Event
```markdown
---
date:
  - 2024-01-10
  - 2024-01-17
  - 2024-01-24
  - 2024-01-31
tags:
  - calendar
---

# Training Sessions

This single note appears on multiple specific dates.
Perfect for tracking related events without creating separate files.
```

**Use Cases for Multiple Dates:**
- Training sessions on specific dates
- Important milestone dates for a project
- Multiple appointments or meetings
- Non-recurring events that happen on specific dates

### Multiple Tags Filtering

Enable "Multiple Tags" in settings, then specify tags comma-separated:

- `calendar, meeting` with AND mode: Shows notes with BOTH tags
- `calendar, meeting` with OR mode: Shows notes with EITHER tag

### Date Format Tokens

Use these tokens in the Date Format setting:

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MMMM` | Full month name | January |
| `MMM` | Short month name | Jan |
| `MM` | Month (2-digit) | 01 |
| `DD` | Day (2-digit) | 15 |
| `dddd` | Full weekday | Monday |
| `ddd` | Short weekday | Mon |

### Supported Locales

- English (US): `en-US`
- English (UK): `en-GB`
- German: `de-DE`
- French: `fr-FR`
- Spanish: `es-ES`
- Japanese: `ja-JP`
- Chinese: `zh-CN`

## 🛠️ Development

### Project Structure

```
src/
├── main.ts          # Plugin entry point and settings
├── calendar-view.ts # Main calendar view component
├── calendar-core.ts # Date calculations and file queries
├── event-bus.ts     # Event bus for decoupled communication
├── types.ts         # TypeScript interfaces
├── utils.ts         # Utility functions
└── styles.css       # Modern CSS styles
```

### Scripts

```bash
npm run dev      # Development mode with watch
npm run build    # Production build
npm run lint     # TypeScript type checking
npm run clean    # Remove build artifacts
```

### Tech Stack

- TypeScript 5.x with strict mode
- ESBuild for fast bundling
- Modern CSS with CSS variables
- Obsidian API
- Event Bus pattern for component communication

## 📝 Changelog

### 2.0.0

**New Features:**
- 🔍 **Search & Filter**: Real-time search across all events
- 📅 **Multiple View Modes**: Month, Week, and Day views
- 🎨 **Event Colors**: Color-code events via frontmatter
- ⏰ **Time Support**: Display event times
- 🔄 **Recurring Events**: Daily, weekly, monthly, yearly recurrence
- 📆 **Date Ranges**: Multi-day event support
- 👁️ **Hover Preview**: Preview note content on hover
- 🏷️ **Multiple Tags**: Filter by multiple tags with AND/OR logic
- 🌍 **Locale Support**: Display dates in your language

**Improvements:**
- Complete UI redesign with modern styling
- Event Bus architecture for better code organization
- Reorganized project structure with proper separation of concerns
- Settings validation with feedback
- Enhanced TypeScript type safety
- Performance improvements with caching and debouncing

### 1.x.x

- Initial release with basic calendar functionality
- Week numbers support
- Configurable week start day (Sunday/Monday)
- Custom accent color setting
- Note template customization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details