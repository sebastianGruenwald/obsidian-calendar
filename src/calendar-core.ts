import { App, TFile, CachedMetadata } from 'obsidian';
import { CalendarPluginSettings, CalendarDate, CalendarWeek } from './types';
import { DateUtils } from './utils';

/**
 * Core calendar logic - handles date calculations and file queries
 */
export class CalendarCore {
	private app: App;
	private settings: CalendarPluginSettings;

	constructor(app: App, settings: CalendarPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Update settings reference
	 */
	updateSettings(settings: CalendarPluginSettings): void {
		this.settings = settings;
	}

	/**
	 * Get all days for a month view, including padding days from adjacent months
	 */
	getDaysForMonth(currentMonth: Date, filesMap: Map<string, TFile[]>): CalendarDate[] {
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
			const files = filesMap.get(dateStr) || [];
			const weekNumber = DateUtils.getWeekNumber(d);

			days.push({
				date: d,
				dateStr,
				isCurrentMonth,
				isToday,
				isWeekend,
				weekNumber,
				files
			});
		}

		return days;
	}

	/**
	 * Get days organized by week
	 */
	getWeeksForMonth(currentMonth: Date, filesMap: Map<string, TFile[]>): CalendarWeek[] {
		const days = this.getDaysForMonth(currentMonth, filesMap);
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
	getDaysForWeek(referenceDate: Date, filesMap: Map<string, TFile[]>): CalendarDate[] {
		const day = referenceDate.getDay();
		const startOffset = (day - this.settings.weekStartsOn + 7) % 7;
		const startDate = DateUtils.addDays(referenceDate, -startOffset);
		
		const days: CalendarDate[] = [];
		const today = new Date();
		const currentMonth = referenceDate.getMonth();

		for (let i = 0; i < 7; i++) {
			const d = DateUtils.addDays(startDate, i);
			const dateStr = DateUtils.toDateString(d);
			const files = filesMap.get(dateStr) || [];

			days.push({
				date: d,
				dateStr,
				isCurrentMonth: d.getMonth() === currentMonth,
				isToday: DateUtils.isSameDay(d, today),
				isWeekend: DateUtils.isWeekend(d),
				weekNumber: DateUtils.getWeekNumber(d),
				files
			});
		}

		return days;
	}

	/**
	 * Get all files with dates, organized by date string
	 */
	getFilesWithDates(): Map<string, TFile[]> {
		const filesWithDates = new Map<string, TFile[]>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			if (!this.hasRequiredTag(cache)) continue;

			const dateStr = this.getDateFromFrontmatter(cache);
			if (!dateStr) continue;

			const normalizedDate = this.normalizeDate(dateStr);
			if (!normalizedDate) continue;

			if (!filesWithDates.has(normalizedDate)) {
				filesWithDates.set(normalizedDate, []);
			}
			filesWithDates.get(normalizedDate)!.push(file);
		}

		return filesWithDates;
	}

	/**
	 * Check if file has the required tag
	 */
	private hasRequiredTag(cache: CachedMetadata): boolean {
		const requiredTag = this.settings.tagFilter;
		if (!requiredTag) return true;

		// Check inline tags
		if (cache.tags) {
			const hasInlineTag = cache.tags.some(tag => tag.tag === `#${requiredTag}`);
			if (hasInlineTag) return true;
		}

		// Check frontmatter tags
		if (cache.frontmatter?.tags) {
			const frontmatterTags = cache.frontmatter.tags;
			if (Array.isArray(frontmatterTags)) {
				return frontmatterTags.includes(requiredTag);
			} else if (typeof frontmatterTags === 'string') {
				return frontmatterTags === requiredTag;
			}
		}

		return false;
	}

	/**
	 * Extract date from frontmatter
	 */
	private getDateFromFrontmatter(cache: CachedMetadata): string | null {
		if (!cache.frontmatter) return null;

		const dateProperty = this.settings.dateProperty;
		const dateValue = cache.frontmatter[dateProperty];
		
		if (!dateValue) return null;
		
		return dateValue.toString();
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
}
