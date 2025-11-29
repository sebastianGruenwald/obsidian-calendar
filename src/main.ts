import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './calendar-view';
import { CalendarPluginSettings, DEFAULT_SETTINGS, WeekStartDay, CalendarViewMode } from './types';
import { debounce } from './utils';

export default class CalendarPlugin extends Plugin {
	settings!: CalendarPluginSettings;
	private debouncedRefresh: () => void;

	constructor(app: App, manifest: any) {
		super(app, manifest);
		this.debouncedRefresh = debounce(() => this.refreshCalendarView(), 300);
	}

	async onload(): Promise<void> {
		await this.loadSettings();

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
				// Could emit event to view here
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
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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
			.setDesc('Only show notes with this tag (without #)')
			.addText(text => text
				.setPlaceholder('calendar')
				.setValue(this.plugin.settings.tagFilter)
				.onChange(async (value) => {
					this.plugin.settings.tagFilter = value;
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
			.setDesc('Display ISO week numbers in the calendar')
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
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value) => {
					this.plugin.settings.defaultView = value as CalendarViewMode;
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
					this.plugin.settings.accentColor = value;
					await this.plugin.saveSettings();
				}));
	}
}
