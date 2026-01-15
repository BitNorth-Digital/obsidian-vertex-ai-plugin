import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import MastermindPlugin from '../main';
import { VertexService } from '../services/vertex';
import { VaultService } from '../services/vault';

export const VIEW_TYPE_MASTERMIND = 'mastermind-chat-view';

export class MastermindChatView extends ItemView {
  plugin: MastermindPlugin;
  vertexService: VertexService;
  vaultService: VaultService;
  messageContainer!: HTMLElement;
  inputEl!: HTMLTextAreaElement;

  constructor(leaf: WorkspaceLeaf, plugin: MastermindPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.vertexService = new VertexService(plugin.settings);
    this.vaultService = new VaultService(this.app);
  }

  getViewType() {
    return VIEW_TYPE_MASTERMIND;
  }

  getDisplayText() {
    return 'Mastermind AI';
  }

  getIcon() {
    return 'brain-circuit';
  }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('chat-view');

    this.messageContainer = container.createDiv('chat-messages');

    const inputContainer = container.createDiv('chat-input-container');
    this.inputEl = inputContainer.createEl('textarea', {
      cls: 'chat-input',
      attr: {
        placeholder: 'Ask Mastermind...',
        rows: '1'
      }
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    const sendButton = inputContainer.createEl('button', {
      cls: 'chat-send-button mod-cta',
      text: 'Send'
    });
    sendButton.addEventListener('click', () => this.handleSendMessage());

    this.appendMessage('ai', 'Greetings. I am Mastermind. How can I assist you with your knowledge vault today?');
  }

  async handleSendMessage() {
    const message = this.inputEl.value.trim();
    if (!message) return;

    this.inputEl.value = '';
    this.appendMessage('user', message);

    const loadingMsg = this.appendMessage('ai', 'Thinking...');

    try {
      // Updated settings check
      this.vertexService.updateSettings(this.plugin.settings);

      // Gather context
      const context = await this.vaultService.getRelevantContext(message);
      const response = await this.vertexService.chat(message, context, this.vaultService);

      loadingMsg.remove();
      this.appendMessage('ai', response);
    } catch (error) {
      console.error('Mastermind Error:', error);
      loadingMsg.innerText = 'Error: ' + (error instanceof Error ? error.message : String(error));
      new Notice('Mastermind Chat failed. Check console for details.');
    }
  }

  appendMessage(sender: 'user' | 'ai', text: string): HTMLElement {
    const msgEl = this.messageContainer.createDiv(`chat-message message-${sender}`);
    msgEl.innerText = text;
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    return msgEl;
  }

  async onClose() {
    // Cleanup
  }
}
