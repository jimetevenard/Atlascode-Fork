import * as vscode from 'vscode';
import { fetchPullRequestsCommand } from './commands/bitbucket/fetchPullRequests';
import { authenticateBitbucket } from './commands/authenticate';
import { currentUserBitbucket } from './commands//bitbucket/currentUser';
import { authenticateJira } from './commands/authenticate';
import { BitbucketContext } from './bitbucket/context';

enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    CurrentUserBitbucket = 'atlascode.bb.me',
    AuthenticateJira = 'atlascode.jira.authenticate'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    vscodeContext.subscriptions.push(
	    vscode.commands.registerCommand(Commands.BitbucketFetchPullRequests, fetchPullRequestsCommand, bbContext),
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.CurrentUserBitbucket, currentUserBitbucket),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira)
    );
}
