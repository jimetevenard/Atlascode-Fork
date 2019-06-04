import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Uri, commands } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { RefType } from '../typings/git';
import { CreatePRData, RepoData, CommitsResult, FetchIssueResult } from '../ipc/prMessaging';
import { isCreatePullRequest, CreatePullRequest, isFetchDetails, FetchDetails, isFetchIssue, FetchIssue } from '../ipc/prActions';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Commands } from '../commands';
import { PullRequest } from '../bitbucket/model';
import { prCreatedEvent } from '../analytics';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { Issue, isIssue } from '../jira/jiraModel';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { AuthProvider } from '../atlclients/authInfo';
import { parseBitbucketIssueKeys } from '../bitbucket/bbIssueKeyParser';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { issuesForJQL } from '../jira/issuesForJql';

type Emit = CreatePRData | CommitsResult | FetchIssueResult | HostErrorMessage;
export class PullRequestCreatorWebview extends AbstractReactWebview<Emit, Action> {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create pull request";
    }
    public get id(): string {
        return "createPullRequestScreen";
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
    }

    async updateFields() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const state: RepoData[] = [];
            const repos = Container.bitbucketContext.getBitbucketRepositores();
            const currentUser = await Container.bitbucketContext.currentUser();
            for (let i = 0; i < repos.length; i++) {
                const r = repos[i];
                const bbRemotes = PullRequestApi.getBitbucketRemotes(r);
                if (Array.isArray(bbRemotes) && bbRemotes.length === 0) {
                    continue;
                }

                const [, repo, developmentBranch, defaultReviewers] = await Promise.all([
                    r.fetch(),
                    RepositoriesApi.get(bbRemotes[0]),
                    RepositoriesApi.getDevelopmentBranch(bbRemotes[0]),
                    PullRequestApi.getDefaultReviewers(bbRemotes[0])
                ]);
                await state.push({
                    uri: r.rootUri.toString(),
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    name: repo.displayName,
                    owner: repo.name,
                    remotes: r.state.remotes,
                    defaultReviewers: defaultReviewers.filter(reviewer => reviewer.accountId !== currentUser.accountId),
                    localBranches: await Promise.all(r.state.refs.filter(ref => ref.type === RefType.Head && ref.name).map(ref => r.getBranch(ref.name!))),
                    remoteBranches: await Promise.all(
                        r.state.refs
                            .filter(ref => ref.type === RefType.RemoteHead && ref.name && r.state.remotes.find(rem => ref.name!.startsWith(rem.name)))
                            .map(ref => ({ ...ref, remote: r.state.remotes.find(rem => ref.name!.startsWith(rem.name))!.name }))
                    ),
                    developmentBranch: developmentBranch,
                    hasLocalChanges: r.state.workingTreeChanges.length + r.state.indexChanges.length + r.state.mergeChanges.length > 0
                });
            }

            this.postMessage({ type: 'createPullRequestData', repositories: state });
        } catch (e) {
            Logger.error(new Error(`error fetching PR form: ${e}`));
            this.postMessage({ type: 'error', reason: e });
        } finally {
            this.isRefeshing = false;
        }

    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        await this.invalidate();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refreshPR': {
                    handled = true;
                    this.invalidate();
                    break;
                }
                case 'fetchDetails': {
                    if (isFetchDetails(e)) {
                        handled = true;
                        try {
                            await this.fetchDetails(e);
                        } catch (e) {
                            Logger.error(new Error(`error fetching details: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'fetchIssue': {
                    if (isFetchIssue(e)) {
                        handled = true;
                        try {
                            await this.fetchIssueForBranch(e);
                        } catch (e) {
                            Logger.error(new Error(`error fetching issue: ${e}`));
                            // ignore error. do not send it to webview.
                        }
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        commands.executeCommand(Commands.ShowIssue, e.issueOrKey);
                        break;
                    }
                }
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        commands.executeCommand(Commands.ShowBitbucketIssue, e.issue);
                    }
                    break;
                }
                case 'createPullRequest': {
                    if (isCreatePullRequest(e)) {
                        handled = true;
                        try {
                            await this.createPullRequest(e);
                        } catch (e) {
                            Logger.error(new Error(`error creating pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async fetchDetails(fetchDetailsAction: FetchDetails) {
        const { remote, sourceBranch, destinationBranch } = fetchDetailsAction;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        const result = await RepositoriesApi.getCommitsForRefs(remote, sourceBranchName, destinationBranchName);
        this.postMessage({
            type: 'commitsResult',
            commits: result
        });
    }

    async fetchIssueForBranch(e: FetchIssue) {
        let issue: Issue | Bitbucket.Schema.Issue | undefined = undefined;
        if (await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            const jiraIssueKeys = await parseJiraIssueKeys(e.sourceBranch.name!);
            const jiraIssues = jiraIssueKeys.length > 0 ? await issuesForJQL(`issuekey in (${jiraIssueKeys.join(',')})`) : [];
            if (jiraIssues.length > 0) {
                issue = jiraIssues[0];
            }
        }

        if (!issue) {
            const bbIssueKeys = await parseBitbucketIssueKeys(e.sourceBranch.name!);
            if (bbIssueKeys.length > 0) {
                const bbIssues = await BitbucketIssuesApi.getIssuesForKeys(Container.bitbucketContext.getRepository(Uri.parse(e.repoUri))!, [bbIssueKeys[0]]);
                if (bbIssues.length > 0) {
                    issue = bbIssues[0];
                }
            }
        }

        this.postMessage({
            type: 'fetchIssueResult',
            issue: issue
        });
    }

    private async updateIssue(issue?: Issue | Bitbucket.Schema.Issue) {
        if (!issue) {
            return;
        }
        if (isIssue(issue)) {
            const transition = issue.transitions.find(t => t.to.id === issue.status.id);
            await transitionIssue(issue, transition);
        } else {
            await BitbucketIssuesApi.postChange(issue, issue.state!);
        }
    }

    private async createPullRequest(createPullRequestAction: CreatePullRequest) {
        const { repoUri, remote, reviewers, title, summary, sourceBranch, destinationBranch, pushLocalChanges, closeSourceBranch, issue } = createPullRequestAction;
        const repo = Container.bitbucketContext.getRepository(Uri.parse(repoUri))!;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        if (pushLocalChanges) {
            Logger.info(`pushing local changes for branch: ${sourceBranchName} to remote: ${remote.name} `);
            await repo.push(remote.name, sourceBranchName);
        }

        let pr: Bitbucket.Schema.Pullrequest = {
            type: 'pullrequest',
            title: title,
            summary: {
                raw: summary
            },
            source: {
                branch: {
                    name: sourceBranchName
                }
            },
            destination: {
                branch: {
                    name: destinationBranchName
                }
            },
            reviewers: reviewers.map(reviewer => ({
                type: 'user',
                account_id: reviewer.accountId
            })),
            close_source_branch: closeSourceBranch
        };

        await PullRequestApi.create({ repository: repo, remote: remote, data: pr })
            .then(async (pr: PullRequest) => {
                commands.executeCommand(Commands.BitbucketShowPullRequestDetails, pr);
                commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                prCreatedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
            });

        await this.updateIssue(issue);
        this.hide();
    }
}
