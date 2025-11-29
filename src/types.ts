import { TFile } from 'obsidian';

/**
 * Plugin settings interface
 */
export interface CalendarPluginSettings {
	tagFilter: string;
	dateProperty: string;
	noteFolder: string;
	noteTemplate: string;
	dateFormat: string;
	weekStartsOn: WeekStartDay;
	showWeekNumbers: boolean;
	defaultView: CalendarViewMode;
	accentColor: string;
}

/**
 * Day of week for calendar start
 */
export type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

/**
 * Available calendar view modes
 */
export type CalendarViewMode = 'month' | 'week';

/**
 * Represents a single day in the calendar grid
 */
export interface CalendarDate {
	date: Date;
	dateStr: string;
	isCurrentMonth: boolean;
	isToday: boolean;
	isWeekend: boolean;
	weekNumber?: number;
	files: TFile[];
}

/**
 * Represents a week row in the calendar
 */
export interface CalendarWeek {
	weekNumber: number;
	days: CalendarDate[];
}

/**
 * File with parsed date metadata
 */
export interface FileWithDate {
	file: TFile;
	dateStr: string;
	title: string;
}

/**
 * Event types for the calendar
 */
export type CalendarEventType = 
	| 'dateSelected'
	| 'monthChanged'
	| 'viewModeChanged'
	| 'noteCreated'
	| 'noteOpened'
	| 'refresh';

/**
 * Calendar event payload
 */
export interface CalendarEvent<T = unknown> {
	type: CalendarEventType;
	payload?: T;
}

/**
 * Date selection event payload
 */
export interface DateSelectionPayload {
	dateStr: string;
	date: Date;
}

/**
 * Month change event payload
 */
export interface MonthChangePayload {
	year: number;
	month: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: CalendarPluginSettings = {
	tagFilter: 'calendar',
	dateProperty: 'date',
	noteFolder: '',
	noteTemplate: '# {{title}}\n\nCreated on {{date}}',
	dateFormat: 'YYYY-MM-DD',
	weekStartsOn: 1, // Monday
	showWeekNumbers: false,
	defaultView: 'month',
	accentColor: ''
};
