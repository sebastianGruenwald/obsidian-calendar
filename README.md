# Calendar View Plugin

A modern, beautiful calendar view plugin for Obsidian that displays and manages your notes by date.

![Calendar View](https://img.shields.io/badge/version-2.0.0-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-1.0.0+-purple)

## ✨ Features

- **Modern UI**: Clean, responsive design with smooth animations
- **Tag-based filtering**: Display only pages with a specific tag (e.g., `#calendar`)
- **Flexible date property**: Use any frontmatter property to specify dates
- **Interactive calendar**: Click on dates to view and manage associated notes
- **Quick note creation**: Create new notes directly from the calendar
- **Week numbers**: Optional ISO week number display
- **Customizable week start**: Choose Sunday or Monday as the first day
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

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Tag Filter | Tag to filter pages by (without #) | `calendar` |
| Date Property | Frontmatter property containing the date | `date` |
| Note Folder | Folder for new calendar notes | (vault root) |
| Date Format | Format for dates in note titles | `YYYY-MM-DD` |
| Note Template | Template for new notes | `# {{title}}...` |
| Week Starts On | First day of the week | Monday |
| Show Week Numbers | Display ISO week numbers | Off |
| Accent Color | Custom accent color (hex) | (theme default) |

### Creating Calendar Notes

Create notes with the specified tag and date property in the frontmatter:

```markdown
---
date: 2024-01-15
tags:
  - calendar
---

# My Calendar Event

This note will appear on January 15, 2024 in the calendar view.
```

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

## 🛠️ Development

### Project Structure

```
src/
├── main.ts          # Plugin entry point and settings
├── calendar-view.ts # Main calendar view component
├── calendar-core.ts # Date calculations and file queries
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

## 📝 Changelog

### 2.0.0

- Complete UI redesign with modern styling
- Reorganized project structure with proper separation of concerns
- Added week numbers support
- Added configurable week start day (Sunday/Monday)
- Added custom accent color setting
- Added note template customization
- Improved TypeScript strict mode support
- Updated dependencies to latest versions
- Performance improvements with debounced refresh

### 1.0.x

- Initial release with basic calendar functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details