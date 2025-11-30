import { WeekStartDay, CalendarPluginSettings, EVENT_COLORS, AVAILABLE_LOCALES } from './types';

/**
 * Date formatting utilities
 */
export class DateUtils {
	private static locale: string = 'en-US';

	/**
	 * Set the locale for date formatting
	 */
	static setLocale(locale: string): void {
		if (AVAILABLE_LOCALES[locale]) {
			DateUtils.locale = locale;
		}
	}

	/**
	 * Get current locale
	 */
	static getLocale(): string {
		return DateUtils.locale;
	}

	/**
	 * Format a date to YYYY-MM-DD string
	 */
	static toDateString(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Parse a date string to a Date object (handles timezone issues)
	 */
	static fromDateString(dateStr: string): Date {
		return new Date(dateStr + 'T00:00:00');
	}

	/**
	 * Format date for display using custom format string
	 */
	static formatDate(date: Date, format: string): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const monthName = date.toLocaleDateString(DateUtils.locale, { month: 'long' });
		const shortMonthName = date.toLocaleDateString(DateUtils.locale, { month: 'short' });
		const dayName = date.toLocaleDateString(DateUtils.locale, { weekday: 'long' });
		const shortDayName = date.toLocaleDateString(DateUtils.locale, { weekday: 'short' });

		return format
			.replace(/YYYY/g, year.toString())
			.replace(/YY/g, year.toString().slice(-2))
			.replace(/MMMM/g, monthName)
			.replace(/MMM/g, shortMonthName)
			.replace(/MM/g, month)
			.replace(/M/g, (date.getMonth() + 1).toString())
			.replace(/dddd/g, dayName)
			.replace(/ddd/g, shortDayName)
			.replace(/DD/g, day)
			.replace(/D/g, date.getDate().toString());
	}

	/**
	 * Get the week number for a date (ISO week or Sunday-based)
	 */
	static getWeekNumber(date: Date, weekStartsOn: WeekStartDay = 1): number {
		if (weekStartsOn === 1) {
			// ISO week (Monday start)
			const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
			const dayNum = d.getUTCDay() || 7;
			d.setUTCDate(d.getUTCDate() + 4 - dayNum);
			const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
			return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
		} else {
			// Sunday-based week
			const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
			const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
			const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
			const firstDayOfYear = startOfYear.getUTCDay();
			return Math.ceil((dayOfYear + firstDayOfYear + 1) / 7);
		}
	}

	/**
	 * Check if a date is today
	 */
	static isToday(date: Date): boolean {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	/**
	 * Check if a date is a weekend
	 */
	static isWeekend(date: Date): boolean {
		const day = date.getDay();
		return day === 0 || day === 6;
	}

	/**
	 * Get the first day of the month
	 */
	static getFirstDayOfMonth(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	}

	/**
	 * Get the last day of the month
	 */
	static getLastDayOfMonth(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0);
	}

	/**
	 * Add months to a date
	 */
	static addMonths(date: Date, months: number): Date {
		const result = new Date(date);
		result.setMonth(result.getMonth() + months);
		return result;
	}

	/**
	 * Add days to a date
	 */
	static addDays(date: Date, days: number): Date {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	/**
	 * Check if two dates are the same day
	 */
	static isSameDay(date1: Date, date2: Date): boolean {
		return date1.toDateString() === date2.toDateString();
	}

	/**
	 * Get month name
	 */
	static getMonthName(date: Date, style: 'long' | 'short' = 'long'): string {
		return date.toLocaleDateString(DateUtils.locale, { month: style });
	}

	/**
	 * Get day names for week header
	 */
	static getWeekdayNames(weekStartsOn: WeekStartDay, style: 'long' | 'short' | 'narrow' = 'narrow'): string[] {
		const days: string[] = [];
		const baseDate = new Date(2024, 0, 7); // A Sunday
		
		for (let i = 0; i < 7; i++) {
			const dayIndex = (weekStartsOn + i) % 7;
			const date = new Date(baseDate);
			date.setDate(date.getDate() + dayIndex);
			days.push(date.toLocaleDateString(DateUtils.locale, { weekday: style }));
		}
		
		return days;
	}

	/**
	 * Format selected date for display
	 */
	static formatSelectedDate(dateStr: string): string {
		const date = DateUtils.fromDateString(dateStr);
		return date.toLocaleDateString(DateUtils.locale, { 
			weekday: 'long', 
			month: 'short', 
			day: 'numeric' 
		});
	}

	/**
	 * Format date range
	 */
	static formatDateRange(start: Date, end: Date): string {
		const startMonth = DateUtils.getMonthName(start, 'short');
		const endMonth = DateUtils.getMonthName(end, 'short');
		
		if (start.getFullYear() !== end.getFullYear()) {
			return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
		}
		
		if (startMonth !== endMonth) {
			return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
		}
		
		return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
	}

	/**
	 * Parse time string to minutes since midnight
	 */
	static parseTime(timeStr: string): number | null {
		if (!timeStr) return null;
		
		// Handle various formats: "14:30", "2:30 PM", "14:30:00"
		const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
		if (!match) return null;
		
		let hours = parseInt(match[1], 10);
		const minutes = parseInt(match[2], 10);
		const ampm = match[4]?.toUpperCase();
		
		if (ampm === 'PM' && hours !== 12) hours += 12;
		if (ampm === 'AM' && hours === 12) hours = 0;
		
		if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
		
		return hours * 60 + minutes;
	}

	/**
	 * Format time for display
	 */
	static formatTime(timeStr: string): string {
		const minutes = DateUtils.parseTime(timeStr);
		if (minutes === null) return timeStr;
		
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		
		// Use locale-aware time formatting
		const date = new Date();
		date.setHours(hours, mins, 0, 0);
		
		return date.toLocaleTimeString(DateUtils.locale, {
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	/**
	 * Check if a date falls within a range
	 */
	static isDateInRange(date: Date, start: Date, end: Date): boolean {
		const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
		const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
		const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
		return d >= s && d <= e;
	}

	/**
	 * Get all dates between two dates (inclusive)
	 */
	static getDatesBetween(start: Date, end: Date): Date[] {
		const dates: Date[] = [];
		const current = new Date(start);
		
		while (current <= end) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		
		return dates;
	}
}

/**
 * DOM utilities
 */
export class DOMUtils {
	/**
	 * Create an element with classes and attributes
	 */
	static createElement<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		options?: {
			cls?: string | string[];
			text?: string;
			attr?: Record<string, string>;
			parent?: HTMLElement;
		}
	): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		
		if (options?.cls) {
			const classes = Array.isArray(options.cls) ? options.cls : [options.cls];
			el.classList.add(...classes);
		}
		
		if (options?.text) {
			el.textContent = options.text;
		}
		
		if (options?.attr) {
			for (const [key, value] of Object.entries(options.attr)) {
				el.setAttribute(key, value);
			}
		}
		
		if (options?.parent) {
			options.parent.appendChild(el);
		}
		
		return el;
	}

	/**
	 * Remove all children from an element
	 */
	static clearElement(el: HTMLElement): void {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	}

	/**
	 * Create SVG icon
	 */
	static createIcon(name: string): SVGElement {
		const icons: Record<string, string> = {
			'chevron-left': '<polyline points="15 18 9 12 15 6"></polyline>',
			'chevron-right': '<polyline points="9 18 15 12 9 6"></polyline>',
			'plus': '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
			'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
			'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
			'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
			'search': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
			'x': '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
			'repeat': '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
			'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
		};

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '16');
		svg.setAttribute('height', '16');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '2');
		svg.setAttribute('stroke-linecap', 'round');
		svg.setAttribute('stroke-linejoin', 'round');
		svg.classList.add('calendar-icon');
		
		svg.innerHTML = icons[name] || '';
		
		return svg;
	}
}

/**
 * Settings validation utilities
 */
export class SettingsValidator {
	/**
	 * Validate hex color
	 */
	static isValidHexColor(color: string): boolean {
		if (!color) return true; // Empty is valid (use default)
		return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
	}

	/**
	 * Validate date format string
	 */
	static isValidDateFormat(format: string): boolean {
		if (!format) return false;
		// Must contain at least year, month, and day tokens
		const hasYear = /YYYY|YY/.test(format);
		const hasMonth = /MMMM|MMM|MM|M/.test(format);
		const hasDay = /DD|D/.test(format);
		return hasYear && hasMonth && hasDay;
	}

	/**
	 * Validate folder path
	 */
	static isValidFolderPath(path: string): boolean {
		if (!path) return true; // Empty is valid (vault root)
		// Check for invalid characters
		return !/[<>:"|?*]/.test(path);
	}

	/**
	 * Validate locale
	 */
	static isValidLocale(locale: string): boolean {
		return locale in AVAILABLE_LOCALES;
	}

	/**
	 * Validate and sanitize settings
	 */
	static validateSettings(settings: Partial<CalendarPluginSettings>): string[] {
		const errors: string[] = [];

		if (settings.accentColor && !SettingsValidator.isValidHexColor(settings.accentColor)) {
			errors.push('Invalid accent color format. Use hex format like #7c3aed');
		}

		if (settings.dateFormat && !SettingsValidator.isValidDateFormat(settings.dateFormat)) {
			errors.push('Invalid date format. Must include year, month, and day tokens');
		}

		if (settings.noteFolder && !SettingsValidator.isValidFolderPath(settings.noteFolder)) {
			errors.push('Invalid folder path. Contains invalid characters');
		}

		if (settings.locale && !SettingsValidator.isValidLocale(settings.locale)) {
			errors.push('Invalid locale selected');
		}

		return errors;
	}

	/**
	 * Resolve color value (name or hex)
	 */
	static resolveColor(color: string): string {
		if (!color) return '';
		// Check if it's a named color
		if (EVENT_COLORS[color.toLowerCase()]) {
			return EVENT_COLORS[color.toLowerCase()];
		}
		// Check if it's a valid hex
		if (SettingsValidator.isValidHexColor(color)) {
			return color;
		}
		return '';
	}
}

/**
 * Debounce utility
 */
export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Sanitize filename for filesystem
 */
export function sanitizeFilename(name: string): string {
	return name.replace(/[^\w\s-]/g, '').trim();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract preview text from markdown content
 */
export function extractPreview(content: string, maxLength: number): string {
	// Remove frontmatter
	const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
	
	// Remove headers
	const withoutHeaders = withoutFrontmatter.replace(/^#+\s+.*$/gm, '');
	
	// Remove markdown formatting
	const plainText = withoutHeaders
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
		.replace(/[*_`~]/g, '') // Emphasis
		.replace(/\n+/g, ' ') // Newlines
		.trim();
	
	return truncateText(plainText, maxLength);
}
