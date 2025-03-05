import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface ChordHighlightPluginSettings {
	highlightColor: string;
	bold: boolean;
	fontSize: number;
}

const DEFAULT_SETTINGS: ChordHighlightPluginSettings = {
	highlightColor: "orange",
	bold: true,
	fontSize: 20,
};

export default class ChordHighlightPlugin extends Plugin {
	settings: ChordHighlightPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ChordHighlightSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			this.highlightChords(element);
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
		const chordRegex = /\[([A-G][#b]?(m|maj|min|dim|aug)?[0-9]?)\]/g;
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
					chordSpan.textContent = chord; // Remove os colchetes
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

		containerEl.createEl("h2", {
			text: "Configurações de Destaque de Acordes",
		});

		new Setting(containerEl)
			.setName("Cor da Fonte")
			.setDesc("Escolha a cor para destacar os acordes.")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Negrito")
			.setDesc("Destacar acordes em negrito.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.bold)
					.onChange(async (value) => {
						this.plugin.settings.bold = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tamanho da Fonte")
			.setDesc("Escolha o tamanho da fonte para os acordes destacados.")
			.addSlider((slider) =>
				slider
					.setLimits(10, 30, 1)
					.setValue(this.plugin.settings.fontSize)
					.onChange(async (value) => {
						this.plugin.settings.fontSize = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
