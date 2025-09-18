// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as vscode from 'vscode';

interface CliCommand {
  readonly cmd: string;
  readonly name: string;
}

function showError(error: unknown): void {
  console.error(error);
  void vscode.window.showErrorMessage(`Yarn: ${String(error)}`);
}

function runCommand(cliCommand: CliCommand, workspace: vscode.WorkspaceFolder): void {
  const task: vscode.Task = new vscode.Task(
    { type: 'yarn' },
    workspace,
    cliCommand.name,
    'yarn',
    new vscode.ShellExecution(
      // https://misc.flogisoft.com/bash/tip_colors_and_formatting
      `echo -e '\\e[1;97;100m Run ${cliCommand.name} for \\e[102m \${workspaceFolderBasename} \\e[0m\n' && ${cliCommand.cmd}`
    )
  );
  task.isBackground = false;
  task.presentationOptions.echo = false;
  task.presentationOptions.focus = true;
  task.runOptions.reevaluateOnRerun = true;

  vscode.tasks.executeTask(task).then(undefined, showError);
}

async function selectFolderAndRun(
  getCliCommand: (folder: vscode.WorkspaceFolder) => CliCommand
): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

    // Must have at least one workspace folder
    if (workspaceFolders.length === 0) {
      showError('You must have a workspace opened.');
      return;
    }

    const filteredFolders = await new Promise<vscode.WorkspaceFolder[]>((resolve) => {
      resolve(
        workspaceFolders.filter((folder) =>
          fs.existsSync(path.join(folder.uri.fsPath, 'package.json'))
        )
      );
    });

    // Must have at least one workspace folder with package.json
    if (workspaceFolders.length === 0) {
      showError('You must have a workspace opened with existing package.json.');
      return;
    }

    // If in a multifolder workspace, prompt user to select which one to choose.
    if (filteredFolders.length > 1) {
      const folders = new Promise<{ label: string; folder: vscode.WorkspaceFolder }[]>(
        (resolve) => {
          resolve(filteredFolders.map((folder) => ({ label: folder.name, folder })));
        }
      );
      vscode.window
        .showQuickPick(folders, { placeHolder: 'Select workspace folder' })
        .then(
          (selected) => selected && runCommand(getCliCommand(selected.folder), selected.folder),
          showError
        )
        .then(undefined, showError);
    } else {
      // Otherwise, use the first one
      const folder = filteredFolders[0];
      runCommand(getCliCommand(folder), folder);
    }
  } catch (ex) {
    showError(ex);
  }
}

function getYarnVersion(folder: vscode.WorkspaceFolder): string {
  const result = execSync('yarn --version', { cwd: folder.uri.path });
  return result.toString();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const updateDepsCommand = vscode.commands.registerCommand(
    'yarn-update-deps.update-deps',
    async () => {
      // The code you place here will be executed every time your command is executed
      await selectFolderAndRun((folder) => {
        const version = getYarnVersion(folder);
        const cmd = version.startsWith('1')
          ? 'yarn upgrade-interactive --latest'
          : 'yarn upgrade-interactive';
        return { cmd, name: 'Update Deps' };
      });
    }
  );

  const updateYarnCommand = vscode.commands.registerCommand(
    'yarn-update-deps.update-yarn',
    async () => {
      // The code you place here will be executed every time your command is executed
      await selectFolderAndRun((folder) => {
        const version = getYarnVersion(folder);
        if (version.startsWith('1'))
          throw new Error('The command only supports Yarn version >= 2.');
        const cmd = 'yarn set version stable';
        return { cmd, name: 'Update Yarn' };
      });
    }
  );

  const dedupeCommand = vscode.commands.registerCommand('yarn-update-deps.dedupe', async () => {
    // The code you place here will be executed every time your command is executed
    await selectFolderAndRun((folder) => {
      const version = getYarnVersion(folder);
      if (version.startsWith('1')) throw new Error('The command only supports Yarn version >= 2.');
      const cmd = 'yarn dedupe';
      return { cmd, name: 'Dedupe' };
    });
  });

  const migrateVersionCommand = vscode.commands.registerCommand(
    'yarn-update-deps.migrate-version',
    async () => {
      // The code you place here will be executed every time your command is executed
      await selectFolderAndRun((folder) => {
        const version = getYarnVersion(folder);
        if (!version.startsWith('1'))
          throw new Error(`Yarn version (${version}) is already migrated.`);
        const cmd = 'yarn set version berry';
        return { cmd, name: 'Migrate Yarn Version to Berry' };
      });
    }
  );

  context.subscriptions.push(updateDepsCommand);
  context.subscriptions.push(updateYarnCommand);
  context.subscriptions.push(dedupeCommand);
  context.subscriptions.push(migrateVersionCommand);
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
