import * as vscode from 'vscode';
import { SpecKitUIState } from '../types';

const STATE_KEY = 'speckit.uiState';

export class StateManager {
  private context: vscode.ExtensionContext;
  private state: SpecKitUIState;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.state = this.loadState();
  }

  private loadState(): SpecKitUIState {
    const stored = this.context.workspaceState.get<SpecKitUIState>(STATE_KEY);
    return stored ?? {
      expandedNodes: [],
      splitViewEnabled: true
    };
  }

  private async saveState(): Promise<void> {
    await this.context.workspaceState.update(STATE_KEY, this.state);
  }

  getExpandedNodes(): string[] {
    return this.state.expandedNodes;
  }

  async setExpandedNodes(nodeIds: string[]): Promise<void> {
    this.state.expandedNodes = nodeIds;
    await this.saveState();
  }

  async addExpandedNode(nodeId: string): Promise<void> {
    if (!this.state.expandedNodes.includes(nodeId)) {
      this.state.expandedNodes.push(nodeId);
      await this.saveState();
    }
  }

  async removeExpandedNode(nodeId: string): Promise<void> {
    const index = this.state.expandedNodes.indexOf(nodeId);
    if (index > -1) {
      this.state.expandedNodes.splice(index, 1);
      await this.saveState();
    }
  }

  getLastOpenedSpec(): string | undefined {
    return this.state.lastOpenedSpec;
  }

  async setLastOpenedSpec(path: string): Promise<void> {
    this.state.lastOpenedSpec = path;
    await this.saveState();
  }

  getLastSelectedItem(): string | undefined {
    return this.state.lastSelectedItem;
  }

  async setLastSelectedItem(itemId: string): Promise<void> {
    this.state.lastSelectedItem = itemId;
    await this.saveState();
  }

  getSplitViewEnabled(): boolean {
    return this.state.splitViewEnabled;
  }

  async setSplitViewEnabled(enabled: boolean): Promise<void> {
    this.state.splitViewEnabled = enabled;
    await this.saveState();
  }
}
