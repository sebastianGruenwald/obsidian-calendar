import { App, TFile, CachedMetadata } from 'obsidian';
import { CalendarPluginSettings, CalendarDate, CalendarWeek, CalendarEvent, RecurrencePattern } from './types';
import { DateUtils, SettingsValidator } from './utils';

/**
 * Core calendar logic - handles date calculations and file queries
 */
export class CalendarCore {
	private app: App;
	private settings: CalendarPluginSettings;
	private eventCache: Map<string, CalendarEvent[]> = new Map();
	private lastCacheUpdate: number = 0;
	private cacheTimeout: number = 5000; // 5 seconds

	constructor(app: App, settings: CalendarPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Update settings reference
	 */
	updateSettings(settings: CalendarPluginSettings): void {
		this.settings = settings;
		DateUtils.setLocale(settings.locale);
		this.invalidateCache();
	}

	/**
	 * Invalidate the event cache
	 */
	invalidateCache(): void {
		this.eventCache.clear();
		this.lastCacheUpdate = 0;
	}

	/**
	 * Get all days for a month view, including padding days from adjacent months
	 */
	getDaysForMonth(currentMonth: Date, eventsMap: Map<string, CalendarEvent[]>): CalendarDate[] {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		
		// Calculate start date based on week start preference
		const startOffset = (firstDay.getDay() - this.settings.weekStartsOn + 7) % 7;
		const startDate = DateUtils.addDays(firstDay, -startOffset);
		
		const days: CalendarDate[] = [];
		const today = new Date();

		// Generate 6 weeks (42 days) to ensure we always have enough rows
		for (let i = 0; i < 42; i++) {
			const d = DateUtils.addDays(startDate, i);
			const dateStr = DateUtils.toDateString(d);
			const isCurrentMonth = d.getMonth() === month;
			const isToday = DateUtils.isSameDay(d, today);
			const isWeekend = DateUtils.isWeekend(d);
			const events = eventsMap.get(dateStr) || [];
			const files = events.map(e => e.file);
			const weekNumber = DateUtils.getWeekNumber(d, this.settings.weekStartsOn);

			days.push({
				date: d,
				dateStr,
				isCurrentMonth,
				isToday,
				isWeekend,
				weekNumber,
				files,
				events
			});
		}

		return days;
	}

	/**
	 * Get days organized by week
	 */
	getWeeksForMonth(currentMonth: Date, eventsMap: Map<string, CalendarEvent[]>): CalendarWeek[] {
		const days = this.getDaysForMonth(currentMonth, eventsMap);
		const weeks: CalendarWeek[] = [];
		
		for (let i = 0; i < days.length; i += 7) {
			const weekDays = days.slice(i, i + 7);
			weeks.push({
				weekNumber: weekDays[0].weekNumber || 0,
				days: weekDays
			});
		}

		return weeks;
	}

	/**
	 * Get days for a single week view
	 */
	getDaysForWeek(referenceDate: Date, eventsMap: Map<string, CalendarEvent[]>): CalendarDate[] {
		const day = referenceDate.getDay();
		const startOffset = (day - this.settings.weekStartsOn + 7) % 7;
		const startDate = DateUtils.addDays(referenceDate, -startOffset);
		
		const days: CalendarDate[] = [];
		const today = new Date();
		const currentMonth = referenceDate.getMonth();

		for (let i = 0; i < 7; i++) {
			const d = DateUtils.addDays(startDate, i);
			const dateStr = DateUtils.toDateString(d);
			const events = eventsMap.get(dateStr) || [];
			const files = events.map(e => e.file);

			days.push({
				date: d,
				dateStr,
				isCurrentMonth: d.getMonth() === currentMonth,
				isToday: DateUtils.isSameDay(d, today),
				isWeekend: DateUtils.isWeekend(d),
				weekNumber: DateUtils.getWeekNumber(d, this.settings.weekStartsOn),
				files,
				events
			});
		}

		return days;
	}

	/**
	 * Get events for a single day view
	 */
	getDayEvents(date: Date, eventsMap: Map<string, CalendarEvent[]>): CalendarEvent[] {
		const dateStr = DateUtils.toDateString(date);
		const events = eventsMap.get(dateStr) || [];
		
		// Sort by time if available
		return events.sort((a, b) => {
			if (!a.time && !b.time) return 0;
			if (!a.time) return 1;
			if (!b.time) return -1;
			
			const timeA = DateUtils.parseTime(a.time) || 0;
			const timeB = DateUtils.parseTime(b.time) || 0;
			return timeA - timeB;
		});
	}

	/**
	 * Get all events with dates, organized by date string
	 * Includes support for recurring events and date ranges
	 */
	getEventsWithDates(viewStartDate?: Date, viewEndDate?: Date): Map<string, CalendarEvent[]> {
		// Use cache if valid
		const now = Date.now();
		if (this.eventCache.size > 0 && now - this.lastCacheUpdate < this.cacheTimeout) {
			return this.filterEventsForDateRange(this.eventCache, viewStartDate, viewEndDate);
		}

		const eventsWithDates = new Map<string, CalendarEvent[]>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			try {
				const cache = this.app.metadataCache.getFileCache(file);
				if (!cache) continue;

				if (!this.hasRequiredTags(cache)) continue;

				// Support multiple dates per file
				const events = this.createEventsFromFile(file, cache);
				if (events.length === 0) continue;

				for (const event of events) {
					// Handle recurring events
					if (event.recurrence && event.recurrence !== 'none') {
						this.addRecurringEvents(eventsWithDates, event, viewStartDate, viewEndDate);
					} else if (event.endDateStr) {
						// Handle date range events
						this.addDateRangeEvents(eventsWithDates, event);
					} else {
						// Single date event
						this.addEventToMap(eventsWithDates, event.dateStr, event);
					}
				}
			} catch (error) {
				console.error(`Error processing file ${file.path}:`, error);
			}
		}

		// Update cache
		this.eventCache = eventsWithDates;
		this.lastCacheUpdate = now;

		return this.filterEventsForDateRange(eventsWithDates, viewStartDate, viewEndDate);
	}

	/**
	 * Legacy method for backward compatibility
	 */
	getFilesWithDates(): Map<string, TFile[]> {
		const eventsMap = this.getEventsWithDates();
		const filesMap = new Map<string, TFile[]>();
		
		eventsMap.forEach((events, dateStr) => {
			filesMap.set(dateStr, events.map(e => e.file));
		});
		
		return filesMap;
	}

	/**
	 * Create a CalendarEvent from a file
	 */
	private createEventFromFile(file: TFile, cache: CachedMetadata): CalendarEvent | null {
		const dateStr = this.getDateFromFrontmatter(cache, this.settings.dateProperty);
		if (!dateStr) return null;

		const normalizedDate = this.normalizeDate(dateStr);
		if (!normalizedDate) return null;

		const frontmatter = cache.frontmatter || {};
		
		// Get optional properties
		const endDateStr = this.getDateFromFrontmatter(cache, this.settings.endDateProperty);
		const normalizedEndDate = endDateStr ? this.normalizeDate(endDateStr) : undefined;
		
		const time = frontmatter[this.settings.timeProperty]?.toString() || undefined;
		const rawColor = frontmatter[this.settings.colorProperty]?.toString() || undefined;
		const color = rawColor ? SettingsValidator.resolveColor(rawColor) : undefined;
		const recurrence = this.parseRecurrence(frontmatter[this.settings.recurrenceProperty]);

		return {
			file,
			title: file.basename,
			dateStr: normalizedDate,
			endDateStr: normalizedEndDate || undefined,
			time,
			color,
			recurrence,
			isRecurring: recurrence !== undefined && recurrence !== 'none',
			originalDateStr: normalizedDate
		};
	}

	/**
	 * Create CalendarEvents from a file supporting multiple dates
	 */
	private createEventsFromFile(file: TFile, cache: CachedMetadata): CalendarEvent[] {
		const dates = this.getDatesFromFrontmatter(cache, this.settings.dateProperty);
		if (dates.length === 0) return [];

		const frontmatter = cache.frontmatter || {};
		
		// Get optional properties (shared across all dates)
		const endDateStr = this.getDateFromFrontmatter(cache, this.settings.endDateProperty);
		const time = frontmatter[this.settings.timeProperty]?.toString() || undefined;
		const rawColor = frontmatter[this.settings.colorProperty]?.toString() || undefined;
		const color = rawColor ? SettingsValidator.resolveColor(rawColor) : undefined;
		const recurrence = this.parseRecurrence(frontmatter[this.settings.recurrenceProperty]);
		const recurrenceDays = this.parseRecurrenceDays(frontmatter[this.settings.recurrenceDaysProperty]);

		const events: CalendarEvent[] = [];

		for (const dateStr of dates) {
			const normalizedDate = this.normalizeDate(dateStr);
			if (!normalizedDate) continue;

			const normalizedEndDate = endDateStr ? this.normalizeDate(endDateStr) : undefined;

			events.push({
				file,
				title: file.basename,
				dateStr: normalizedDate,
				endDateStr: normalizedEndDate || undefined,
				time,
				color,
				recurrence,
				recurrenceDays,
				isRecurring: recurrence !== undefined && recurrence !== 'none',
				originalDateStr: normalizedDate
			});
		}

		return events;
	}

	/**
	 * Add event to map helper
	 */
	private addEventToMap(map: Map<string, CalendarEvent[]>, dateStr: string, event: CalendarEvent): void {
		if (!map.has(dateStr)) {
			map.set(dateStr, []);
		}
		map.get(dateStr)!.push(event);
	}

	/**
	 * Add recurring events to the map
	 */
	private addRecurringEvents(
		map: Map<string, CalendarEvent[]>,
		event: CalendarEvent,
		viewStartDate?: Date,
		viewEndDate?: Date
	): void {
		const startDate = DateUtils.fromDateString(event.dateStr);
		const endDate = viewEndDate || DateUtils.addMonths(new Date(), 12); // Look ahead 1 year by default
		const actualStartDate = viewStartDate || DateUtils.addMonths(new Date(), -1);

		let currentDate = new Date(startDate);
		const maxIterations = 365 * 2; // Safety limit
		let iterations = 0;

		while (currentDate <= endDate && iterations < maxIterations) {
			// Check if this date matches the recurrence pattern
			let shouldInclude = currentDate >= actualStartDate;
			
			// For daily recurrence with specific weekdays, check if current day is in the list
			if (shouldInclude && event.recurrence === 'daily' && event.recurrenceDays && event.recurrenceDays.length > 0) {
				const dayOfWeek = currentDate.getDay();
				shouldInclude = event.recurrenceDays.includes(dayOfWeek);
			}
			
			if (shouldInclude) {
				const dateStr = DateUtils.toDateString(currentDate);
				const recurringEvent: CalendarEvent = {
					...event,
					dateStr,
					isRecurring: true,
					originalDateStr: event.dateStr
				};
				this.addEventToMap(map, dateStr, recurringEvent);
			}

			// Advance to next occurrence
			switch (event.recurrence) {
				case 'daily':
					currentDate = DateUtils.addDays(currentDate, 1);
					break;
				case 'weekly':
					currentDate = DateUtils.addDays(currentDate, 7);
					break;
				case 'monthly':
					currentDate = DateUtils.addMonths(currentDate, 1);
					break;
				case 'yearly':
					currentDate = DateUtils.addMonths(currentDate, 12);
					break;
				default:
					return;
			}
			iterations++;
		}
	}

	/**
	 * Add date range events to the map
	 */
	private addDateRangeEvents(map: Map<string, CalendarEvent[]>, event: CalendarEvent): void {
		if (!event.endDateStr) {
			this.addEventToMap(map, event.dateStr, event);
			return;
		}

		const startDate = DateUtils.fromDateString(event.dateStr);
		const endDate = DateUtils.fromDateString(event.endDateStr);
		const dates = DateUtils.getDatesBetween(startDate, endDate);

		dates.forEach(date => {
			const dateStr = DateUtils.toDateString(date);
			const rangeEvent: CalendarEvent = {
				...event,
				dateStr
			};
			this.addEventToMap(map, dateStr, rangeEvent);
		});
	}

	/**
	 * Filter events for a specific date range
	 */
	private filterEventsForDateRange(
		eventsMap: Map<string, CalendarEvent[]>,
		startDate?: Date,
		endDate?: Date
	): Map<string, CalendarEvent[]> {
		if (!startDate || !endDate) return eventsMap;

		const filtered = new Map<string, CalendarEvent[]>();
		const startStr = DateUtils.toDateString(startDate);
		const endStr = DateUtils.toDateString(endDate);

		eventsMap.forEach((events, dateStr) => {
			if (dateStr >= startStr && dateStr <= endStr) {
				filtered.set(dateStr, events);
			}
		});

		return filtered;
	}

	/**
	 * Parse recurrence pattern from frontmatter value
	 */
	private parseRecurrence(value: unknown): RecurrencePattern | undefined {
		if (!value) return undefined;
		
		const str = String(value).toLowerCase();
		if (['daily', 'weekly', 'monthly', 'yearly', 'none'].includes(str)) {
			return str as RecurrencePattern;
		}
		return undefined;
	}

	/**
	 * Parse recurrence days from frontmatter value
	 * Accepts: [1,2,3,4,5] or ["Mon","Tue","Wed"] or "Mon,Tue,Wed"
	 */
	private parseRecurrenceDays(value: unknown): number[] | undefined {
		if (!value) return undefined;
		
		const dayMap: Record<string, number> = {
			'sun': 0, 'sunday': 0,
			'mon': 1, 'monday': 1,
			'tue': 2, 'tuesday': 2,
			'wed': 3, 'wednesday': 3,
			'thu': 4, 'thursday': 4,
			'fri': 5, 'friday': 5,
			'sat': 6, 'saturday': 6
		};
		
		const result: number[] = [];
		
		if (Array.isArray(value)) {
			for (const item of value) {
				if (typeof item === 'number' && item >= 0 && item <= 6) {
					result.push(item);
				} else if (typeof item === 'string') {
					const day = dayMap[item.toLowerCase()];
					if (day !== undefined) result.push(day);
				}
			}
		} else if (typeof value === 'string') {
			const parts = value.split(/[,\s]+/);
			for (const part of parts) {
				const trimmed = part.trim().toLowerCase();
				const day = dayMap[trimmed];
				if (day !== undefined) result.push(day);
			}
		}
		
		return result.length > 0 ? result : undefined;
	}

	/**
	 * Check if file has the required tags (supports multiple tags with AND/OR)
	 */
	private hasRequiredTags(cache: CachedMetadata): boolean {
		const tagFilter = this.settings.tagFilter.trim();
		if (!tagFilter) return true;

		// Parse multiple tags (comma or space separated)
		const requiredTags = tagFilter.split(/[,\s]+/).filter(t => t.length > 0);
		if (requiredTags.length === 0) return true;

		// Get all tags from the file
		const fileTags: string[] = [];
		
		// Check inline tags
		if (cache.tags) {
			cache.tags.forEach(tag => {
				fileTags.push(tag.tag.replace(/^#/, ''));
			});
		}

		// Check frontmatter tags
		if (cache.frontmatter?.tags) {
			const frontmatterTags = cache.frontmatter.tags;
			if (Array.isArray(frontmatterTags)) {
				frontmatterTags.forEach(tag => fileTags.push(tag.toString()));
			} else if (typeof frontmatterTags === 'string') {
				fileTags.push(frontmatterTags);
			}
		}

		// Apply filter mode
		if (this.settings.tagFilterMode === 'all') {
			// ALL mode: file must have all required tags
			return requiredTags.every(tag => fileTags.includes(tag));
		} else {
			// ANY mode: file must have at least one required tag
			return requiredTags.some(tag => fileTags.includes(tag));
		}
	}

	/**
	 * Extract date(s) from frontmatter - supports single date or array of dates
	 */
	private getDateFromFrontmatter(cache: CachedMetadata, property: string): string | null {
		if (!cache.frontmatter) return null;

		const dateValue = cache.frontmatter[property];
		
		if (!dateValue) return null;
		
		// Return first date if array, otherwise return as string
		// (we'll handle arrays in getDatesFromFrontmatter)
		return Array.isArray(dateValue) ? dateValue[0]?.toString() : dateValue.toString();
	}

	/**
	 * Extract all dates from frontmatter - supports single date or array of dates
	 */
	private getDatesFromFrontmatter(cache: CachedMetadata, property: string): string[] {
		if (!cache.frontmatter) return [];

		const dateValue = cache.frontmatter[property];
		
		if (!dateValue) return [];
		
		if (Array.isArray(dateValue)) {
			return dateValue.map(d => d.toString()).filter(d => d.length > 0);
		}
		
		return [dateValue.toString()];
	}

	/**
	 * Normalize date string to YYYY-MM-DD format
	 */
	private normalizeDate(dateStr: string): string | null {
		try {
			const date = DateUtils.fromDateString(dateStr);
			if (isNaN(date.getTime())) return null;
			return DateUtils.toDateString(date);
		} catch {
			return null;
		}
	}

	/**
	 * Format a date for display
	 */
	formatDate(date: Date): string {
		return DateUtils.toDateString(date);
	}

	/**
	 * Format date for note title using settings format
	 */
	formatDateForTitle(date: Date): string {
		return DateUtils.formatDate(date, this.settings.dateFormat);
	}

	/**
	 * Search/filter events by query
	 */
	filterEvents(eventsMap: Map<string, CalendarEvent[]>, query: string): Map<string, CalendarEvent[]> {
		if (!query.trim()) return eventsMap;

		const lowerQuery = query.toLowerCase();
		const filtered = new Map<string, CalendarEvent[]>();

		eventsMap.forEach((events, dateStr) => {
			const matchingEvents = events.filter(event => 
				event.title.toLowerCase().includes(lowerQuery)
			);
			if (matchingEvents.length > 0) {
				filtered.set(dateStr, matchingEvents);
			}
		});

		return filtered;
	}

	/**
	 * Get file preview content
	 */
	async getFilePreview(file: TFile, maxLength: number): Promise<string> {
		try {
			const content = await this.app.vault.cachedRead(file);
			// Remove frontmatter
			const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
			// Remove headers
			const withoutHeaders = withoutFrontmatter.replace(/^#+\s+.*$/gm, '');
			// Remove markdown formatting
			const plainText = withoutHeaders
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
				.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
				.replace(/[*_`~]/g, '')
				.replace(/\n+/g, ' ')
				.trim();
			
			return plainText.length > maxLength 
				? plainText.substring(0, maxLength - 3) + '...'
				: plainText;
		} catch {
			return '';
		}
	}
}
