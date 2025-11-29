import { ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';
import { CalendarCore } from './calendar-core';
import { CalendarDate, CalendarViewMode, CalendarPluginSettings } from './types';
import { DateUtils, debounce } from './utils';

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
	private filesMap: Map<string, TFile[]> = new Map();
	private viewMode: CalendarViewMode = 'month';
	private viewContainerEl!: HTMLElement;

	// DOM References for efficient updates
	private headerEl: HTMLElement | null = null;
	private calendarEl: HTMLElement | null = null;
	private resizerEl: HTMLElement | null = null;
	private fileListEl: HTMLElement | null = null;

	// Resizer state
	private isResizing = false;
	private fileListHeight: number | null = null;

	// Adaptive display mode
	private isExpandedMode = false;
	private resizeObserver: ResizeObserver | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.core = new CalendarCore(plugin.app, plugin.settings);
		this.currentDate = new Date();
		this.viewMode = plugin.settings.defaultView;
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
	}

	/**
	 * Full refresh - fetches data and rerenders
	 */
	refresh = debounce(() => {
		this.core.updateSettings(this.plugin.settings);
		this.filesMap = this.core.getFilesWithDates();
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

		// Navigation
		const navSection = topRow.createEl('div', { cls: 'cal-nav' });

		// Create note button (only show when date is selected)
		if (this.selectedDate) {
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
			attr: { 'aria-label': 'Previous month' }
		});
		setIcon(prevBtn, 'chevron-left');
		prevBtn.addEventListener('click', () => this.navigatePrevious());

		const nextBtn = navSection.createEl('button', { 
			cls: 'cal-btn cal-btn-icon',
			attr: { 'aria-label': 'Next month' }
		});
		setIcon(nextBtn, 'chevron-right');
		nextBtn.addEventListener('click', () => this.navigateNext());
	}

	/**
	 * Render the calendar grid
	 */
	private renderCalendar(): void {
		if (!this.calendarEl) return;
		this.calendarEl.empty();

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
		const weeks = this.core.getWeeksForMonth(this.currentDate, this.filesMap);
		
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
		const days = this.core.getDaysForWeek(this.currentDate, this.filesMap);
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
	 * Render a single day cell
	 */
	private renderDay(container: HTMLElement, day: CalendarDate): void {
		const classes = ['cal-day'];
		
		if (!day.isCurrentMonth) classes.push('cal-day-other');
		if (day.isToday) classes.push('cal-day-today');
		if (day.isWeekend) classes.push('cal-day-weekend');
		if (day.dateStr === this.selectedDate) classes.push('cal-day-selected');
		if (day.files.length > 0) classes.push('cal-day-has-events');
		if (this.isExpandedMode) classes.push('cal-day-inline-events');
		
		const dayEl = container.createEl('div', { cls: classes.join(' ') });
		dayEl.setAttribute('data-date', day.dateStr);

		// Date number
		const dateNum = dayEl.createEl('div', { cls: 'cal-day-num' });
		dateNum.createEl('span', { text: day.date.getDate().toString() });

		// Events display - depends on mode
		if (day.files.length > 0) {
			if (this.isExpandedMode) {
				// Expanded mode: show event titles inline
				this.renderInlineEvents(dayEl, day);
			} else {
				// Compact mode: show dots
				const indicators = dayEl.createEl('div', { cls: 'cal-day-indicators' });
				const count = Math.min(day.files.length, 3);
				
				for (let i = 0; i < count; i++) {
					indicators.createEl('span', { cls: 'cal-indicator' });
				}
				
				if (day.files.length > 3) {
					indicators.createEl('span', { 
						cls: 'cal-indicator-more',
						text: `+${day.files.length - 3}`
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
	}

	/**
	 * Render inline events for expanded mode
	 */
	private renderInlineEvents(dayEl: HTMLElement, day: CalendarDate): void {
		const eventsContainer = dayEl.createEl('div', { cls: 'cal-inline-events' });
		
		// Calculate how many events we can show based on available space
		// We'll show 2-3 events max in inline mode
		const maxVisible = 3;
		const visibleFiles = day.files.slice(0, maxVisible);
		const remaining = day.files.length - maxVisible;
		
		visibleFiles.forEach(file => {
			const eventEl = eventsContainer.createEl('div', { 
				cls: 'cal-inline-event',
				attr: { 'title': file.basename }
			});
			eventEl.createEl('span', { 
				cls: 'cal-inline-event-text',
				text: file.basename 
			});
			
			eventEl.addEventListener('click', (e) => {
				e.stopPropagation();
				this.openFile(file);
			});
		});
		
		if (remaining > 0) {
			eventsContainer.createEl('div', { 
				cls: 'cal-inline-event-more',
				text: `+${remaining} more`
			});
		}
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
			text: day.date.toLocaleDateString('en-US', { weekday: 'short' })
		});
		header.createEl('span', { 
			cls: 'cal-day-num',
			text: day.date.getDate().toString()
		});

		// Events list
		if (day.files.length > 0) {
			const eventsList = dayEl.createEl('div', { cls: 'cal-day-events' });
			day.files.slice(0, 4).forEach(file => {
				const eventEl = eventsList.createEl('div', { 
					cls: 'cal-event-mini',
					text: file.basename
				});
				eventEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openFile(file);
				});
			});
			
			if (day.files.length > 4) {
				eventsList.createEl('div', { 
					cls: 'cal-event-more',
					text: `+${day.files.length - 4} more`
				});
			}
		}

		// Click handler
		dayEl.addEventListener('click', (e) => {
			if ((e.target as HTMLElement).closest('.cal-event-mini')) return;
			this.selectDate(day.dateStr);
		});
	}

	/**
	 * Render the file list for selected date
	 */
	private renderFileList(): void {
		if (!this.fileListEl || !this.resizerEl) return;

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
		const files = this.filesMap.get(this.selectedDate) || [];
		
		if (files.length === 0) {
			const emptyState = this.fileListEl.createEl('div', { cls: 'cal-files-empty-compact' });
			emptyState.createEl('span', { 
				text: 'No notes',
				cls: 'cal-files-empty-text'
			});
		} else {
			const list = this.fileListEl.createEl('div', { cls: 'cal-files-list-compact' });
			
			files.forEach(file => {
				const item = list.createEl('div', { 
					cls: 'cal-file-item-compact',
					attr: { 'title': file.path }
				});
				item.createEl('span', { 
					cls: 'cal-file-item-text',
					text: file.basename 
				});
				item.addEventListener('click', () => this.openFile(file));
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
		if (this.viewMode === 'month') {
			this.currentDate = DateUtils.addMonths(this.currentDate, -1);
		} else {
			this.currentDate = DateUtils.addDays(this.currentDate, -7);
		}
		this.render();
	}

	private navigateNext(): void {
		if (this.viewMode === 'month') {
			this.currentDate = DateUtils.addMonths(this.currentDate, 1);
		} else {
			this.currentDate = DateUtils.addDays(this.currentDate, 7);
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
		this.render();
	}

	/**
	 * Open a file
	 */
	private openFile(file: TFile): void {
		this.app.workspace.openLinkText(file.path, '', false);
	}

	/**
	 * Create a new note for the selected date
	 */
	private async createNote(): Promise<void> {
		if (!this.selectedDate) return;

		const settings = this.plugin.settings;
		
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const fileName = `Untitled ${timestamp}.md`;
		
		const folder = settings.noteFolder.trim();
		const fullPath = folder ? `${folder}/${fileName}` : fileName;
		
		// Generate content (only frontmatter)
		const content = this.generateNoteContent(this.selectedDate);
		
		try {
			// Ensure folder exists
			if (folder) {
				await this.ensureFolderExists(folder);
			}
			
			// Create file
			const newFile = await this.app.vault.create(fullPath, content);
			
			// Open file
			const leaf = await this.app.workspace.getLeaf(false);
			await leaf.openFile(newFile);
			
			// Trigger rename to focus on title
			setTimeout(() => {
				const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
				if (fileExplorer) {
					// Use the app's built-in file rename command
					(this.app as any).commands.executeCommandById('workspace:edit-file-title');
				}
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
		
		// Frontmatter only
		const frontmatter = [
			'---',
			`${settings.dateProperty}: ${dateStr}`,
			'tags:',
			`  - ${settings.tagFilter}`,
			'---',
			''
		].join('\n');
		
		return frontmatter;
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

		const onMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			this.isResizing = true;
			this.viewContainerEl.addClass('cal-resizing');
			
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		};

		const onMouseMove = (e: MouseEvent) => {
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

		const onMouseUp = () => {
			this.isResizing = false;
			this.viewContainerEl.removeClass('cal-resizing');
			
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			
			// Save position
			this.saveDividerPosition();
		};

		this.resizerEl.addEventListener('mousedown', onMouseDown);

		// Touch support for mobile
		const onTouchStart = (e: TouchEvent) => {
			e.preventDefault();
			this.isResizing = true;
			this.viewContainerEl.addClass('cal-resizing');
			
			document.addEventListener('touchmove', onTouchMove, { passive: false });
			document.addEventListener('touchend', onTouchEnd);
		};

		const onTouchMove = (e: TouchEvent) => {
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

		const onTouchEnd = () => {
			this.isResizing = false;
			this.viewContainerEl.removeClass('cal-resizing');
			
			document.removeEventListener('touchmove', onTouchMove);
			document.removeEventListener('touchend', onTouchEnd);
			
			this.saveDividerPosition();
		};

		this.resizerEl.addEventListener('touchstart', onTouchStart, { passive: false });
	}

	/**
	 * Save the divider position to localStorage
	 */
	private saveDividerPosition(): void {
		if (this.fileListHeight !== null) {
			localStorage.setItem(DIVIDER_POSITION_KEY, this.fileListHeight.toString());
		}
	}

	/**
	 * Load the divider position from localStorage
	 */
	private loadDividerPosition(): void {
		const saved = localStorage.getItem(DIVIDER_POSITION_KEY);
		if (saved) {
			this.fileListHeight = parseInt(saved, 10);
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
