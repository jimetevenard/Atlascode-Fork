import { Disposable, UriHandler, window, Uri } from 'vscode';
import { showIssueForKey } from './commands/jira/showIssue';

export class AtlascodeUriHandler extends Disposable implements UriHandler {
    private disposables: Disposable;

    constructor() {
        super(() => this.dispose());
        this.disposables = window.registerUriHandler(this);
    }

    handleUri(uri: Uri): void {
        if (uri.path.endsWith('openJiraIssue')) {
            const params = new URLSearchParams(uri.query);
            if (params.has('key')) {
                const key = params.get('key');
                if (key && key.trim() !== '') {
                    showIssueForKey(key);
                }
            }
            return;
        }
        if (uri.path.endsWith('openPR')) {
            const params = new URLSearchParams(uri.query);
            if (params.has('key')) {
                const key = params.get('key');
                if (key && key.trim() !== '') {
                    // TODO [VSCODE-687]: refactor PR webview manager to accept a PR key
                }
            }
            return;
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }
}