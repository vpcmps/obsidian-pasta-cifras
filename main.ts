import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface ChordHighlightPluginSettings {
	highlightColor: string;
	bold: boolean;
	fontSize: number;
	chordMarker: string;
	tabMarker: string;
}

const DEFAULT_SETTINGS: ChordHighlightPluginSettings = {
	highlightColor: "red",
	bold: true,
	fontSize: 16,
	chordMarker: "[[",
	tabMarker: "tablatura",
};

export default class ChordHighlightPlugin extends Plugin {
	settings: ChordHighlightPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ChordHighlightSettingTab(this.app, this));
		this.registerMarkdownPostProcessor((element, context) => {
			this.highlightChords(element);
			this.renderTabs(element);
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	highlightChords(element: HTMLElement) {
		const chordRegex = new RegExp(
			`${
				this.settings.chordMarker
			}([A-G][#b]?(m|maj|min|dim|aug)?[0-9]?)${this.settings.chordMarker
				.split("")
				.reverse()
				.join("")}`,
			"g"
		);
		const textNodes = getTextNodes(element);

		textNodes.forEach((node) => {
			const text = node.nodeValue;
			if (text) {
				let match;
				let lastIndex = 0;
				const parent = node.parentElement;

				if (!parent) return;

				while ((match = chordRegex.exec(text)) !== null) {
					const chord = match[1];
					const startIndex = match.index;
					const endIndex = chordRegex.lastIndex;

					if (startIndex > lastIndex) {
						parent.insertBefore(
							document.createTextNode(
								text.substring(lastIndex, startIndex)
							),
							node
						);
					}

					const chordSpan = document.createElement("span");
					chordSpan.textContent = chord;
					chordSpan.style.color = this.settings.highlightColor;
					chordSpan.style.fontWeight = this.settings.bold
						? "bold"
						: "normal";
					chordSpan.style.fontSize = `${this.settings.fontSize}px`;
					parent.insertBefore(chordSpan, node);

					lastIndex = endIndex;
				}

				if (lastIndex < text.length) {
					parent.insertBefore(
						document.createTextNode(text.substring(lastIndex)),
						node
					);
				}

				parent.removeChild(node);
			}
		});
	}

	renderTabs(element: HTMLElement) {
		const codeBlocks = element.querySelectorAll("pre code");
		codeBlocks.forEach((codeBlock) => {
			const text = codeBlock.textContent;
			if (
				text &&
				codeBlock.className.includes(
					`language-${this.settings.tabMarker}`
				)
			) {
				const tabHtml = this.renderTab(text);
				if (tabHtml) {
					const preElement = codeBlock.parentElement;
					if (preElement) {
						preElement.outerHTML = tabHtml;
					}
				}
			}
		});
	}

	renderTab(tabText: string): string {
		const lines = tabText.split("\n");
		let html = '<pre class="tab-rendered">';
		lines.forEach((line) => {
			html += `<div>${line}</div>`;
		});
		html += "</pre>";
		return html;
	}
}

function getTextNodes(node: HTMLElement): Text[] {
	const textNodes: Text[] = [];
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
	let textNode: Text | null;
	while ((textNode = walker.nextNode() as Text)) {
		textNodes.push(textNode);
	}
	return textNodes;
}

class ChordHighlightSettingTab extends PluginSettingTab {
	plugin: ChordHighlightPlugin;

	constructor(app: App, plugin: ChordHighlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Configurações de Destaque" });

		new Setting(containerEl)
			.setName("Cor da Fonte")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Negrito").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.bold)
				.onChange(async (value) => {
					this.plugin.settings.bold = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName("Tamanho da Fonte")
			.addSlider((slider) =>
				slider
					.setLimits(10, 30, 1)
					.setValue(this.plugin.settings.fontSize)
					.onChange(async (value) => {
						this.plugin.settings.fontSize = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl).setName("Marcação da cifra").addText((text) =>
			text
				.setValue(this.plugin.settings.chordMarker)
				.onChange(async (value) => {
					this.plugin.settings.chordMarker = value;
					await this.plugin.saveSettings();
				})
		);
		new Setting(containerEl)
			.setName("Marcação da tablatura")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.tabMarker)
					.onChange(async (value) => {
						this.plugin.settings.tabMarker = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
