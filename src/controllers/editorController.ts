import * as vscode from 'vscode';

export class EditorController {
  async openSpecAtLine(
    filePath: string,
    line?: number,
    column: vscode.ViewColumn = vscode.ViewColumn.One
  ): Promise<vscode.TextEditor> {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: column,
      preserveFocus: false
    });

    if (line !== undefined && line > 0) {
      this.scrollToLine(editor, line);
    }

    return editor;
  }

  async openSplitView(
    specPath: string,
    testPath: string,
    specLine?: number,
    testLine?: number
  ): Promise<void> {
    const specEditor = await this.openSpecAtLine(specPath, specLine, vscode.ViewColumn.One);

    const testUri = vscode.Uri.file(testPath);
    const testDoc = await vscode.workspace.openTextDocument(testUri);
    const testEditor = await vscode.window.showTextDocument(testDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: true
    });

    if (testLine !== undefined && testLine > 0) {
      this.scrollToLine(testEditor, testLine);
    }
  }

  scrollToLine(editor: vscode.TextEditor, line: number): void {
    const position = new vscode.Position(line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  }

  async openFileAtLine(filePath: string, line?: number): Promise<vscode.TextEditor> {
    return this.openSpecAtLine(filePath, line);
  }

  async closeSecondaryEditor(): Promise<void> {
    // Close any editor in ViewColumn.Two (the secondary/right panel)
    const editorsInColumnTwo = vscode.window.visibleTextEditors.filter(
      editor => editor.viewColumn === vscode.ViewColumn.Two
    );
    
    for (const editor of editorsInColumnTwo) {
      await vscode.window.showTextDocument(editor.document, {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: false
      });
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }
  }
}
