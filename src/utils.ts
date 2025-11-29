import { CalendarPluginSettings, WeekStartDay } from './types';

/**
 * Date formatting utilities
 */
export class DateUtils {
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
		const monthName = date.toLocaleDateString('en-US', { month: 'long' });
		const shortMonthName = date.toLocaleDateString('en-US', { month: 'short' });
		const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
		const shortDayName = date.toLocaleDateString('en-US', { weekday: 'short' });

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
	 * Get the week number for a date (ISO week)
	 */
	static getWeekNumber(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
		return date.toLocaleDateString('en-US', { month: style });
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
			days.push(date.toLocaleDateString('en-US', { weekday: style }));
		}
		
		return days;
	}

	/**
	 * Format selected date for display
	 */
	static formatSelectedDate(dateStr: string): string {
		const date = DateUtils.fromDateString(dateStr);
		return date.toLocaleDateString('en-US', { 
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
			'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>'
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
