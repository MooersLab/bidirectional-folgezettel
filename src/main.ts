/**
 * Bidirectional Folgezettel Plugin
 *
 * Automatic folgezettel backlink generation for Obsidian notes.
 * Translated from org-roam-folgezettel.el by Blaine Mooers.
 *
 * When you create a new note with a folgezettel in its title, this plugin
 * will automatically:
 * 1. Parse the folgezettel to identify the parent note's address
 * 2. Search the vault for the parent note
 * 3. Insert a backlink to the parent note in the new note's content
 * 4. Optionally insert a forward link in the parent note
 *
 * Additionally, the plugin supports automatic bidirectional cross-linking
 * when you manually create links between notes.
 */

import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TAbstractFile,
  Notice,
  MarkdownView,
  Modal,
} from "obsidian";

// ============================================================================
// Interfaces
// ============================================================================

interface FolgezettelSettings {
  autoProcess: boolean;
  showNotifications: boolean;
  autoBidirectionalLinks: boolean;
  parentLinkDescription: string;
  childLinkDescription: string;
  backlinkHeading: string;
  forwardLinkHeading: string;
  crossLinkHeading: string;
}

interface ParsedAddress {
  segments: (number | string)[];
  raw: string;
}

interface AddressValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  existingFile: TFile | null;
  message: string;
}

// ============================================================================
// Duplicate Address Warning Modal
// ============================================================================

class DuplicateAddressModal extends Modal {
  private address: string;
  private existingFile: TFile;
  private onConfirm: () => void;
  private onCancel: () => void;

  constructor(
    app: App,
    address: string,
    existingFile: TFile,
    onConfirm: () => void,
    onCancel: () => void,
  ) {
    super(app);
    this.address = address;
    this.existingFile = existingFile;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "⚠️ Duplicate Folgezettel Address" });

    contentEl.createEl("p", {
      text: `The folgezettel address "${this.address}" is already used by:`,
    });

    const fileInfo = contentEl.createEl("div", { cls: "duplicate-file-info" });
    fileInfo.style.padding = "10px";
    fileInfo.style.margin = "10px 0";
    fileInfo.style.backgroundColor = "var(--background-secondary)";
    fileInfo.style.borderRadius = "5px";
    fileInfo.style.fontFamily = "var(--font-monospace)";
    fileInfo.createEl("strong", { text: this.existingFile.path });

    contentEl.createEl("p", {
      text: "Creating another note with the same address may cause confusion in your Zettelkasten. Do you want to proceed anyway?",
    });

    const buttonContainer = contentEl.createEl("div", {
      cls: "modal-button-container",
    });
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "20px";

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
      this.onCancel();
    });

    const confirmButton = buttonContainer.createEl("button", {
      text: "Create Anyway",
      cls: "mod-warning",
    });
    confirmButton.style.backgroundColor = "var(--interactive-accent)";
    confirmButton.style.color = "var(--text-on-accent)";
    confirmButton.addEventListener("click", () => {
      this.close();
      this.onConfirm();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// Duplicate Address Warning Modal (Informational - for existing files)
// ============================================================================

class DuplicateAddressWarningModal extends Modal {
  private address: string;
  private newFile: TFile;
  private existingFile: TFile;

  constructor(app: App, address: string, newFile: TFile, existingFile: TFile) {
    super(app);
    this.address = address;
    this.newFile = newFile;
    this.existingFile = existingFile;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: "⚠️ Duplicate Folgezettel Address Detected",
    });

    contentEl.createEl("p", {
      text: `The folgezettel address "${this.address}" is used by multiple notes:`,
    });

    const fileList = contentEl.createEl("div", { cls: "duplicate-file-list" });
    fileList.style.padding = "10px";
    fileList.style.margin = "10px 0";
    fileList.style.backgroundColor = "var(--background-secondary)";
    fileList.style.borderRadius = "5px";
    fileList.style.fontFamily = "var(--font-monospace)";

    const newFileEl = fileList.createEl("div");
    newFileEl.createEl("span", { text: "📄 New: " });
    newFileEl.createEl("strong", { text: this.newFile.path });

    const existingFileEl = fileList.createEl("div");
    existingFileEl.style.marginTop = "5px";
    existingFileEl.createEl("span", { text: "📄 Existing: " });
    existingFileEl.createEl("strong", { text: this.existingFile.path });

    contentEl.createEl("p", {
      text: "Having duplicate addresses may cause confusion in your Zettelkasten. Consider renaming one of these notes to use a unique address.",
    });

    const buttonContainer = contentEl.createEl("div", {
      cls: "modal-button-container",
    });
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "20px";

    const okButton = buttonContainer.createEl("button", {
      text: "OK, I understand",
    });
    okButton.style.backgroundColor = "var(--interactive-accent)";
    okButton.style.color = "var(--text-on-accent)";
    okButton.addEventListener("click", () => {
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: FolgezettelSettings = {
  autoProcess: true,
  showNotifications: true,
  autoBidirectionalLinks: true,
  parentLinkDescription: "Parent",
  childLinkDescription: "Child",
  backlinkHeading: "Related Notes",
  forwardLinkHeading: "Child Notes",
  crossLinkHeading: "Related Notes",
};

// ============================================================================
// Main Plugin Class
// ============================================================================

export default class BidirectionalFolgezettelPlugin extends Plugin {
  settings: FolgezettelSettings;
  private fileContentCache: Map<string, Set<string>> = new Map();
  private processingFile: string | null = null;
  private recentlyCreatedFiles: Set<string> = new Set();

  async onload() {
    await this.loadSettings();

    // Register commands
    this.addCommand({
      id: "add-backlink-to-parent",
      name: "Add backlink to parent note",
      callback: () => this.addBacklinkToParent(),
    });

    this.addCommand({
      id: "create-next-child",
      name: "Create next child note",
      callback: () => this.createNextChild(),
    });

    this.addCommand({
      id: "suggest-next-child",
      name: "Suggest next child address",
      callback: () => this.suggestNextChildCommand(),
    });

    // Add ribbon icon
    this.addRibbonIcon("link", "Folgezettel: Add parent link", () => {
      this.addBacklinkToParent();
    });

    // Register event handlers for new file creation
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile) {
          // Track newly created files
          this.recentlyCreatedFiles.add(file.path);

          // Check for duplicate address immediately if title has address
          this.checkForDuplicateAddress(file);

          if (this.settings.autoProcess) {
            this.processNewFile(file);
          }
        }
      }),
    );

    // Event handler for file rename - this catches when user types a title
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile) {
          // Update recently created files tracking
          if (this.recentlyCreatedFiles.has(oldPath)) {
            this.recentlyCreatedFiles.delete(oldPath);
            this.recentlyCreatedFiles.add(file.path);
          }

          // Check for duplicate address after rename
          this.checkForDuplicateAddress(file);

          if (this.settings.autoProcess) {
            this.processNewFile(file);
          }
        }
      }),
    );

    // Event handler for bidirectional cross-linking
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (this.settings.autoBidirectionalLinks && file instanceof TFile) {
          this.onFileModify(file);
        }
      }),
    );

    // Add settings tab
    this.addSettingTab(new FolgezettelSettingTab(this.app, this));
  }

  /**
   * Check if a file's folgezettel address is already used by another file.
   * Shows a warning notice if duplicate is detected.
   * Uses a non-blocking Notice to avoid interrupting title editing.
   */
  checkForDuplicateAddress(file: TFile): void {
    const address = this.extractFromTitle(file.basename);
    if (!address) return;

    // Find any other file with the same address
    const files = this.app.vault.getMarkdownFiles();
    for (const otherFile of files) {
      if (otherFile.path === file.path) continue;

      const otherAddress = this.extractFromTitle(otherFile.basename);
      if (otherAddress === address) {
        // Show non-blocking warning notice (does not steal focus)
        new Notice(
          `⚠️ Duplicate folgezettel address!\n\n` +
            `"${address}" is already used by:\n` +
            `${otherFile.path}\n\n` +
            `Consider using a different address.`,
          15000, // Show for 15 seconds
        );
        return;
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ========================================================================
  // Address Parsing
  // ========================================================================

  /**
   * Parse a folgezettel address string into its component segments.
   * Valid formats: "1.2a3c5", "1.13aa", "1.2a15", etc.
   * The address must start with a number.
   */
  parseAddress(address: string): ParsedAddress | null {
    if (!address || typeof address !== "string") {
      return null;
    }

    const trimmed = address.trim();
    if (!trimmed) {
      return null;
    }

    // Must start with a digit
    if (!/^\d/.test(trimmed)) {
      return null;
    }

    const segments: (number | string)[] = [];
    let current = "";
    let isNumber = true;

    for (const char of trimmed) {
      if (char === ".") {
        // Dot is a separator, push current segment
        if (current) {
          segments.push(isNumber ? parseInt(current, 10) : current);
          current = "";
        }
        isNumber = true;
      } else if (/\d/.test(char)) {
        if (!isNumber && current) {
          segments.push(current);
          current = "";
        }
        isNumber = true;
        current += char;
      } else if (/[a-zA-Z]/.test(char)) {
        if (isNumber && current) {
          segments.push(parseInt(current, 10));
          current = "";
        }
        isNumber = false;
        current += char.toLowerCase();
      } else {
        // Invalid character - stop parsing
        break;
      }
    }

    // Push final segment
    if (current) {
      segments.push(isNumber ? parseInt(current, 10) : current);
    }

    if (segments.length === 0) {
      return null;
    }

    return {
      segments,
      raw: trimmed,
    };
  }

  /**
   * Extract a folgezettel address from a note title.
   * The address should be at the beginning or clearly identifiable.
   */
  extractFromTitle(title: string): string | null {
    if (!title) return null;

    // Pattern: starts with number, followed by optional dot-separated
    // numbers and letter sequences
    const match = title.match(/^(\d+(?:\.\d+)*(?:[a-zA-Z]+\d*)*)/);
    if (match) {
      return match[1];
    }

    // Also try to find address anywhere in title
    const anyMatch = title.match(/(\d+(?:\.\d+)*(?:[a-zA-Z]+\d*)*)/);
    if (anyMatch) {
      return anyMatch[1];
    }

    return null;
  }

  /**
   * Compute the parent address from a given folgezettel address.
   * For "1.2a3", parent is "1.2a". For "1.2a", parent is "1.2".
   */
  getParentAddress(address: string): string | null {
    const parsed = this.parseAddress(address);
    if (!parsed || parsed.segments.length <= 1) {
      return null;
    }

    // Remove the last segment
    const parentSegments = parsed.segments.slice(0, -1);
    return this.segmentsToAddress(parentSegments);
  }

  /**
   * Convert segments array back to address string.
   */
  segmentsToAddress(segments: (number | string)[]): string {
    let result = "";
    let lastWasNumber = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isNum = typeof seg === "number";

      if (i === 0) {
        result = String(seg);
      } else if (isNum && lastWasNumber) {
        result += "." + seg;
      } else {
        result += seg;
      }

      lastWasNumber = isNum;
    }

    return result;
  }

  // ========================================================================
  // File Operations
  // ========================================================================

  /**
   * Find a file in the vault by its folgezettel address.
   */
  findParentFile(parentAddress: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      const titleAddress = this.extractFromTitle(file.basename);
      if (titleAddress === parentAddress) {
        return file;
      }
    }

    return null;
  }

  /**
   * Find a file in the vault by its exact folgezettel address.
   * Returns the file if found, null otherwise.
   */
  findFileByAddress(address: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      const titleAddress = this.extractFromTitle(file.basename);
      if (titleAddress === address) {
        return file;
      }
    }

    return null;
  }

  /**
   * Validate a proposed folgezettel address.
   * Checks if the address is valid and not already in use.
   */
  validateAddress(address: string): AddressValidationResult {
    // Check if address is valid
    const parsed = this.parseAddress(address);
    if (!parsed) {
      return {
        isValid: false,
        isDuplicate: false,
        existingFile: null,
        message: `Invalid folgezettel address: "${address}"`,
      };
    }

    // Check if address already exists in vault
    const existingFile = this.findFileByAddress(address);
    if (existingFile) {
      return {
        isValid: true,
        isDuplicate: true,
        existingFile: existingFile,
        message: `Address "${address}" is already used by: ${existingFile.path}`,
      };
    }

    return {
      isValid: true,
      isDuplicate: false,
      existingFile: null,
      message: `Address "${address}" is available`,
    };
  }

  /**
   * Find a file by its basename (without extension).
   */
  findFileByBasename(basename: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();
    const normalizedBasename = basename.toLowerCase();

    for (const file of files) {
      if (file.basename.toLowerCase() === normalizedBasename) {
        return file;
      }
    }

    return null;
  }

  /**
   * Extract all wiki-style links from content.
   */
  extractLinks(content: string): Set<string> {
    const links = new Set<string>();
    const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.add(match[1].trim());
    }

    return links;
  }

  /**
   * Insert a link under a specific heading, at the end of the section.
   */
  async insertLinkUnderHeading(
    file: TFile,
    linkedFile: TFile,
    heading: string,
    description: string,
  ): Promise<boolean> {
    const content = await this.app.vault.read(file);
    const linkText = `- [[${linkedFile.basename}]] (${description})`;

    // Check if link already exists
    if (content.includes(`[[${linkedFile.basename}]]`)) {
      return false;
    }

    const headingRegex = new RegExp(`^## ${heading}\\s*$`, "m");
    const headingMatch = content.match(headingRegex);

    let newContent: string;

    if (headingMatch && headingMatch.index !== undefined) {
      // Find the end of this section (next heading or end of file)
      const afterHeading = content.slice(
        headingMatch.index + headingMatch[0].length,
      );
      const nextHeadingMatch = afterHeading.match(/\n## /);

      let insertPosition: number;
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        // Insert before the next heading
        insertPosition =
          headingMatch.index + headingMatch[0].length + nextHeadingMatch.index;
      } else {
        // Insert at end of file
        insertPosition = content.length;
      }

      // Find the last non-empty line before insert position
      const beforeInsert = content.slice(0, insertPosition);
      const trimmedBefore = beforeInsert.trimEnd();

      newContent =
        trimmedBefore + "\n" + linkText + "\n" + content.slice(insertPosition);
    } else {
      // Create new heading at end of file
      newContent =
        content.trimEnd() + "\n\n## " + heading + "\n" + linkText + "\n";
    }

    await this.app.vault.modify(file, newContent);
    return true;
  }

  // ========================================================================
  // Core Functionality
  // ========================================================================

  /**
   * Process a newly created file to add folgezettel links.
   * Duplicate address detection is handled separately by checkForDuplicateAddress().
   */
  async processNewFile(file: TFile) {
    const address = this.extractFromTitle(file.basename);
    if (!address) return;

    const parentAddress = this.getParentAddress(address);
    if (!parentAddress) return;

    const parentFile = this.findParentFile(parentAddress);
    if (!parentFile) {
      if (this.settings.showNotifications) {
        new Notice(`Parent note not found for address: ${parentAddress}`);
      }
      return;
    }

    // Insert backlink in child (current file)
    const backlinkInserted = await this.insertLinkUnderHeading(
      file,
      parentFile,
      this.settings.backlinkHeading,
      this.settings.parentLinkDescription,
    );

    // Insert forward link in parent
    const forwardLinkInserted = await this.insertLinkUnderHeading(
      parentFile,
      file,
      this.settings.forwardLinkHeading,
      this.settings.childLinkDescription,
    );

    if (this.settings.showNotifications) {
      if (backlinkInserted || forwardLinkInserted) {
        new Notice(`Folgezettel links created for ${file.basename}`);
      }
    }
  }

  /**
   * Command: Add backlink to parent note for the current file.
   */
  async addBacklinkToParent() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      new Notice("No active note");
      return;
    }

    const file = activeView.file;
    const address = this.extractFromTitle(file.basename);

    if (!address) {
      new Notice("No folgezettel address found in note title");
      return;
    }

    const parentAddress = this.getParentAddress(address);
    if (!parentAddress) {
      new Notice("This appears to be a root note (no parent)");
      return;
    }

    const parentFile = this.findParentFile(parentAddress);
    if (!parentFile) {
      new Notice(`Parent note not found for address: ${parentAddress}`);
      return;
    }

    // Insert backlink in child
    const backlinkInserted = await this.insertLinkUnderHeading(
      file,
      parentFile,
      this.settings.backlinkHeading,
      this.settings.parentLinkDescription,
    );

    // Insert forward link in parent
    const forwardLinkInserted = await this.insertLinkUnderHeading(
      parentFile,
      file,
      this.settings.forwardLinkHeading,
      this.settings.childLinkDescription,
    );

    if (backlinkInserted || forwardLinkInserted) {
      new Notice(`Links created: ${file.basename} ↔ ${parentFile.basename}`);
    } else {
      new Notice("Links already exist");
    }
  }

  // ========================================================================
  // Child Note Suggestions
  // ========================================================================

  /**
   * Get the next letter in sequence (a -> b, z -> aa, az -> ba).
   */
  nextLetterSequence(letters: string): string {
    if (!letters) return "a";

    const chars = letters.split("");
    let i = chars.length - 1;

    while (i >= 0) {
      if (chars[i] === "z") {
        chars[i] = "a";
        i--;
      } else {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        return chars.join("");
      }
    }

    return "a" + chars.join("");
  }

  /**
   * Determine if a parent address ends with a letter or number.
   * Returns 'letter' if ends with letter, 'number' if ends with number.
   */
  getLastSegmentType(address: string): "letter" | "number" | null {
    const parsed = this.parseAddress(address);
    if (!parsed || parsed.segments.length === 0) {
      return null;
    }

    const lastSegment = parsed.segments[parsed.segments.length - 1];
    return typeof lastSegment === "string" ? "letter" : "number";
  }

  /**
   * Get existing children of a note by address.
   */
  getChildrenOf(address: string): string[] {
    const files = this.app.vault.getMarkdownFiles();
    const children: string[] = [];

    for (const file of files) {
      const fileAddress = this.extractFromTitle(file.basename);
      if (!fileAddress) continue;

      const parentOfFile = this.getParentAddress(fileAddress);
      if (parentOfFile === address) {
        children.push(fileAddress);
      }
    }

    return children;
  }

  /**
   * Suggest the next child address for a given parent address.
   * Follows folgezettel alternation rules:
   * - If parent ends with number, child ends with letter (1.2 -> 1.2a)
   * - If parent ends with letter, child ends with number (1.2a -> 1.2a1)
   */
  suggestNextChild(parentAddress: string): string {
    const children = this.getChildrenOf(parentAddress);
    const lastSegmentType = this.getLastSegmentType(parentAddress);

    if (lastSegmentType === "letter") {
      // Parent ends with letter, so child must end with number
      if (children.length === 0) {
        return parentAddress + "1";
      }

      // Find the highest number suffix among children
      let maxNumber = 0;

      for (const child of children) {
        const parsed = this.parseAddress(child);
        if (!parsed) continue;

        const lastSegment = parsed.segments[parsed.segments.length - 1];
        if (typeof lastSegment === "number") {
          if (lastSegment > maxNumber) {
            maxNumber = lastSegment;
          }
        }
      }

      return parentAddress + (maxNumber + 1);
    } else {
      // Parent ends with number (or is root), so child must end with letter
      if (children.length === 0) {
        return parentAddress + "a";
      }

      // Find the highest letter suffix among children
      let maxLetters = "";

      for (const child of children) {
        const parsed = this.parseAddress(child);
        if (!parsed) continue;

        const lastSegment = parsed.segments[parsed.segments.length - 1];
        if (typeof lastSegment === "string") {
          if (lastSegment > maxLetters) {
            maxLetters = lastSegment;
          }
        }
      }

      const nextLetters = this.nextLetterSequence(maxLetters);
      return parentAddress + nextLetters;
    }
  }

  /**
   * Command: Suggest next child address.
   */
  suggestNextChildCommand() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      new Notice("No active note");
      return;
    }

    const address = this.extractFromTitle(activeView.file.basename);
    if (!address) {
      new Notice("No folgezettel address found in note title");
      return;
    }

    const nextChild = this.suggestNextChild(address);

    // Validate the suggested address
    const validation = this.validateAddress(nextChild);
    if (validation.isDuplicate) {
      new Notice(
        `⚠️ Warning: ${nextChild} already exists in ${validation.existingFile?.path}`,
      );
    } else {
      new Notice(`Next child address: ${nextChild}`);
    }
  }

  /**
   * Command: Create next child note.
   */
  async createNextChild() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      new Notice("No active note");
      return;
    }

    const parentAddress = this.extractFromTitle(activeView.file.basename);
    if (!parentAddress) {
      new Notice("No folgezettel address found in note title");
      return;
    }

    const childAddress = this.suggestNextChild(parentAddress);

    // Validate the suggested address
    const validation = this.validateAddress(childAddress);

    if (validation.isDuplicate && validation.existingFile) {
      // Show confirmation modal for duplicate address
      new DuplicateAddressModal(
        this.app,
        childAddress,
        validation.existingFile,
        // On confirm: create the file anyway
        async () => {
          await this.createNoteWithAddress(
            childAddress,
            activeView.file!.parent,
          );
        },
        // On cancel: do nothing
        () => {
          new Notice("Note creation cancelled");
        },
      ).open();
    } else {
      // No duplicate, create directly
      await this.createNoteWithAddress(childAddress, activeView.file.parent);
    }
  }

  /**
   * Create a new note with the given folgezettel address.
   */
  async createNoteWithAddress(address: string, parentFolder: TFile["parent"]) {
    const fileName = `${address}.md`;
    const filePath = parentFolder
      ? `${parentFolder.path}/${fileName}`
      : fileName;

    try {
      const newFile = await this.app.vault.create(filePath, "");
      await this.app.workspace.getLeaf().openFile(newFile);
      new Notice(`Created note: ${address}`);
    } catch (error) {
      new Notice(`Failed to create note: ${error}`);
    }
  }

  // ========================================================================
  // Bidirectional Cross-Linking
  // ========================================================================

  /**
   * Handle file modification events for bidirectional linking.
   */
  async onFileModify(file: TAbstractFile) {
    if (!(file instanceof TFile)) return;
    if (file.extension !== "md") return;

    // Prevent recursive processing
    if (this.processingFile === file.path) return;

    const content = await this.app.vault.read(file);
    const currentLinks = this.extractLinks(content);
    const previousLinks = this.fileContentCache.get(file.path) || new Set();

    // Find new links
    const newLinks = new Set<string>();
    for (const link of currentLinks) {
      if (!previousLinks.has(link)) {
        newLinks.add(link);
      }
    }

    // Update cache
    this.fileContentCache.set(file.path, currentLinks);

    // Process new links
    if (newLinks.size > 0) {
      await this.processNewLinks(file, newLinks);
    }
  }

  /**
   * Process new links and create reciprocal links.
   */
  async processNewLinks(sourceFile: TFile, newLinks: Set<string>) {
    for (const linkTarget of newLinks) {
      const targetFile = this.findFileByBasename(linkTarget);
      if (!targetFile) continue;

      // Do not create self-links
      if (targetFile.path === sourceFile.path) continue;

      // Check if reciprocal link already exists
      const targetContent = await this.app.vault.read(targetFile);
      if (targetContent.includes(`[[${sourceFile.basename}]]`)) {
        continue;
      }

      // Create reciprocal link
      await this.insertCrossLink(targetFile, sourceFile);
    }
  }

  /**
   * Insert a cross-reference link in a file.
   */
  async insertCrossLink(file: TFile, linkedFile: TFile) {
    this.processingFile = file.path;

    try {
      const inserted = await this.insertLinkUnderHeading(
        file,
        linkedFile,
        this.settings.crossLinkHeading,
        "Cross-reference",
      );

      if (inserted && this.settings.showNotifications) {
        new Notice(
          `Reciprocal link added: ${linkedFile.basename} → ${file.basename}`,
        );
      }
    } finally {
      this.processingFile = null;
    }
  }
}

// ============================================================================
// Settings Tab
// ============================================================================

class FolgezettelSettingTab extends PluginSettingTab {
  plugin: BidirectionalFolgezettelPlugin;

  constructor(app: App, plugin: BidirectionalFolgezettelPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Bidirectional Folgezettel Settings" });

    // Auto-process toggle
    new Setting(containerEl)
      .setName("Auto-process new notes")
      .setDesc("Automatically add folgezettel links when new notes are created")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoProcess)
          .onChange(async (value) => {
            this.plugin.settings.autoProcess = value;
            await this.plugin.saveSettings();
          }),
      );

    // Show notifications toggle
    new Setting(containerEl)
      .setName("Show notifications")
      .setDesc("Display notifications when links are inserted")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotifications)
          .onChange(async (value) => {
            this.plugin.settings.showNotifications = value;
            await this.plugin.saveSettings();
          }),
      );

    // Auto bidirectional links toggle
    new Setting(containerEl)
      .setName("Auto bidirectional cross-links")
      .setDesc(
        "Automatically create reciprocal links when you link to another note",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoBidirectionalLinks)
          .onChange(async (value) => {
            this.plugin.settings.autoBidirectionalLinks = value;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("h3", { text: "Link Descriptions" });

    // Parent link description
    new Setting(containerEl)
      .setName("Parent link description")
      .setDesc("Text shown after parent backlinks")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.parentLinkDescription)
          .onChange(async (value) => {
            this.plugin.settings.parentLinkDescription = value;
            await this.plugin.saveSettings();
          }),
      );

    // Child link description
    new Setting(containerEl)
      .setName("Child link description")
      .setDesc("Text shown after child forward links")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.childLinkDescription)
          .onChange(async (value) => {
            this.plugin.settings.childLinkDescription = value;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("h3", { text: "Headings" });

    // Backlink heading
    new Setting(containerEl)
      .setName("Backlink heading")
      .setDesc("Heading for parent backlinks section")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.backlinkHeading)
          .onChange(async (value) => {
            this.plugin.settings.backlinkHeading = value;
            await this.plugin.saveSettings();
          }),
      );

    // Forward link heading
    new Setting(containerEl)
      .setName("Forward link heading")
      .setDesc("Heading for child forward links section")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.forwardLinkHeading)
          .onChange(async (value) => {
            this.plugin.settings.forwardLinkHeading = value;
            await this.plugin.saveSettings();
          }),
      );

    // Cross-link heading
    new Setting(containerEl)
      .setName("Cross-link heading")
      .setDesc("Heading for cross-reference links section")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.crossLinkHeading)
          .onChange(async (value) => {
            this.plugin.settings.crossLinkHeading = value;
            await this.plugin.saveSettings();
          }),
      );

    // Help section
    containerEl.createEl("h3", { text: "Folgezettel Address Format" });

    const helpDiv = containerEl.createDiv({ cls: "folgezettel-help" });
    helpDiv.createEl("p", {
      text: "Valid folgezettel addresses start with a number and can include dot-separated numbers and letter sequences:",
    });

    const table = helpDiv.createEl("table");
    const examples = [
      ["1", "Root note"],
      ["1.2", "Second-level note"],
      ["1.2a", "First child of 1.2"],
      ["1.2a3", "Third sub-branch of 1.2a"],
      ["1.2a3c5", "Deep nesting"],
    ];

    for (const [addr, desc] of examples) {
      const row = table.createEl("tr");
      row.createEl("td", { text: addr });
      row.createEl("td", { text: desc });
    }
  }
}
