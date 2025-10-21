import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './calendar-view';

interface CalendarPluginSettings {
	tagFilter: string;
	dateProperty: string;
	noteFolder: string;
	noteTemplate: string;
	dateFormat: string;
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	tagFilter: 'calendar',
	dateProperty: 'date',
	noteFolder: '',
	noteTemplate: '# {{title}}\n\nCreated on {{date}}',
	dateFormat: 'YYYY-MM-DD'
}

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the calendar view
		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this)
		);

		// Add ribbon icon to open calendar view
		const ribbonIconEl = this.addRibbonIcon('calendar-days', 'Calendar View', (evt: MouseEvent) => {
			this.activateView();
		});
		ribbonIconEl.addClass('calendar-plugin-ribbon-class');

		// Add command to open calendar view
		this.addCommand({
			id: 'open-calendar-view',
			name: 'Open Calendar View',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new CalendarSettingTab(this.app, this));

		// Listen for file changes to auto-refresh
		this.registerEvent(
			this.app.vault.on('modify', () => {
				this.refreshCalendarView();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', () => {
				this.refreshCalendarView();
			})
		);

		this.registerEvent(
			this.app.vault.on('create', () => {
				this.refreshCalendarView();
			})
		);
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshCalendarView();
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshCalendarView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
		leaves.forEach(leaf => {
			if (leaf.view instanceof CalendarView) {
				leaf.view.refresh();
			}
		});
	}
}

class CalendarSettingTab extends PluginSettingTab {
	plugin: CalendarPlugin;

	constructor(app: App, plugin: CalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Tag Filter')
			.setDesc('Tag to filter pages by (without #)')
			.addText(text => text
				.setPlaceholder('calendar')
				.setValue(this.plugin.settings.tagFilter)
				.onChange(async (value) => {
					this.plugin.settings.tagFilter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Property')
			.setDesc('Frontmatter property name that contains the date')
			.addText(text => text
				.setPlaceholder('date')
				.setValue(this.plugin.settings.dateProperty)
				.onChange(async (value) => {
					this.plugin.settings.dateProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note Folder')
			.setDesc('Folder where new calendar notes should be created (leave empty for root)')
			.addText(text => text
				.setPlaceholder('Calendar')
				.setValue(this.plugin.settings.noteFolder)
				.onChange(async (value) => {
					this.plugin.settings.noteFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note Template')
			.setDesc('Template for new notes. Use {{title}} for note title and {{date}} for date')
			.addTextArea(text => text
				.setPlaceholder('# {{title}}\n\nCreated on {{date}}')
				.setValue(this.plugin.settings.noteTemplate)
				.onChange(async (value) => {
					this.plugin.settings.noteTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Date format for note titles and content (YYYY-MM-DD, MMMM Do YYYY, etc.)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));
	}
}