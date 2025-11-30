import { TFile } from 'obsidian';

/**
 * Plugin settings interface
 */
export interface CalendarPluginSettings {
	tagFilter: string;
	tagFilterMode: TagFilterMode;
	dateProperty: string;
	endDateProperty: string;
	timeProperty: string;
	colorProperty: string;
	recurrenceProperty: string;
	noteFolder: string;
	noteTemplate: string;
	dateFormat: string;
	weekStartsOn: WeekStartDay;
	showWeekNumbers: boolean;
	defaultView: CalendarViewMode;
	accentColor: string;
	locale: string;
	showPreviewOnHover: boolean;
	previewLength: number;
}

/**
 * Day of week for calendar start
 */
export type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

/**
 * Available calendar view modes
 */
export type CalendarViewMode = 'month' | 'week' | 'day';

/**
 * Tag filter modes
 */
export type TagFilterMode = 'any' | 'all';

/**
 * Recurrence patterns
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';

/**
 * Represents an event with metadata
 */
export interface CalendarEvent {
	file: TFile;
	title: string;
	dateStr: string;
	endDateStr?: string;
	time?: string;
	color?: string;
	recurrence?: RecurrencePattern;
	isRecurring: boolean;
	originalDateStr?: string; // For recurring events, the original date
}

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
	events: CalendarEvent[];
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
 * Event bus event types
 */
export type EventBusEventType = 
	| 'dateSelected'
	| 'monthChanged'
	| 'viewModeChanged'
	| 'noteCreated'
	| 'noteOpened'
	| 'refresh'
	| 'settingsChanged'
	| 'searchChanged';

/**
 * Event bus payload types
 */
export interface EventBusPayloads {
	dateSelected: DateSelectionPayload;
	monthChanged: MonthChangePayload;
	viewModeChanged: { mode: CalendarViewMode };
	noteCreated: { file: TFile };
	noteOpened: { file: TFile };
	refresh: undefined;
	settingsChanged: undefined;
	searchChanged: { query: string };
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
 * Available locales
 */
export const AVAILABLE_LOCALES: Record<string, string> = {
	'en-US': 'English (US)',
	'en-GB': 'English (UK)',
	'de-DE': 'Deutsch',
	'fr-FR': 'Français',
	'es-ES': 'Español',
	'it-IT': 'Italiano',
	'pt-BR': 'Português (Brasil)',
	'ja-JP': '日本語',
	'zh-CN': '中文 (简体)',
	'ko-KR': '한국어',
	'ru-RU': 'Русский',
	'nl-NL': 'Nederlands',
	'pl-PL': 'Polski',
	'sv-SE': 'Svenska',
	'da-DK': 'Dansk',
	'nb-NO': 'Norsk',
	'fi-FI': 'Suomi',
};

/**
 * Event color presets
 */
export const EVENT_COLORS: Record<string, string> = {
	red: '#ef4444',
	orange: '#f97316',
	amber: '#f59e0b',
	yellow: '#eab308',
	lime: '#84cc16',
	green: '#22c55e',
	emerald: '#10b981',
	teal: '#14b8a6',
	cyan: '#06b6d4',
	sky: '#0ea5e9',
	blue: '#3b82f6',
	indigo: '#6366f1',
	violet: '#8b5cf6',
	purple: '#a855f7',
	fuchsia: '#d946ef',
	pink: '#ec4899',
	rose: '#f43f5e',
};

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: CalendarPluginSettings = {
	tagFilter: 'calendar',
	tagFilterMode: 'any',
	dateProperty: 'date',
	endDateProperty: 'endDate',
	timeProperty: 'time',
	colorProperty: 'color',
	recurrenceProperty: 'recurrence',
	noteFolder: '',
	noteTemplate: '# {{title}}\n\nCreated on {{date}}',
	dateFormat: 'YYYY-MM-DD',
	weekStartsOn: 1, // Monday
	showWeekNumbers: false,
	defaultView: 'month',
	accentColor: '',
	locale: 'en-US',
	showPreviewOnHover: true,
	previewLength: 200,
};
