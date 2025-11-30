import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, Notice } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './calendar-view';
import { CalendarPluginSettings, DEFAULT_SETTINGS, WeekStartDay, CalendarViewMode, AVAILABLE_LOCALES, EVENT_COLORS, TagFilterMode } from './types';
import { debounce, SettingsValidator, DateUtils } from './utils';
import { eventBus } from './event-bus';

export default class CalendarPlugin extends Plugin {
	settings!: CalendarPluginSettings;
	private debouncedRefresh: () => void;

	constructor(app: App, manifest: any) {
		super(app, manifest);
		this.debouncedRefresh = debounce(() => this.refreshCalendarView(), 300);
	}

	async onload(): Promise<void> {
		await this.loadSettings();

		// Set locale
		DateUtils.setLocale(this.settings.locale);

		// Register the calendar view
		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('calendar-days', 'Open Calendar', () => {
			this.activateView();
		});

		// Add command
		this.addCommand({
			id: 'open-calendar-view',
			name: 'Open calendar view',
			callback: () => this.activateView()
		});

		this.addCommand({
			id: 'go-to-today',
			name: 'Go to today',
			callback: () => {
				this.activateView();
				eventBus.emit('dateSelected', {
					dateStr: DateUtils.toDateString(new Date()),
					date: new Date()
				});
			}
		});

		this.addCommand({
			id: 'switch-to-month-view',
			name: 'Switch to month view',
			callback: () => {
				this.activateView();
				eventBus.emit('viewModeChanged', { mode: 'month' });
			}
		});

		this.addCommand({
			id: 'switch-to-week-view',
			name: 'Switch to week view',
			callback: () => {
				this.activateView();
				eventBus.emit('viewModeChanged', { mode: 'week' });
			}
		});

		this.addCommand({
			id: 'switch-to-day-view',
			name: 'Switch to day view',
			callback: () => {
				this.activateView();
				eventBus.emit('viewModeChanged', { mode: 'day' });
			}
		});

		// Settings tab
		this.addSettingTab(new CalendarSettingTab(this.app, this));

		// File change listeners with debouncing
		this.registerEvent(
			this.app.vault.on('modify', () => this.debouncedRefresh())
		);

		this.registerEvent(
			this.app.vault.on('delete', () => this.debouncedRefresh())
		);

		this.registerEvent(
			this.app.vault.on('create', () => this.debouncedRefresh())
		);

		this.registerEvent(
			this.app.vault.on('rename', () => this.debouncedRefresh())
		);
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
		eventBus.clear();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		// Validate settings before saving
		const errors = SettingsValidator.validateSettings(this.settings);
		if (errors.length > 0) {
			new Notice('Settings validation errors:\n' + errors.join('\n'));
		}

		await this.saveData(this.settings);
		eventBus.emit('settingsChanged', undefined);
		this.refreshCalendarView();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshCalendarView(): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
		leaves.forEach(leaf => {
			if (leaf.view instanceof CalendarView) {
				leaf.view.refresh();
			}
		});
	}
}

/**
 * Settings tab for the calendar plugin
 */
class CalendarSettingTab extends PluginSettingTab {
	plugin: CalendarPlugin;

	constructor(app: App, plugin: CalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h2', { text: 'Calendar View Settings' });

		// Data Settings Section
		containerEl.createEl('h3', { text: 'Data Settings' });

		new Setting(containerEl)
			.setName('Tag filter')
			.setDesc('Filter notes by tags. Use comma or space to separate multiple tags.')
			.addText(text => text
				.setPlaceholder('calendar, event')
				.setValue(this.plugin.settings.tagFilter)
				.onChange(async (value) => {
					this.plugin.settings.tagFilter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Tag filter mode')
			.setDesc('How to match multiple tags')
			.addDropdown(dropdown => dropdown
				.addOption('any', 'Any tag (OR)')
				.addOption('all', 'All tags (AND)')
				.setValue(this.plugin.settings.tagFilterMode)
				.onChange(async (value) => {
					this.plugin.settings.tagFilterMode = value as TagFilterMode;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date property')
			.setDesc('Frontmatter property containing the date')
			.addText(text => text
				.setPlaceholder('date')
				.setValue(this.plugin.settings.dateProperty)
				.onChange(async (value) => {
					this.plugin.settings.dateProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('End date property')
			.setDesc('Frontmatter property for multi-day events (optional)')
			.addText(text => text
				.setPlaceholder('endDate')
				.setValue(this.plugin.settings.endDateProperty)
				.onChange(async (value) => {
					this.plugin.settings.endDateProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Time property')
			.setDesc('Frontmatter property for event time (optional)')
			.addText(text => text
				.setPlaceholder('time')
				.setValue(this.plugin.settings.timeProperty)
				.onChange(async (value) => {
					this.plugin.settings.timeProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Color property')
			.setDesc('Frontmatter property for event color (optional). Use color names or hex values.')
			.addText(text => text
				.setPlaceholder('color')
				.setValue(this.plugin.settings.colorProperty)
				.onChange(async (value) => {
					this.plugin.settings.colorProperty = value;
					await this.plugin.saveSettings();
				}));

		// Show available color names
		const colorHint = containerEl.createEl('div', { cls: 'setting-item-description' });
		colorHint.style.marginTop = '-10px';
		colorHint.style.marginBottom = '10px';
		colorHint.style.fontSize = '11px';
		colorHint.createEl('span', { text: 'Available colors: ' });
		Object.keys(EVENT_COLORS).forEach((color, i) => {
			const colorSpan = colorHint.createEl('span', { text: color });
			colorSpan.style.color = EVENT_COLORS[color];
			colorSpan.style.fontWeight = 'bold';
			if (i < Object.keys(EVENT_COLORS).length - 1) {
				colorHint.createEl('span', { text: ', ' });
			}
		});

		new Setting(containerEl)
			.setName('Recurrence property')
			.setDesc('Frontmatter property for recurring events (daily, weekly, monthly, yearly)')
			.addText(text => text
				.setPlaceholder('recurrence')
				.setValue(this.plugin.settings.recurrenceProperty)
				.onChange(async (value) => {
					this.plugin.settings.recurrenceProperty = value;
					await this.plugin.saveSettings();
				}));

		// Note Creation Section
		containerEl.createEl('h3', { text: 'Note Creation' });

		new Setting(containerEl)
			.setName('Note folder')
			.setDesc('Folder for new calendar notes (leave empty for vault root)')
			.addText(text => text
				.setPlaceholder('Calendar')
				.setValue(this.plugin.settings.noteFolder)
				.onChange(async (value) => {
					this.plugin.settings.noteFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Format for dates in note titles (YYYY-MM-DD, MMMM DD YYYY, etc.)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note template')
			.setDesc('Template for new notes. Use {{title}} and {{date}} placeholders.')
			.addTextArea(text => {
				text
					.setPlaceholder('# {{title}}\n\nCreated on {{date}}')
					.setValue(this.plugin.settings.noteTemplate)
					.onChange(async (value) => {
						this.plugin.settings.noteTemplate = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 5;
				text.inputEl.cols = 40;
			});

		// Display Settings Section
		containerEl.createEl('h3', { text: 'Display Settings' });

		new Setting(containerEl)
			.setName('Locale')
			.setDesc('Language for month and day names')
			.addDropdown(dropdown => {
				Object.entries(AVAILABLE_LOCALES).forEach(([code, name]) => {
					dropdown.addOption(code, name);
				});
				dropdown.setValue(this.plugin.settings.locale)
					.onChange(async (value) => {
						this.plugin.settings.locale = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Week starts on')
			.setDesc('First day of the week')
			.addDropdown(dropdown => dropdown
				.addOption('0', 'Sunday')
				.addOption('1', 'Monday')
				.setValue(this.plugin.settings.weekStartsOn.toString())
				.onChange(async (value) => {
					this.plugin.settings.weekStartsOn = parseInt(value) as WeekStartDay;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show week numbers')
			.setDesc('Display week numbers in the calendar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showWeekNumbers)
				.onChange(async (value) => {
					this.plugin.settings.showWeekNumbers = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default view')
			.setDesc('Calendar view to show on open')
			.addDropdown(dropdown => dropdown
				.addOption('month', 'Month')
				.addOption('week', 'Week')
				.addOption('day', 'Day')
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value) => {
					this.plugin.settings.defaultView = value as CalendarViewMode;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show preview on hover')
			.setDesc('Show note preview tooltip when hovering over events')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showPreviewOnHover)
				.onChange(async (value) => {
					this.plugin.settings.showPreviewOnHover = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Preview length')
			.setDesc('Maximum characters to show in preview tooltip')
			.addSlider(slider => slider
				.setLimits(50, 500, 25)
				.setValue(this.plugin.settings.previewLength)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.previewLength = value;
					await this.plugin.saveSettings();
				}));

		// Appearance Section
		containerEl.createEl('h3', { text: 'Appearance' });

		new Setting(containerEl)
			.setName('Accent color')
			.setDesc('Custom accent color (leave empty to use theme default)')
			.addText(text => text
				.setPlaceholder('#7c3aed')
				.setValue(this.plugin.settings.accentColor)
				.onChange(async (value) => {
					if (value && !SettingsValidator.isValidHexColor(value)) {
						new Notice('Invalid hex color format. Use format like #7c3aed');
						return;
					}
					this.plugin.settings.accentColor = value;
					await this.plugin.saveSettings();
				}));
	}
}
