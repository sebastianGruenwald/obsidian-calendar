import { ItemView, WorkspaceLeaf, TFile, setIcon, Menu, Modal } from 'obsidian';
import { CalendarCore } from './calendar-core';
import { CalendarDate, CalendarViewMode, CalendarPluginSettings, CalendarEvent } from './types';
import { DateUtils, debounce } from './utils';
import { eventBus } from './event-bus';

export const VIEW_TYPE_CALENDAR = 'calendar-view';

// Forward declaration to avoid circular dependency
interface CalendarPlugin {
	app: any;
	settings: CalendarPluginSettings;
}

// Storage key for persisting the divider position
const DIVIDER_POSITION_KEY = 'calendar-view-divider-position';

// Minimum width/height thresholds for expanded view
const EXPANDED_VIEW_MIN_WIDTH = 350;
const EXPANDED_VIEW_MIN_HEIGHT = 400;

/**
 * Modern Calendar View for Obsidian
 */
export class CalendarView extends ItemView {
	private plugin: CalendarPlugin;
	private core: CalendarCore;
	private selectedDate: string | null = null;
	private currentDate: Date;
	private eventsMap: Map<string, CalendarEvent[]> = new Map();
	private filteredEventsMap: Map<string, CalendarEvent[]> = new Map();
	private viewMode: CalendarViewMode = 'month';
	private viewContainerEl!: HTMLElement;
	private searchQuery: string = '';
	private searchExpanded: boolean = false;

	// DOM References for efficient updates
	private headerEl: HTMLElement | null = null;
	private calendarEl: HTMLElement | null = null;
	private resizerEl: HTMLElement | null = null;
	private fileListEl: HTMLElement | null = null;
	private previewTooltip: HTMLElement | null = null;

	// Resizer state
	private isResizing = false;
	private fileListHeight: number | null = null;

	// Adaptive display mode
	private isExpandedMode = false;
	private resizeObserver: ResizeObserver | null = null;

	// Event handlers for cleanup
	private documentMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
	private documentMouseUpHandler: (() => void) | null = null;
	private documentTouchMoveHandler: ((e: TouchEvent) => void) | null = null;
	private documentTouchEndHandler: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.core = new CalendarCore(plugin.app, plugin.settings);
		this.currentDate = new Date();
		this.viewMode = plugin.settings.defaultView;
		DateUtils.setLocale(plugin.settings.locale);
	}

	getViewType(): string {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar-days';
	}

	async onOpen(): Promise<void> {
		this.viewContainerEl = this.contentEl;
		this.viewContainerEl.empty();
		this.viewContainerEl.addClass('calendar-view-modern');
		
		// Apply accent color if set
		if (this.plugin.settings.accentColor) {
			this.viewContainerEl.style.setProperty('--calendar-accent', this.plugin.settings.accentColor);
		}

		this.buildStructure();
		this.setupResizeObserver();
		this.refresh();
	}

	async onClose(): Promise<void> {
		// Save divider position before closing
		this.saveDividerPosition();
		
		// Cleanup resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Cleanup document event listeners
		if (this.documentMouseMoveHandler) {
			document.removeEventListener('mousemove', this.documentMouseMoveHandler);
		}
		if (this.documentMouseUpHandler) {
			document.removeEventListener('mouseup', this.documentMouseUpHandler);
		}
		if (this.documentTouchMoveHandler) {
			document.removeEventListener('touchmove', this.documentTouchMoveHandler);
		}
		if (this.documentTouchEndHandler) {
			document.removeEventListener('touchend', this.documentTouchEndHandler);
		}

		// Remove preview tooltip
		if (this.previewTooltip) {
			this.previewTooltip.remove();
			this.previewTooltip = null;
		}
		
		// Cleanup
		this.headerEl = null;
		this.calendarEl = null;
		this.resizerEl = null;
		this.fileListEl = null;
	}

	/**
	 * Build the initial DOM structure
	 */
	private buildStructure(): void {
		// Header
		this.headerEl = this.viewContainerEl.createEl('div', { cls: 'cal-header' });
		
		// Calendar container
		this.calendarEl = this.viewContainerEl.createEl('div', { cls: 'cal-body' });
		
		// Resizable divider
		this.resizerEl = this.viewContainerEl.createEl('div', { cls: 'cal-resizer' });
		this.resizerEl.createEl('div', { cls: 'cal-resizer-handle' });
		this.resizerEl.style.display = 'none';
		this.setupResizer();
		
		// File list container (hidden initially)
		this.fileListEl = this.viewContainerEl.createEl('div', { cls: 'cal-files' });
		this.fileListEl.style.display = 'none';
		
		// Load saved divider position
		this.loadDividerPosition();

		// Create preview tooltip (hidden)
		this.previewTooltip = document.body.createEl('div', { cls: 'cal-preview-tooltip' });
		this.previewTooltip.style.display = 'none';
	}

	/**
	 * Build the search bar (collapsible) into a container
	 */
	private buildSearchBar(container: HTMLElement): void {
		const searchContainer = container.createEl('div', { 
			cls: `cal-search-container ${this.searchExpanded ? 'cal-search-expanded' : 'cal-search-collapsed'}` 
		});
		
		// Search icon/button
		const searchIcon = searchContainer.createEl('button', { 
			cls: 'cal-search-icon-btn',
			attr: { 'aria-label': 'Search events' }
		});
		setIcon(searchIcon, 'search');
		
		// Input field (hidden when collapsed)
		const searchInput = searchContainer.createEl('input', {
			cls: 'cal-search-input',
			attr: {
				type: 'text',
				placeholder: 'Search events...',
				'aria-label': 'Search events'
			}
		});
		searchInput.value = this.searchQuery;
		
		// Clear button
		const clearBtn = searchContainer.createEl('button', { 
			cls: 'cal-search-clear',
			attr: { 'aria-label': 'Clear search' }
		});
		setIcon(clearBtn, 'x');
		clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
		
		// Handle search input
		const handleSearch = debounce(() => {
			this.searchQuery = searchInput.value;
			clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
			this.applyFilter();
			eventBus.emit('searchChanged', { query: this.searchQuery });
		}, 200);
		searchInput.addEventListener('input', handleSearch);

		// Expand search on icon click
		searchIcon.addEventListener('click', (e) => {
			e.stopPropagation();
			if (!this.searchExpanded) {
				this.searchExpanded = true;
				searchContainer.removeClass('cal-search-collapsed');
				searchContainer.addClass('cal-search-expanded');
				searchInput.focus();
			}
		});

		// Clear and collapse
		clearBtn.addEventListener('click', () => {
			this.searchQuery = '';
			searchInput.value = '';
			clearBtn.style.display = 'none';
			this.searchExpanded = false;
			searchContainer.removeClass('cal-search-expanded');
			searchContainer.addClass('cal-search-collapsed');
			this.applyFilter();
		});

		// Collapse on blur if empty
		searchInput.addEventListener('blur', () => {
			if (!this.searchQuery) {
				setTimeout(() => {
					this.searchExpanded = false;
					searchContainer.removeClass('cal-search-expanded');
					searchContainer.addClass('cal-search-collapsed');
				}, 150);
			}
		});

		// Keep expanded if there's a query
		if (this.searchQuery) {
			this.searchExpanded = true;
			searchContainer.removeClass('cal-search-collapsed');
			searchContainer.addClass('cal-search-expanded');
		}
	}

	/**
	 * Apply search filter
	 */
	private applyFilter(): void {
		if (this.searchQuery.trim()) {
			this.filteredEventsMap = this.core.filterEvents(this.eventsMap, this.searchQuery);
		} else {
			this.filteredEventsMap = this.eventsMap;
		}
		this.renderCalendar();
		this.renderFileList();
	}

	/**
	 * Full refresh - fetches data and rerenders
	 */
	refresh = debounce(() => {
		this.core.updateSettings(this.plugin.settings);
		DateUtils.setLocale(this.plugin.settings.locale);
		this.eventsMap = this.core.getEventsWithDates();
		this.applyFilter();
		this.render();
	}, 100);

	/**
	 * Render the calendar
	 */
	private render(): void {
		this.renderHeader();
		this.renderCalendar();
		this.renderFileList();
	}

	/**
	 * Render the header section
	 */
	private renderHeader(): void {
		if (!this.headerEl) return;
		this.headerEl.empty();

		// Top row: Title and navigation
		const topRow = this.headerEl.createEl('div', { cls: 'cal-header-top' });

		// Month/Year title
		const titleSection = topRow.createEl('div', { cls: 'cal-title-section' });
		
		if (this.viewMode === 'day') {
			// Day view: show full date
			const formattedDate = DateUtils.formatSelectedDate(DateUtils.toDateString(this.currentDate));
			titleSection.createEl('h2', { 
				text: formattedDate, 
				cls: 'cal-month-title cal-day-title' 
			});
		} else {
			const monthName = DateUtils.getMonthName(this.currentDate);
			const year = this.currentDate.getFullYear();
			
			titleSection.createEl('h2', { 
				text: monthName, 
				cls: 'cal-month-title' 
			});
			titleSection.createEl('span', { 
				text: year.toString(), 
				cls: 'cal-year' 
			});
		}

		// Navigation
		const navSection = topRow.createEl('div', { cls: 'cal-nav' });

		// View mode dropdown
		const viewSelect = navSection.createEl('select', { 
			cls: 'cal-view-select',
			attr: { 'aria-label': 'Select view mode' }
		});
		
		const viewOptions: { value: CalendarViewMode; label: string }[] = [
			{ value: 'month', label: 'Month' },
			{ value: 'week', label: 'Week' },
			{ value: 'day', label: 'Day' }
		];
		
		viewOptions.forEach(opt => {
			const option = viewSelect.createEl('option', {
				text: opt.label,
				attr: { value: opt.value }
			});
			if (opt.value === this.viewMode) {
				option.selected = true;
			}
		});
		
		viewSelect.addEventListener('change', () => {
			this.setViewMode(viewSelect.value as CalendarViewMode);
		});

		// Create note button (only show when date is selected or in day view)
		if (this.selectedDate || this.viewMode === 'day') {
			const createBtn = navSection.createEl('button', { 
				cls: 'cal-btn cal-btn-icon cal-btn-create-header',
				attr: { 'aria-label': 'Create new note for selected date' }
			});
			setIcon(createBtn, 'plus');
			createBtn.addEventListener('click', () => this.createNote());
		}

		// Today button
		const todayBtn = navSection.createEl('button', { 
			cls: 'cal-btn cal-btn-today',
			attr: { 'aria-label': 'Go to today' }
		});
		todayBtn.createEl('span', { text: 'Today' });
		todayBtn.addEventListener('click', () => this.goToToday());

		// Prev/Next buttons
		const prevBtn = navSection.createEl('button', { 
			cls: 'cal-btn cal-btn-icon',
			attr: { 'aria-label': 'Previous' }
		});
		setIcon(prevBtn, 'chevron-left');
		prevBtn.addEventListener('click', () => this.navigatePrevious());

		const nextBtn = navSection.createEl('button', { 
			cls: 'cal-btn cal-btn-icon',
			attr: { 'aria-label': 'Next' }
		});
		setIcon(nextBtn, 'chevron-right');
		nextBtn.addEventListener('click', () => this.navigateNext());

		// Search (collapsible)
		this.buildSearchBar(navSection);
	}

	/**
	 * Set view mode
	 */
	private setViewMode(mode: CalendarViewMode): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		eventBus.emit('viewModeChanged', { mode });
		this.render();
	}

	/**
	 * Render the calendar grid
	 */
	private renderCalendar(): void {
		if (!this.calendarEl) return;
		this.calendarEl.empty();

		if (this.viewMode === 'day') {
			this.renderDayView();
			return;
		}

		// Weekday headers
		const weekHeader = this.calendarEl.createEl('div', { cls: 'cal-weekdays' });
		const weekdays = DateUtils.getWeekdayNames(this.plugin.settings.weekStartsOn, 'short');
		
		if (this.plugin.settings.showWeekNumbers) {
			weekHeader.createEl('div', { cls: 'cal-weekday cal-week-num-header', text: 'W' });
		}
		
		weekdays.forEach((day, index) => {
			const isWeekend = (this.plugin.settings.weekStartsOn + index) % 7 === 0 || 
							  (this.plugin.settings.weekStartsOn + index) % 7 === 6;
			weekHeader.createEl('div', { 
				cls: `cal-weekday ${isWeekend ? 'cal-weekend' : ''}`,
				text: day.substring(0, 2)
			});
		});

		// Days grid
		const daysGrid = this.calendarEl.createEl('div', { cls: 'cal-grid' });
		
		if (this.viewMode === 'month') {
			this.renderMonthView(daysGrid);
		} else {
			this.renderWeekView(daysGrid);
		}

		// Auto-scroll to selected day if not fully visible
		this.scrollToSelectedDay(daysGrid);
	}

	/**
	 * Render month view
	 */
	private renderMonthView(container: HTMLElement): void {
		const weeks = this.core.getWeeksForMonth(this.currentDate, this.filteredEventsMap);
		
		weeks.forEach(week => {
			const weekRow = container.createEl('div', { cls: 'cal-week' });
			
			if (this.plugin.settings.showWeekNumbers) {
				weekRow.createEl('div', { 
					cls: 'cal-week-num',
					text: week.weekNumber.toString()
				});
			}
			
			week.days.forEach(day => {
				this.renderDay(weekRow, day);
			});
		});
	}

	/**
	 * Render week view
	 */
	private renderWeekView(container: HTMLElement): void {
		const days = this.core.getDaysForWeek(this.currentDate, this.filteredEventsMap);
		const weekRow = container.createEl('div', { cls: 'cal-week cal-week-expanded' });
		
		if (this.plugin.settings.showWeekNumbers && days.length > 0) {
			weekRow.createEl('div', { 
				cls: 'cal-week-num',
				text: days[0].weekNumber?.toString() || ''
			});
		}
		
		days.forEach(day => {
			this.renderDayExpanded(weekRow, day);
		});
	}

	/**
	 * Render day view (timeline)
	 */
	private renderDayView(): void {
		if (!this.calendarEl) return;
		
		const dayContainer = this.calendarEl.createEl('div', { cls: 'cal-day-view' });
		const events = this.core.getDayEvents(this.currentDate, this.filteredEventsMap);

		// All-day events section
		const allDaySection = dayContainer.createEl('div', { cls: 'cal-day-view-allday' });
		allDaySection.createEl('div', { cls: 'cal-day-view-allday-label', text: 'All Day' });
		
		const allDayEvents = events.filter(e => !e.time);
		const timedEvents = events.filter(e => e.time);

		if (allDayEvents.length > 0) {
			const allDayList = allDaySection.createEl('div', { cls: 'cal-day-view-allday-list' });
			allDayEvents.forEach(event => {
				this.renderDayViewEvent(allDayList, event);
			});
		} else {
			allDaySection.createEl('div', { cls: 'cal-day-view-empty', text: 'No all-day events' });
		}

		// Timeline section
		const timelineSection = dayContainer.createEl('div', { cls: 'cal-day-view-timeline' });
		
		// Create hour slots
		for (let hour = 0; hour < 24; hour++) {
			const hourSlot = timelineSection.createEl('div', { cls: 'cal-day-view-hour' });
			
			const hourLabel = hourSlot.createEl('div', { cls: 'cal-day-view-hour-label' });
			const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
			const ampm = hour < 12 ? 'AM' : 'PM';
			hourLabel.createEl('span', { text: `${displayHour}` });
			hourLabel.createEl('span', { cls: 'cal-day-view-ampm', text: ampm });
			
			const hourEvents = hourSlot.createEl('div', { cls: 'cal-day-view-hour-events' });
			
			// Find events that start in this hour
			const hourEventsFiltered = timedEvents.filter(e => {
				const time = DateUtils.parseTime(e.time || '');
				if (time === null) return false;
				const eventHour = Math.floor(time / 60);
				return eventHour === hour;
			});
			
			hourEventsFiltered.forEach(event => {
				this.renderDayViewEvent(hourEvents, event);
			});
		}

		// Scroll to current hour if today
		if (DateUtils.isSameDay(this.currentDate, new Date())) {
			const currentHour = new Date().getHours();
			setTimeout(() => {
				const hourElements = timelineSection.querySelectorAll('.cal-day-view-hour');
				if (hourElements[currentHour]) {
					hourElements[currentHour].scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
		}
	}

	/**
	 * Render an event in day view
	 */
	private renderDayViewEvent(container: HTMLElement, event: CalendarEvent): void {
		const eventEl = container.createEl('div', { cls: 'cal-day-view-event' });
		
		// Apply custom color if set
		if (event.color) {
			eventEl.style.setProperty('--event-color', event.color);
			eventEl.addClass('cal-event-colored');
		}

		// Recurring indicator
		if (event.isRecurring) {
			const recurringIcon = eventEl.createEl('span', { cls: 'cal-event-recurring' });
			setIcon(recurringIcon, 'repeat');
		}

		// Time
		if (event.time) {
			eventEl.createEl('span', { 
				cls: 'cal-day-view-event-time',
				text: DateUtils.formatTime(event.time)
			});
		}

		// Title
		eventEl.createEl('span', { 
			cls: 'cal-day-view-event-title',
			text: event.title
		});

		// Click to open
		eventEl.addEventListener('click', () => this.openFile(event.file));

		// Right-click context menu for events
		eventEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showEventContextMenu(e, event);
		});

		// Preview on hover
		if (this.plugin.settings.showPreviewOnHover) {
			this.setupEventPreview(eventEl, event);
		}
	}

	/**
	 * Render a single day cell
	 */
	private renderDay(container: HTMLElement, day: CalendarDate): void {
		const classes = ['cal-day'];
		
		if (!day.isCurrentMonth) classes.push('cal-day-other');
		if (day.isToday) classes.push('cal-day-today');
		if (day.isWeekend) classes.push('cal-day-weekend');
		if (day.dateStr === this.selectedDate) classes.push('cal-day-selected');
		if (day.events.length > 0) classes.push('cal-day-has-events');
		if (this.isExpandedMode) classes.push('cal-day-inline-events');
		
		const dayEl = container.createEl('div', { cls: classes.join(' ') });
		dayEl.setAttribute('data-date', day.dateStr);

		// Date number
		const dateNum = dayEl.createEl('div', { cls: 'cal-day-num' });
		dateNum.createEl('span', { text: day.date.getDate().toString() });

		// Events display - depends on mode
		if (day.events.length > 0) {
			if (this.isExpandedMode) {
				// Expanded mode: show event titles inline
				this.renderInlineEvents(dayEl, day);
			} else {
				// Compact mode: show dots with colors
				const indicators = dayEl.createEl('div', { cls: 'cal-day-indicators' });
				const count = Math.min(day.events.length, 3);
				
				for (let i = 0; i < count; i++) {
					const indicator = indicators.createEl('span', { cls: 'cal-indicator' });
					const eventColor = day.events[i].color;
					if (eventColor) {
						indicator.style.backgroundColor = eventColor;
					}
				}
				
				if (day.events.length > 3) {
					indicators.createEl('span', { 
						cls: 'cal-indicator-more',
						text: `+${day.events.length - 3}`
					});
				}
			}
		}

		// Click handler
		dayEl.addEventListener('click', (e) => {
			// Don't toggle selection if clicking on an event
			if ((e.target as HTMLElement).closest('.cal-inline-event')) return;
			e.stopPropagation();
			this.selectDate(day.dateStr);
		});

		// Double-click to open day view
		dayEl.addEventListener('dblclick', (e) => {
			e.stopPropagation();
			this.currentDate = day.date;
			this.setViewMode('day');
		});

		// Right-click context menu
		dayEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showDayContextMenu(e, day.dateStr);
		});
	}

	/**
	 * Render inline events for expanded mode
	 */
	private renderInlineEvents(dayEl: HTMLElement, day: CalendarDate): void {
		const eventsContainer = dayEl.createEl('div', { cls: 'cal-inline-events' });
		
		const maxVisible = 3;
		const visibleEvents = day.events.slice(0, maxVisible);
		const remaining = day.events.length - maxVisible;
		
		visibleEvents.forEach(event => {
			const eventEl = eventsContainer.createEl('div', { 
				cls: 'cal-inline-event',
				attr: { 'title': event.title }
			});
			
			// Apply custom color if set
			if (event.color) {
				eventEl.style.setProperty('--event-color', event.color);
				eventEl.addClass('cal-event-colored');
			}

			// Recurring indicator
			if (event.isRecurring) {
				const recurringIcon = eventEl.createEl('span', { cls: 'cal-event-recurring-inline' });
				setIcon(recurringIcon, 'repeat');
			}

			// Time prefix if available
			if (event.time) {
				eventEl.createEl('span', { 
					cls: 'cal-inline-event-time',
					text: DateUtils.formatTime(event.time)
				});
			}

			eventEl.createEl('span', { 
				cls: 'cal-inline-event-text',
				text: event.title 
			});
			
			eventEl.addEventListener('click', (e) => {
				e.stopPropagation();
				this.openFile(event.file);
			});

			// Right-click context menu for events
			eventEl.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.showEventContextMenu(e, event);
			});

			// Preview on hover
			if (this.plugin.settings.showPreviewOnHover) {
				this.setupEventPreview(eventEl, event);
			}
		});
		
		if (remaining > 0) {
			eventsContainer.createEl('div', { 
				cls: 'cal-inline-event-more',
				text: `+${remaining} more`
			});
		}
	}

	/**
	 * Setup preview tooltip for an event
	 */
	private setupEventPreview(eventEl: HTMLElement, event: CalendarEvent): void {
		let previewTimeout: ReturnType<typeof setTimeout>;

		eventEl.addEventListener('mouseenter', async () => {
			previewTimeout = setTimeout(async () => {
				if (!this.previewTooltip) return;

				const preview = await this.core.getFilePreview(
					event.file, 
					this.plugin.settings.previewLength
				);

				if (!preview) {
					this.previewTooltip.style.display = 'none';
					return;
				}

				this.previewTooltip.empty();
				this.previewTooltip.createEl('div', { 
					cls: 'cal-preview-title',
					text: event.title
				});
				this.previewTooltip.createEl('div', { 
					cls: 'cal-preview-content',
					text: preview
				});

				// Position tooltip
				const rect = eventEl.getBoundingClientRect();
				this.previewTooltip.style.left = `${rect.left}px`;
				this.previewTooltip.style.top = `${rect.bottom + 8}px`;
				this.previewTooltip.style.display = 'block';

				// Adjust if off-screen
				const tooltipRect = this.previewTooltip.getBoundingClientRect();
				if (tooltipRect.right > window.innerWidth) {
					this.previewTooltip.style.left = `${window.innerWidth - tooltipRect.width - 16}px`;
				}
				if (tooltipRect.bottom > window.innerHeight) {
					this.previewTooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
				}
			}, 500);
		});

		eventEl.addEventListener('mouseleave', () => {
			clearTimeout(previewTimeout);
			if (this.previewTooltip) {
				this.previewTooltip.style.display = 'none';
			}
		});
	}

	/**
	 * Render expanded day (for week view)
	 */
	private renderDayExpanded(container: HTMLElement, day: CalendarDate): void {
		const classes = ['cal-day', 'cal-day-expanded'];
		
		if (!day.isCurrentMonth) classes.push('cal-day-other');
		if (day.isToday) classes.push('cal-day-today');
		if (day.isWeekend) classes.push('cal-day-weekend');
		if (day.dateStr === this.selectedDate) classes.push('cal-day-selected');
		
		const dayEl = container.createEl('div', { cls: classes.join(' ') });
		dayEl.setAttribute('data-date', day.dateStr);

		// Header
		const header = dayEl.createEl('div', { cls: 'cal-day-header' });
		header.createEl('span', { 
			cls: 'cal-day-name',
			text: day.date.toLocaleDateString(DateUtils.getLocale(), { weekday: 'short' })
		});
		header.createEl('span', { 
			cls: 'cal-day-num',
			text: day.date.getDate().toString()
		});

		// Events list
		if (day.events.length > 0) {
			const eventsList = dayEl.createEl('div', { cls: 'cal-day-events' });
			day.events.slice(0, 4).forEach(event => {
				const eventEl = eventsList.createEl('div', { cls: 'cal-event-mini' });
				
				// Apply custom color
				if (event.color) {
					eventEl.style.setProperty('--event-color', event.color);
					eventEl.addClass('cal-event-colored');
				}

				eventEl.createEl('span', { text: event.title });
				
				eventEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openFile(event.file);
				});

				// Right-click context menu for events
				eventEl.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.showEventContextMenu(e, event);
				});
			});
			
			if (day.events.length > 4) {
				eventsList.createEl('div', { 
					cls: 'cal-event-more',
					text: `+${day.events.length - 4} more`
				});
			}
		}

		// Click handler
		dayEl.addEventListener('click', (e) => {
			if ((e.target as HTMLElement).closest('.cal-event-mini')) return;
			this.selectDate(day.dateStr);
		});

		// Right-click context menu
		dayEl.addEventListener('contextmenu', (e) => {
			if ((e.target as HTMLElement).closest('.cal-event-mini')) return;
			e.preventDefault();
			this.showDayContextMenu(e, day.dateStr);
		});
	}

	/**
	 * Render the file list for selected date
	 */
	private renderFileList(): void {
		if (!this.fileListEl || !this.resizerEl) return;

		// In day view, don't show file list (events are shown in timeline)
		if (this.viewMode === 'day') {
			this.fileListEl.style.display = 'none';
			this.resizerEl.style.display = 'none';
			return;
		}

		if (!this.selectedDate) {
			this.fileListEl.style.display = 'none';
			this.resizerEl.style.display = 'none';
			this.fileListEl.style.height = '';
			return;
		}

		this.fileListEl.style.display = 'flex';
		this.resizerEl.style.display = 'flex';
		this.fileListEl.empty();
		this.fileListEl.addClass('cal-files-visible');
		
		// Apply saved height if available
		if (this.fileListHeight !== null) {
			this.fileListEl.style.height = `${this.fileListHeight}px`;
			this.fileListEl.style.maxHeight = 'none';
		}

		// File list - compact style like inline events
		const events = this.filteredEventsMap.get(this.selectedDate) || [];
		
		if (events.length === 0) {
			const emptyState = this.fileListEl.createEl('div', { cls: 'cal-files-empty-compact' });
			emptyState.createEl('span', { 
				text: 'No notes',
				cls: 'cal-files-empty-text'
			});
		} else {
			const list = this.fileListEl.createEl('div', { cls: 'cal-files-list-compact' });
			
			events.forEach(event => {
				const item = list.createEl('div', { 
					cls: 'cal-file-item-compact',
					attr: { 'title': event.file.path }
				});

				// Apply custom color
				if (event.color) {
					item.style.setProperty('--event-color', event.color);
					item.addClass('cal-event-colored');
				}

				// Recurring indicator
				if (event.isRecurring) {
					const recurringIcon = item.createEl('span', { cls: 'cal-event-recurring-inline' });
					setIcon(recurringIcon, 'repeat');
				}

				// Time
				if (event.time) {
					item.createEl('span', { 
						cls: 'cal-file-item-time',
						text: DateUtils.formatTime(event.time)
					});
				}

				item.createEl('span', { 
					cls: 'cal-file-item-text',
					text: event.title 
				});
				
				item.addEventListener('click', () => this.openFile(event.file));

				// Right-click context menu for events
				item.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					this.showEventContextMenu(e, event);
				});

				// Preview on hover
				if (this.plugin.settings.showPreviewOnHover) {
					this.setupEventPreview(item, event);
				}
			});
		}
	}

	/**
	 * Navigation methods
	 */
	private goToToday(): void {
		this.currentDate = new Date();
		this.selectedDate = DateUtils.toDateString(this.currentDate);
		this.render();
	}

	private navigatePrevious(): void {
		switch (this.viewMode) {
			case 'month':
				this.currentDate = DateUtils.addMonths(this.currentDate, -1);
				break;
			case 'week':
				this.currentDate = DateUtils.addDays(this.currentDate, -7);
				break;
			case 'day':
				this.currentDate = DateUtils.addDays(this.currentDate, -1);
				break;
		}
		this.render();
	}

	private navigateNext(): void {
		switch (this.viewMode) {
			case 'month':
				this.currentDate = DateUtils.addMonths(this.currentDate, 1);
				break;
			case 'week':
				this.currentDate = DateUtils.addDays(this.currentDate, 7);
				break;
			case 'day':
				this.currentDate = DateUtils.addDays(this.currentDate, 1);
				break;
		}
		this.render();
	}

	/**
	 * Scroll to selected day if it's not visible
	 */
	private scrollToSelectedDay(container: HTMLElement): void {
		if (!this.selectedDate) return;
		
		// Use setTimeout to ensure DOM is rendered
		setTimeout(() => {
			const selectedEl = container.querySelector(`[data-date="${this.selectedDate}"]`) as HTMLElement;
			if (!selectedEl) return;
			
			// Check if element is visible in the scrollable container
			const containerRect = container.getBoundingClientRect();
			const elementRect = selectedEl.getBoundingClientRect();
			
			const isVisible = 
				elementRect.top >= containerRect.top &&
				elementRect.bottom <= containerRect.bottom;
			
			if (!isVisible) {
				selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 10);
	}

	/**
	 * Select a date
	 */
	private selectDate(dateStr: string): void {
		if (this.selectedDate === dateStr) {
			this.selectedDate = null;
		} else {
			this.selectedDate = dateStr;
		}
		eventBus.emit('dateSelected', { 
			dateStr, 
			date: DateUtils.fromDateString(dateStr) 
		});
		this.render();
	}

	/**
	 * Open a file
	 */
	private openFile(file: TFile): void {
		this.app.workspace.openLinkText(file.path, '', false);
		eventBus.emit('noteOpened', { file });
	}

	/**
	 * Show context menu for a day
	 */
	private showDayContextMenu(e: MouseEvent, dateStr: string): void {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle('Create new event')
				.setIcon('plus')
				.onClick(() => {
					this.selectedDate = dateStr;
					this.createNote();
				});
		});
		
		menu.showAtMouseEvent(e);
	}

	/**
	 * Show context menu for an event
	 */
	private showEventContextMenu(e: MouseEvent, event: CalendarEvent): void {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle('Open event')
				.setIcon('file-text')
				.onClick(() => {
					this.openFile(event.file);
				});
		});
		
		menu.addSeparator();
		
		menu.addItem((item) => {
			item.setTitle('Delete event')
				.setIcon('trash')
				.onClick(async () => {
					const confirmed = await this.confirmDelete(event.title);
					if (confirmed) {
						await this.deleteEvent(event.file);
					}
				});
		});
		
		menu.showAtMouseEvent(e);
	}

	/**
	 * Confirm event deletion
	 */
	private async confirmDelete(title: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Delete Event');
			
			modal.contentEl.createEl('p', {
				text: `Are you sure you want to delete "${title}"? This action cannot be undone.`
			});
			
			const buttonContainer = modal.contentEl.createEl('div', {
				cls: 'modal-button-container'
			});
			buttonContainer.style.display = 'flex';
			buttonContainer.style.justifyContent = 'flex-end';
			buttonContainer.style.gap = '8px';
			buttonContainer.style.marginTop = '16px';
			
			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});
			
			const deleteBtn = buttonContainer.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			});
			deleteBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});
			
			modal.open();
			// Focus delete button
			setTimeout(() => deleteBtn.focus(), 100);
		});
	}

	/**
	 * Delete an event file
	 */
	private async deleteEvent(file: TFile): Promise<void> {
		try {
			await this.app.vault.delete(file);
			// Refresh after deletion
			setTimeout(() => this.refresh(), 100);
		} catch (error) {
			console.error('Failed to delete event:', error);
		}
	}

	/**
	 * Create a new note for the selected date
	 */
	private async createNote(): Promise<void> {
		const targetDate = this.viewMode === 'day' 
			? DateUtils.toDateString(this.currentDate)
			: this.selectedDate;

		if (!targetDate) return;

		const settings = this.plugin.settings;
		
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const fileName = `Untitled ${timestamp}.md`;
		
		const folder = settings.noteFolder.trim();
		const fullPath = folder ? `${folder}/${fileName}` : fileName;
		
		// Generate content from template
		const content = this.generateNoteContent(targetDate);
		
		try {
			// Ensure folder exists
			if (folder) {
				await this.ensureFolderExists(folder);
			}
			
			// Create file
			const newFile = await this.app.vault.create(fullPath, content);
			
			// Emit event
			eventBus.emit('noteCreated', { file: newFile });
			
			// Open file
			const leaf = await this.app.workspace.getLeaf(false);
			await leaf.openFile(newFile);
			
			// Trigger rename to focus on title
			setTimeout(() => {
				(this.app as any).commands.executeCommandById('workspace:edit-file-title');
			}, 100);
			
			// Refresh after a short delay
			setTimeout(() => this.refresh(), 300);
		} catch (error) {
			console.error('Failed to create note:', error);
		}
	}

	/**
	 * Generate note content from template
	 */
	private generateNoteContent(dateStr: string): string {
		const settings = this.plugin.settings;
		const date = DateUtils.fromDateString(dateStr);
		const formattedDate = DateUtils.formatDate(date, settings.dateFormat);
		
		// Parse tags
		const tags = settings.tagFilter.split(/[,\s]+/).filter(t => t.length > 0);
		const tagYaml = tags.length > 0 
			? tags.map(t => `  - ${t}`).join('\n')
			: `  - calendar`;
		
		// Frontmatter
		const frontmatter = [
			'---',
			`${settings.dateProperty}: ${dateStr}`,
			'tags:',
			tagYaml,
			'---',
			''
		].join('\n');
		
		// Apply template if not empty
		let body = '';
		if (settings.noteTemplate) {
			body = settings.noteTemplate
				.replace(/\{\{title\}\}/g, 'Untitled')
				.replace(/\{\{date\}\}/g, formattedDate);
		}
		
		return frontmatter + body;
	}

	/**
	 * Ensure a folder exists
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Setup the resizable divider
	 */
	private setupResizer(): void {
		if (!this.resizerEl) return;

		this.documentMouseMoveHandler = (e: MouseEvent) => {
			if (!this.isResizing || !this.fileListEl || !this.viewContainerEl) return;
			
			const containerRect = this.viewContainerEl.getBoundingClientRect();
			const newHeight = containerRect.bottom - e.clientY;
			
			// Clamp between min and max heights
			const minHeight = 30;
			const maxHeight = containerRect.height - 200; // Leave space for calendar
			const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
			
			this.fileListHeight = clampedHeight;
			this.fileListEl.style.height = `${clampedHeight}px`;
			this.fileListEl.style.maxHeight = 'none';
		};

		this.documentMouseUpHandler = () => {
			this.isResizing = false;
			this.viewContainerEl.removeClass('cal-resizing');
			this.saveDividerPosition();
		};

		const onMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			this.isResizing = true;
			this.viewContainerEl.addClass('cal-resizing');
			
			document.addEventListener('mousemove', this.documentMouseMoveHandler!);
			document.addEventListener('mouseup', this.documentMouseUpHandler!);
		};

		this.resizerEl.addEventListener('mousedown', onMouseDown);

		// Touch support for mobile
		this.documentTouchMoveHandler = (e: TouchEvent) => {
			if (!this.isResizing || !this.fileListEl || !this.viewContainerEl) return;
			e.preventDefault();
			
			const touch = e.touches[0];
			const containerRect = this.viewContainerEl.getBoundingClientRect();
			const newHeight = containerRect.bottom - touch.clientY;
			
			const minHeight = 30;
			const maxHeight = containerRect.height - 200;
			const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
			
			this.fileListHeight = clampedHeight;
			this.fileListEl.style.height = `${clampedHeight}px`;
			this.fileListEl.style.maxHeight = 'none';
		};

		this.documentTouchEndHandler = () => {
			this.isResizing = false;
			this.viewContainerEl.removeClass('cal-resizing');
			this.saveDividerPosition();
		};

		const onTouchStart = (e: TouchEvent) => {
			e.preventDefault();
			this.isResizing = true;
			this.viewContainerEl.addClass('cal-resizing');
			
			document.addEventListener('touchmove', this.documentTouchMoveHandler!, { passive: false });
			document.addEventListener('touchend', this.documentTouchEndHandler!);
		};

		this.resizerEl.addEventListener('touchstart', onTouchStart, { passive: false });
	}

	/**
	 * Save the divider position to localStorage
	 */
	private saveDividerPosition(): void {
		try {
			if (this.fileListHeight !== null) {
				localStorage.setItem(DIVIDER_POSITION_KEY, this.fileListHeight.toString());
			}
		} catch (error) {
			console.error('Failed to save divider position:', error);
		}
	}

	/**
	 * Load the divider position from localStorage
	 */
	private loadDividerPosition(): void {
		try {
			const saved = localStorage.getItem(DIVIDER_POSITION_KEY);
			if (saved) {
				this.fileListHeight = parseInt(saved, 10);
			}
		} catch (error) {
			console.error('Failed to load divider position:', error);
		}
	}

	/**
	 * Setup resize observer for adaptive view switching
	 */
	private setupResizeObserver(): void {
		const handleResize = (entries: ResizeObserverEntry[]) => {
			const entry = entries[0];
			if (!entry) return;
			
			const { width, height } = entry.contentRect;
			const shouldBeExpanded = width >= EXPANDED_VIEW_MIN_WIDTH && height >= EXPANDED_VIEW_MIN_HEIGHT;
			
			// Only re-render if mode actually changed
			if (shouldBeExpanded !== this.isExpandedMode) {
				this.isExpandedMode = shouldBeExpanded;
				this.updateExpandedModeClass();
				this.renderCalendar();
			}
		};
		
		let resizeTimeout: ReturnType<typeof setTimeout>;
		const debouncedResize = (entries: ResizeObserverEntry[]) => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => handleResize(entries), 100);
		};
		
		this.resizeObserver = new ResizeObserver(debouncedResize);
		this.resizeObserver.observe(this.viewContainerEl);
		
		// Initial check
		const rect = this.viewContainerEl.getBoundingClientRect();
		this.isExpandedMode = rect.width >= EXPANDED_VIEW_MIN_WIDTH && rect.height >= EXPANDED_VIEW_MIN_HEIGHT;
		this.updateExpandedModeClass();
	}

	/**
	 * Update the expanded mode class on container
	 */
	private updateExpandedModeClass(): void {
		if (this.isExpandedMode) {
			this.viewContainerEl.addClass('cal-expanded-mode');
		} else {
			this.viewContainerEl.removeClass('cal-expanded-mode');
		}
	}
}
