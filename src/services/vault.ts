import { App, TFile, requestUrl } from 'obsidian';

export class VaultService {
  app: App;

  constructor(app: App) {
    this.app = app;
  }

  async getRelevantContext(query: string): Promise<string> {
    const activeFile = this.app.workspace.getActiveFile();
    let context = '';

    if (activeFile) {
      const content = await this.app.vault.read(activeFile);
      context += `--- ACTIVE FILE: ${activeFile.path} ---\n${content}\n\n`;
    }

    // Advanced content-based search for relevant notes
    const files = this.app.vault.getMarkdownFiles();
    const queryLower = query.toLowerCase();

    const scores = await Promise.all(files.map(async file => {
      let score = 0;
      if (file.name.toLowerCase().includes(queryLower)) score += 10;
      if (file.path.toLowerCase().includes(queryLower)) score += 5;

      // Basic content relevance check (first 5000 chars for speed)
      const content = await this.app.vault.read(file);
      const contentSnippet = content.substring(0, 5000).toLowerCase();
      if (contentSnippet.includes(queryLower)) score += 20;

      return { file, score };
    }));

    const relevantFiles = scores
      .filter(item => item.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const item of relevantFiles) {
      if (item.file.path === activeFile?.path) continue;
      const content = await this.app.vault.read(item.file);
      context += `--- RELEVANT FILE: ${item.file.path} ---\n${content.substring(0, 2000)}...\n\n`;
    }

    return context || 'No immediate relevant context found. Mastermind may need to search the vault.';
  }

  async listMarkdownFiles(): Promise<string[]> {
    return this.app.vault.getMarkdownFiles().map(f => f.path);
  }

  async getFileContent(path: string): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }
    throw new Error(`File not found or not a markdown file: ${path}`);
  }

  async searchVault(query: string): Promise<string[]> {
    const queryLower = query.toLowerCase();
    const files = this.app.vault.getMarkdownFiles();
    const results: string[] = [];

    for (const file of files) {
      const content = await this.app.vault.read(file);
      if (content.toLowerCase().includes(queryLower) || file.path.toLowerCase().includes(queryLower)) {
        results.push(file.path);
      }
      if (results.length >= 20) break; // Limit results
    }

    return results;
  }

  async createNote(path: string, content: string): Promise<void> {
    const normalizedPath = path.endsWith('.md') ? path : `${path}.md`;
    await this.app.vault.create(normalizedPath, content);
  }
}
