/**
 * Mock implementations of Obsidian API for testing
 */

export class TFile {
    path: string;
    basename: string;
    extension: string;
    parent: TFolder | null;

    constructor(path: string) {
        this.path = path;
        this.basename = path.replace(/\.md$/, '').split('/').pop() || '';
        this.extension = 'md';
        this.parent = null;
    }
}

export class TFolder {
    path: string;
    name: string;

    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || '';
    }
}

export class TAbstractFile {
    path: string;

    constructor(path: string) {
        this.path = path;
    }
}

export class Vault {
    private files: Map<string, string> = new Map();
    private fileObjects: TFile[] = [];

    async read(file: TFile): Promise<string> {
        return this.files.get(file.path) || '';
    }

    async modify(file: TFile, content: string): Promise<void> {
        this.files.set(file.path, content);
    }

    async create(path: string, content: string): Promise<TFile> {
        const file = new TFile(path);
        this.files.set(path, content);
        this.fileObjects.push(file);
        return file;
    }

    getMarkdownFiles(): TFile[] {
        return this.fileObjects;
    }

    on(_event: string, _callback: (file: TAbstractFile) => void): { unload: () => void } {
        return { unload: () => {} };
    }

    // Test helpers
    addTestFile(path: string, content: string = ''): TFile {
        const file = new TFile(path);
        this.files.set(path, content);
        this.fileObjects.push(file);
        return file;
    }

    setFileContent(path: string, content: string): void {
        this.files.set(path, content);
    }

    getFileContent(path: string): string {
        return this.files.get(path) || '';
    }
}

export class Workspace {
    private activeFile: TFile | null = null;

    getActiveViewOfType(_type: typeof MarkdownView): MarkdownView | null {
        if (this.activeFile) {
            const view = new MarkdownView();
            view.file = this.activeFile;
            return view;
        }
        return null;
    }

    getLeaf(): { openFile: (file: TFile) => Promise<void> } {
        return {
            openFile: async (_file: TFile) => {}
        };
    }

    // Test helper
    setActiveFile(file: TFile): void {
        this.activeFile = file;
    }
}

export class App {
    vault: Vault;
    workspace: Workspace;

    constructor() {
        this.vault = new Vault();
        this.workspace = new Workspace();
    }
}

export class Plugin {
    app: App;
    manifest: { id: string; name: string; version: string };

    constructor() {
        this.app = new App();
        this.manifest = { id: 'bidirectional-folgezettel', name: 'Bidirectional Folgezettel', version: '1.0.0' };
    }

    async loadData(): Promise<Record<string, unknown>> {
        return {};
    }

    async saveData(_data: Record<string, unknown>): Promise<void> {}

    addCommand(_command: {
        id: string;
        name: string;
        callback: () => void;
    }): void {}

    addRibbonIcon(
        _icon: string,
        _title: string,
        _callback: () => void
    ): void {}

    addSettingTab(_tab: PluginSettingTab): void {}

    registerEvent(_event: { unload: () => void }): void {}
}

export class PluginSettingTab {
    app: App;
    plugin: Plugin;
    containerEl: HTMLElement;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }

    display(): void {}
    hide(): void {}
}

export class Setting {
    constructor(_containerEl: HTMLElement) {}

    setName(_name: string): this {
        return this;
    }

    setDesc(_desc: string): this {
        return this;
    }

    addToggle(_callback: (toggle: Toggle) => void): this {
        return this;
    }

    addText(_callback: (text: TextComponent) => void): this {
        return this;
    }
}

export class Toggle {
    setValue(_value: boolean): this {
        return this;
    }

    onChange(_callback: (value: boolean) => void): this {
        return this;
    }
}

export class TextComponent {
    setValue(_value: string): this {
        return this;
    }

    onChange(_callback: (value: string) => void): this {
        return this;
    }
}

export class Notice {
    message: string;

    constructor(message: string, _timeout?: number) {
        this.message = message;
    }

    hide(): void {}
}

export class MarkdownView {
    file: TFile | null = null;
    editor: unknown = null;
}

export type { App as AppType };
