# Create Note Feature

## Overview

Added the ability to create new calendar notes directly from the calendar view for any selected date.

## New Features

### 1. Create Note Button
- Appears when a date is selected in the calendar view
- Positioned prominently above the file list
- Styled with accent colors and hover effects

### 2. New Plugin Settings

#### Note Folder
- **Setting**: `noteFolder`
- **Default**: `""` (root folder)
- **Description**: Folder where new calendar notes should be created

#### Note Template
- **Setting**: `noteTemplate`
- **Default**: `"# {{title}}\n\nCreated on {{date}}"`
- **Description**: Template for new notes with placeholder variables
- **Variables**: 
  - `{{title}}` - Generated note title
  - `{{date}}` - Formatted date

#### Date Format
- **Setting**: `dateFormat`
- **Default**: `"YYYY-MM-DD"`
- **Description**: Date format for note titles and content
- **Supported patterns**:
  - `YYYY` - 4-digit year
  - `MM` - 2-digit month
  - `DD` - 2-digit day
  - `MMMM` - Full month name
  - `MMM` - Short month name
  - `dddd` - Full day name

## Functionality

### Note Creation Process

1. **Date Selection**: User clicks on a date in the calendar
2. **Create Button**: User clicks the "Create Note" button
3. **File Generation**: Plugin generates:
   - **Title**: "Calendar Note - [formatted date]"
   - **Filename**: Sanitized version of title with `.md` extension
   - **Path**: Combines note folder setting with filename
   - **Content**: Applies template with frontmatter

### Smart Features

#### Duplicate Prevention
- Checks if a note already exists for the date
- If exists, opens the existing note instead of creating a duplicate

#### Auto-folder Creation
- Automatically creates the specified folder if it doesn't exist
- Handles nested folder paths

#### Frontmatter Generation
- Automatically adds the configured tag (e.g., `#calendar`)
- Sets the date property with the selected date
- Ensures proper YAML frontmatter formatting

### Example Generated Note

With default settings, selecting January 15, 2024 creates:

**Filename**: `Calendar Note - 2024-01-15.md`

**Content**:
```markdown
---
date: 2024-01-15
tags:
  - calendar
---

# Calendar Note - 2024-01-15

Created on 2024-01-15
```

## User Experience

### Workflow
1. Open Calendar View
2. Navigate to desired month/year
3. Click on any date
4. Click "Create Note" button
5. New note opens in editor, ready for content

### Visual Feedback
- Button has accent color styling
- Hover effects provide immediate feedback
- Successful creation opens the new note automatically
- Calendar refreshes to show the new note

## Error Handling

- **File Creation Errors**: Logged to console (could be extended with user notifications)
- **Folder Creation**: Automatically handles missing folders
- **Invalid Dates**: Protected by existing date validation
- **Duplicate Files**: Gracefully opens existing file instead of overwriting

This feature significantly enhances the calendar plugin by allowing users to seamlessly create new calendar entries directly from the visual interface, maintaining consistency with the configured tag and date property settings.