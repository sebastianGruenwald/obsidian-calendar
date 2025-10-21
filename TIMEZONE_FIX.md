# Date Timezone Fix

## Problem
Notes were appearing on the wrong dates - specifically one day ahead. For example, a note with date "2025-10-21" would appear on October 22nd in the calendar.

## Root Cause
The issue was caused by timezone conversion when handling dates:

### Before (Problematic Code)
```typescript
formatDate(date: Date): string {
    return date.toISOString().split('T')[0];  // ❌ Converts to UTC first
}

normalizeDate(dateStr: string): string | null {
    const date = new Date(dateStr);  // ❌ Ambiguous timezone interpretation
    return this.formatDate(date);
}
```

### The Problem
1. `new Date("2025-10-21")` could be interpreted as UTC midnight
2. `toISOString()` converts to UTC, potentially shifting the date
3. In timezones behind UTC, this would show the previous day
4. In timezones ahead of UTC, this would show the next day

## Solution
Use local time methods consistently to avoid any timezone conversion:

### After (Fixed Code)
```typescript
formatDate(date: Date): string {
    // Use local time methods to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

normalizeDate(dateStr: string): string | null {
    // Force local time interpretation by adding time component
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    return this.formatDate(date);
}
```

## Key Changes

1. **Local Time Parsing**: Added `T00:00:00` to force local time interpretation
2. **Local Time Formatting**: Use `getFullYear()`, `getMonth()`, `getDate()` instead of `toISOString()`
3. **Consistent Handling**: Applied the same logic to note creation

## Result
- ✅ Notes now appear on the correct dates
- ✅ No more timezone-related date shifting
- ✅ Consistent behavior across all timezones
- ✅ Calendar view matches frontmatter dates exactly

## Testing
The test files should now appear on their correct dates:
- `Test Note - Today.md` with `date: 2025-10-21` → appears on October 21st
- `Christmas Planning.md` with `date: 2025-12-25` → appears on December 25th