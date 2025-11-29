import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import CalendarPlugin from './main';
import { CalendarCore, CalendarDate } from './calendar-core';

export const VIEW_TYPE_CALENDAR = 'calendar-view';

export class CalendarView extends ItemView {
	plugin: CalendarPlugin;
	core: CalendarCore;
	selectedDate: string | null = null;
	currentMonth: Date;
	filesMap: Map<string, TFile[]> = new Map();

	constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.core = new CalendarCore(plugin.app, plugin.settings);
		this.currentMonth = new Date();
	}

	getViewType() {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText() {
		return 'Calendar';
	}

	getIcon() {
		return 'calendar-days';
	}

	async onOpen() {
		this.refresh();
	}

	async onClose() {
		// Nothing to clean up.
	}

	refresh() {
		// Fetch data only on refresh (not on every render)
		this.filesMap = this.core.getFilesWithDates();
		this.render();
	}

	render() {
		const container = this.contentEl;
		container.empty();
		container.addClass('calendar-view');

		// Header Section
		this.renderHeader(container as HTMLElement);

		// Calendar Grid
		this.renderCalendar(container as HTMLElement);

		// File List (if date selected)
		if (this.selectedDate) {
			this.renderFileList(container as HTMLElement);
		}
	}

	renderHeader(container: HTMLElement) {
		const header = container.createEl('div', { cls: 'calendar-header' });
		
		// Left: Month/Year
		const titleDiv = header.createEl('div', { cls: 'calendar-title' });
		titleDiv.createEl('span', { 
text: this.currentMonth.toLocaleDateString('en-US', { month: 'long' }),
cls: 'calendar-month-name'
});
		titleDiv.createEl('span', { 
text: this.currentMonth.getFullYear().toString(),
			cls: 'calendar-year-num'
		});

		// Right: Navigation
		const navDiv = header.createEl('div', { cls: 'calendar-nav' });
		
		// Today Button
		const todayBtn = navDiv.createEl('button', { 
text: 'Today', 
cls: 'calendar-nav-btn calendar-today-btn' 
});
		todayBtn.addEventListener('click', () => {
			this.currentMonth = new Date();
			this.selectedDate = this.core.formatDate(new Date());
			this.render();
		});

		// Prev/Next Buttons
		const prevBtn = navDiv.createEl('button', { 
cls: 'calendar-nav-btn calendar-icon-btn' 
});
		// Use Obsidian icon if possible, or simple text
		prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
		prevBtn.addEventListener('click', () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
			this.render();
		});

		const nextBtn = navDiv.createEl('button', { 
cls: 'calendar-nav-btn calendar-icon-btn' 
});
		nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
		nextBtn.addEventListener('click', () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
			this.render();
		});
	}

	renderCalendar(container: HTMLElement) {
		const calendarContainer = container.createEl('div', { cls: 'calendar-container' });
		
		// Weekday Headers
		const weekHeader = calendarContainer.createEl('div', { cls: 'calendar-week-header' });
		const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		dayHeaders.forEach(day => {
			weekHeader.createEl('div', { text: day.substring(0, 1), cls: 'calendar-weekday' });
		});

		// Days Grid
		const grid = calendarContainer.createEl('div', { cls: 'calendar-grid' });
		
		const days = this.core.getDaysForMonth(this.currentMonth, this.selectedDate, this.filesMap);
		
		days.forEach(day => {
			this.renderDay(grid, day);
		});
	}

	renderDay(grid: HTMLElement, day: CalendarDate) {
		const dayEl = grid.createEl('div', { 
cls: `calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}`
});

		if (day.dateStr === this.selectedDate) {
			dayEl.addClass('selected');
		}

		// Date Number
		dayEl.createEl('div', { text: day.date.getDate().toString(), cls: 'calendar-date-num' });

		// Dots for files
		if (day.files.length > 0) {
			const dotsContainer = dayEl.createEl('div', { cls: 'calendar-dots' });
			// Show up to 3 dots
			const dotCount = Math.min(day.files.length, 3);
			for (let i = 0; i < dotCount; i++) {
				dotsContainer.createEl('div', { cls: 'calendar-dot' });
			}
		}

		// Interaction
		dayEl.addEventListener('click', (e) => {
			e.stopPropagation();
			if (this.selectedDate === day.dateStr) {
				this.selectedDate = null;
			} else {
				this.selectedDate = day.dateStr;
			}
			this.render();
		});
	}

	renderFileList(container: HTMLElement) {
		const fileSection = container.createEl('div', { cls: 'calendar-file-section' });
		
		// Header with Create Button
		const header = fileSection.createEl('div', { cls: 'file-section-header' });
		header.createEl('h5', { text: this.formatSelectedDate() });
		
		const createBtn = header.createEl('button', { 
text: '+', 
cls: 'calendar-create-btn',
title: 'Create Note'
});
		createBtn.addEventListener('click', () => {
			this.createNoteForDate(this.selectedDate!);
		});

		// List
		const files = this.filesMap.get(this.selectedDate!) || [];
		
		if (files.length === 0) {
			fileSection.createEl('div', { text: 'No notes', cls: 'empty-state' });
		} else {
			const list = fileSection.createEl('div', { cls: 'file-list' });
			files.forEach(file => {
				const item = list.createEl('div', { cls: 'file-item' });
				
				// Icon
				item.createEl('span', { cls: 'file-icon', text: '📄' });
				
				// Name
				const name = item.createEl('span', { text: file.basename, cls: 'file-name' });
				
				item.addEventListener('click', () => {
					this.app.workspace.openLinkText(file.path, '', false);
				});
			});
		}
	}

	formatSelectedDate(): string {
		if (!this.selectedDate) return '';
		const date = new Date(this.selectedDate + 'T00:00:00');
		return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}

	async createNoteForDate(dateStr: string): Promise<void> {
		// Parse date consistently with local time
		const date = new Date(dateStr + 'T00:00:00');
		const settings = this.plugin.settings;
		
		// Format date for title
		const formattedDate = this.core.formatDateForTitle(date, settings.dateFormat);
		
		// Generate note title
		const noteTitle = `Calendar Note - ${formattedDate}`;
		
		// Generate file name (safe for filesystem)
		const fileName = `${noteTitle.replace(/[^\w\s-]/g, '')}.md`;
		
		// Determine full file path
		const folder = settings.noteFolder.trim();
		const fullPath = folder ? `${folder}/${fileName}` : fileName;
		
		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
		if (existingFile) {
			// File exists, just open it
			this.app.workspace.openLinkText(fullPath, '', false);
			return;
		}
		
		// Create note content from template
		const noteContent = this.generateNoteContent(noteTitle, formattedDate, dateStr, settings);
		
		try {
			// Ensure folder exists
			if (folder) {
				await this.ensureFolderExists(folder);
			}
			
			// Create the file
			const newFile = await this.app.vault.create(fullPath, noteContent);
			
			// Wait a moment for the metadata cache to update
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Force metadata cache refresh for the new file
			await this.app.metadataCache.getFileCache(newFile);
			
			// Open the new file
			this.app.workspace.openLinkText(newFile.path, '', false);
			
			// Refresh the calendar to show the new file
			setTimeout(() => this.refresh(), 200);
		} catch (error) {
			console.error('Failed to create note:', error);
		}
	}

	generateNoteContent(title: string, formattedDate: string, dateStr: string, settings: any): string {
		const tagFilter = settings.tagFilter;
		const dateProperty = settings.dateProperty;
		
		// Create frontmatter with title and properties only
		const frontmatter = `---\n${dateProperty}: ${dateStr}\ntags:\n  - ${tagFilter}\n---\n\n`;
		
		return frontmatter;
	}

	async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}
}
