// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function showError(message: string): void {
  void vscode.window.showErrorMessage(`Yarn update-deps: ${message}`);
}

function runCommand(workspace: vscode.WorkspaceFolder): void {
  const result = execSync('yarn --version', { cwd: workspace.uri.path });
  const version = result.toString();

  const cliCommand = version.startsWith('1')
    ? 'yarn upgrade-interactive --latest'
    : 'yarn upgrade-interactive';

  const task: vscode.Task = new vscode.Task(
    { type: 'yarn' },
    workspace,
    'update-deps',
    'yarn',
    new vscode.ShellExecution(
      // https://misc.flogisoft.com/bash/tip_colors_and_formatting
      // eslint-disable-next-line no-template-curly-in-string
      `echo -e '\\e[1;97;100m Run update-deps for \\e[102m \${workspaceFolderBasename} \\e[0m\n' && ${cliCommand}`
    )
  );
  task.isBackground = false;
  task.presentationOptions.echo = false;
  task.presentationOptions.focus = true;
  task.runOptions.reevaluateOnRerun = true;

  vscode.tasks.executeTask(task).then(undefined, (err: Error) => {
    console.error(err);
    showError(err.toString());
  });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('extension.update-deps', async () => {
    // The code you place here will be executed every time your command is executed

    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

    // Must have at least one workspace folder
    if (workspaceFolders.length === 0) {
      showError('You must have a workspace opened.');
      return;
    }

    const filteredFolders = await new Promise<vscode.WorkspaceFolder[]>((resolve) =>
      resolve(
        workspaceFolders.filter((folder) =>
          fs.existsSync(path.join(folder.uri.fsPath, 'package.json'))
        )
      )
    );

    // Must have at least one workspace folder with package.json
    if (workspaceFolders.length === 0) {
      showError('You must have a workspace opened with existing package.json.');
      return;
    }

    // If in a multifolder workspace, prompt user to select which one to choose.
    if (filteredFolders.length > 1) {
      const folders = new Promise<{ label: string; folder: vscode.WorkspaceFolder }[]>((resolve) =>
        resolve(filteredFolders.map((folder) => ({ label: folder.name, folder })))
      );
      vscode.window.showQuickPick(folders, { placeHolder: 'Select workspace folder' }).then(
        (selected) => selected && runCommand(selected.folder),
        (err: Error) => showError(err.toString())
      );
    } else {
      // Otherwise, use the first one
      const folder = filteredFolders[0];
      runCommand(folder);
    }
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
