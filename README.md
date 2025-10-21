# Calendar View Plugin

An Obsidian plugin that creates a calendar view from pages with specific tags, linking to dates via frontmatter properties.

## Features

- **Tag-based filtering**: Display only pages with a specific tag (e.g., `#calendar`)
- **Date property support**: Use any frontmatter property to specify dates
- **Interactive calendar**: Click on dates to view associated files
- **Auto-refresh**: Automatically updates when files are created, modified, or deleted
- **Customizable settings**: Configure the tag filter and date property name

## Installation

### Manual Installation

1. Download the latest release from the GitHub releases page
2. Extract the files to your Obsidian plugins folder: `{vault}/.obsidian/plugins/calendar-view-plugin/`
3. Enable the plugin in Obsidian's Community Plugins settings

### Development Installation

1. Clone this repository into your Obsidian plugins folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development build
4. Enable the plugin in Obsidian

## Usage

### Setup

1. Enable the plugin in Obsidian's Community Plugins settings
2. Configure the plugin settings:
   - **Tag Filter**: The tag to filter pages by (default: `calendar`)
   - **Date Property**: The frontmatter property containing the date (default: `date`)

### Creating Calendar Pages

Create pages with the specified tag and date property in the frontmatter:

```markdown
---
date: 2024-01-15
tags:
  - calendar
---

# My Calendar Page

This page will appear on January 15, 2024 in the calendar view.
```

### Using the Calendar

1. Open the calendar view by clicking the calendar icon in the ribbon or using the command palette
2. Navigate between months using the arrow buttons
3. Click on any date to view files associated with that date
4. Click on file names to open them

## Date Formats

The plugin supports various date formats:
- `2024-01-15` (ISO format)
- `January 15, 2024`
- `15/01/2024`
- Most standard date formats recognized by JavaScript's Date constructor

## Development

### Building the Plugin

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

This will start the development build with file watching.

## API

The plugin exposes the following settings:

- `tagFilter`: String - The tag to filter pages by (without the # symbol)
- `dateProperty`: String - The frontmatter property name containing the date

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT