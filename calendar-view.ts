import { ItemView, WorkspaceLeaf, TFile, CachedMetadata } from 'obsidian';
import CalendarPlugin from './main';

export const VIEW_TYPE_CALENDAR = 'calendar-view';

export class CalendarView extends ItemView {
	plugin: CalendarPlugin;
	selectedDate: string | null = null;
	currentMonth: Date;

	constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentMonth = new Date();
	}

	getViewType() {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText() {
		return 'Calendar View';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('calendar-view');
		container.createEl('h4', { text: 'Calendar View' });
		
		this.render();
	}

	async onClose() {
		// Nothing to clean up.
	}

	refresh() {
		this.render();
	}

	render() {
		const container = this.containerEl.children[1];
		container.empty();

		// Header
		const header = container.createEl('div', { cls: 'calendar-header' });
		
		// Month navigation
		const navDiv = header.createEl('div', { cls: 'calendar-nav' });
		
		const prevBtn = navDiv.createEl('button', { 
			text: '‹', 
			cls: 'calendar-nav-btn' 
		});
		prevBtn.addEventListener('click', () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
			this.render();
		});

		const monthLabel = navDiv.createEl('span', { 
			text: this.currentMonth.toLocaleDateString('en-US', { 
				month: 'long', 
				year: 'numeric' 
			}),
			cls: 'calendar-month-label'
		});

		const nextBtn = navDiv.createEl('button', { 
			text: '›', 
			cls: 'calendar-nav-btn' 
		});
		nextBtn.addEventListener('click', () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
			this.render();
		});

		// Calendar grid
		const calendarGrid = container.createEl('div', { cls: 'calendar-grid' });
		
		// Day headers
		const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		dayHeaders.forEach(day => {
			calendarGrid.createEl('div', { text: day, cls: 'calendar-day-header' });
		});

		// Get files with the specified tag and date property
		const filesWithDates = this.getFilesWithDates();

		// Calendar days
		this.renderCalendarDays(calendarGrid, filesWithDates);

		// Selected date file list
		if (this.selectedDate) {
			this.renderFileList(container as HTMLElement, filesWithDates);
		}
	}

	renderCalendarDays(grid: HTMLElement, filesWithDates: Map<string, TFile[]>) {
		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();
		
		// First day of the month
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		
		// Days from previous month to show
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());
		
		// Days to show (6 weeks)
		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 41);

		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			const dateStr = this.formatDate(d);
			const dayEl = grid.createEl('div', { cls: 'calendar-day' });
			
			// Add classes
			if (d.getMonth() !== month) {
				dayEl.addClass('calendar-day-other-month');
			}
			
			if (this.isToday(d)) {
				dayEl.addClass('calendar-day-today');
			}

			if (dateStr === this.selectedDate) {
				dayEl.addClass('calendar-day-selected');
			}

			// Check if there are files for this date
			if (filesWithDates.has(dateStr)) {
				dayEl.addClass('calendar-day-has-files');
				const fileCount = filesWithDates.get(dateStr)!.length;
				dayEl.createEl('div', { text: d.getDate().toString(), cls: 'calendar-day-number' });
				dayEl.createEl('div', { text: `${fileCount}`, cls: 'calendar-day-count' });
			} else {
				dayEl.createEl('div', { text: d.getDate().toString(), cls: 'calendar-day-number' });
			}

			// Click handler
			dayEl.addEventListener('click', () => {
				this.selectedDate = dateStr;
				this.render();
			});
		}
	}

	renderFileList(container: HTMLElement, filesWithDates: Map<string, TFile[]>) {
		const fileListContainer = container.createEl('div', { cls: 'calendar-file-list' });
		
		const selectedDateObj = new Date(this.selectedDate!);
		const dateHeader = fileListContainer.createEl('h5', { 
			text: selectedDateObj.toLocaleDateString('en-US', { 
				weekday: 'long',
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			})
		});

		// Add create note button
		const createNoteBtn = fileListContainer.createEl('button', {
			text: '+ Create Note',
			cls: 'calendar-create-note-btn'
		});
		createNoteBtn.addEventListener('click', () => {
			this.createNoteForDate(this.selectedDate!);
		});

		const files = filesWithDates.get(this.selectedDate!) || [];
		
		if (files.length === 0) {
			fileListContainer.createEl('p', { text: 'No files for this date' });
		} else {
			const fileList = fileListContainer.createEl('ul', { cls: 'calendar-files' });
			
			files.forEach(file => {
				const listItem = fileList.createEl('li', { cls: 'calendar-file-item' });
				
				const link = listItem.createEl('a', { 
					text: file.basename,
					cls: 'calendar-file-link'
				});
				
				link.addEventListener('click', (e: MouseEvent) => {
					e.preventDefault();
					this.app.workspace.openLinkText(file.path, '', false);
				});
			});
		}
	}

	getFilesWithDates(): Map<string, TFile[]> {
		const filesWithDates = new Map<string, TFile[]>();
		const files = this.app.vault.getMarkdownFiles();
		
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			// Check if file has the required tag
			if (!this.hasRequiredTag(cache)) continue;

			// Get date from frontmatter
			const dateStr = this.getDateFromFrontmatter(cache);
			if (!dateStr) continue;

			// Normalize date string
			const normalizedDate = this.normalizeDate(dateStr);
			if (!normalizedDate) continue;

			if (!filesWithDates.has(normalizedDate)) {
				filesWithDates.set(normalizedDate, []);
			}
			filesWithDates.get(normalizedDate)!.push(file);
		}

		return filesWithDates;
	}

	hasRequiredTag(cache: CachedMetadata): boolean {
		const requiredTag = this.plugin.settings.tagFilter;
		
		// Check inline tags
		if (cache.tags) {
			const hasInlineTag = cache.tags.some(tag => tag.tag === `#${requiredTag}`);
			if (hasInlineTag) return true;
		}
		
		// Check frontmatter tags
		if (cache.frontmatter && cache.frontmatter.tags) {
			const frontmatterTags = cache.frontmatter.tags;
			if (Array.isArray(frontmatterTags)) {
				return frontmatterTags.includes(requiredTag);
			} else if (typeof frontmatterTags === 'string') {
				return frontmatterTags === requiredTag;
			}
		}
		
		return false;
	}

	getDateFromFrontmatter(cache: CachedMetadata): string | null {
		if (!cache.frontmatter) return null;
		
		const dateProperty = this.plugin.settings.dateProperty;
		const dateValue = cache.frontmatter[dateProperty];
		
		if (!dateValue) return null;
		
		return dateValue.toString();
	}

	normalizeDate(dateStr: string): string | null {
		try {
			// Parse the date string and ensure we treat it as local time
			const date = new Date(dateStr + 'T00:00:00'); // Force local time interpretation
			if (isNaN(date.getTime())) return null;
			return this.formatDate(date);
		} catch {
			return null;
		}
	}

	formatDate(date: Date): string {
		// Use local time methods to avoid timezone issues
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	isToday(date: Date): boolean {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	async createNoteForDate(dateStr: string): Promise<void> {
		// Parse date consistently with local time
		const date = new Date(dateStr + 'T00:00:00');
		const settings = this.plugin.settings;
		
		// Format date for title
		const formattedDate = this.formatDateForTitle(date, settings.dateFormat);
		
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
			// You could show a notice to the user here if needed
		}
	}

	formatDateForTitle(date: Date, format: string): string {
		// Simple date formatting - you could use a library like moment.js for more complex formats
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const monthName = date.toLocaleDateString('en-US', { month: 'long' });
		const shortMonthName = date.toLocaleDateString('en-US', { month: 'short' });
		const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
		
		return format
			.replace(/YYYY/g, year.toString())
			.replace(/MM/g, month)
			.replace(/DD/g, day)
			.replace(/MMMM/g, monthName)
			.replace(/MMM/g, shortMonthName)
			.replace(/dddd/g, dayName);
	}

	generateNoteContent(title: string, formattedDate: string, dateStr: string, settings: any): string {
		const tagFilter = settings.tagFilter;
		const dateProperty = settings.dateProperty;
		
		// Create frontmatter
		const frontmatter = `---\n${dateProperty}: ${dateStr}\ntags:\n  - ${tagFilter}\n---\n\n`;
		
		// Process template
		const content = settings.noteTemplate
			.replace(/{{title}}/g, title)
			.replace(/{{date}}/g, formattedDate);
		
		return frontmatter + content;
	}

	async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}
}