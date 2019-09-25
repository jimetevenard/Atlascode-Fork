import { Disposable, EventEmitter, Event, Uri } from 'vscode';
import { Repository, API as GitApi, Remote } from "../typings/git";
import { Container } from '../container';
import { ProductBitbucket, DetailedSiteInfo } from '../atlclients/authInfo';
import { BitbucketIssuesExplorer } from '../views/bbissues/bbIssuesExplorer';
import { PullRequestsExplorer } from '../views/pullrequest/pullRequestsExplorer';
import { CacheMap, Interval } from '../util/cachemap';
import { PullRequest, User } from './model';
import { PullRequestCommentController } from '../views/pullrequest/prCommentController';
import { getBitbucketRemotes, siteDetailsForRemote, clientForRemote, firstBitbucketRemote, getBitbucketCloudRemotes } from './bbUtils';
import { bbAPIConnectivityError } from '../constants';

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext extends Disposable {
    private _onDidChangeBitbucketContext: EventEmitter<void> = new EventEmitter<void>();
    readonly onDidChangeBitbucketContext: Event<void> = this._onDidChangeBitbucketContext.event;

    private _gitApi: GitApi;
    private _repoMap: Map<string, Repository> = new Map();
    private _pullRequestsExplorer: PullRequestsExplorer;
    private _bitbucketIssuesExplorer: BitbucketIssuesExplorer;
    private _disposable: Disposable;
    private _currentUsers: CacheMap;
    private _pullRequestCache = new CacheMap();
    public readonly prCommentController: PullRequestCommentController;

    constructor(gitApi: GitApi) {
        super(() => this.dispose());
        this._gitApi = gitApi;
        this._pullRequestsExplorer = new PullRequestsExplorer(this);
        this._bitbucketIssuesExplorer = new BitbucketIssuesExplorer(this);
        this._currentUsers = new CacheMap();

        Container.context.subscriptions.push(
            Container.siteManager.onDidSitesAvailableChange((e) => {
                if (e.product.key === ProductBitbucket.key) {
                    this.updateUsers(e.sites);
                }
            })
        );

        this.prCommentController = new PullRequestCommentController(Container.context);
        this._disposable = Disposable.from(
            this._gitApi.onDidOpenRepository(this.refreshRepos, this),
            this._gitApi.onDidCloseRepository(this.refreshRepos, this),
            this._pullRequestsExplorer,
            this._bitbucketIssuesExplorer,
            this.prCommentController
        );

        this.refreshRepos();
    }

    public async currentUser(remote: Remote): Promise<User> {
        const site = siteDetailsForRemote(remote);

        if (site) {
            let foundUser = this._currentUsers.getItem<User>(site.hostname);
            if (!foundUser) {
                const bbClient = await clientForRemote(remote);
                foundUser = await bbClient.pullrequests.getCurrentUser(site)!;
                this._currentUsers.setItem(site.hostname, foundUser, 10 * Interval.MINUTE);
            }

            if (foundUser) {
                return foundUser;
            }
        }

        return Promise.reject(bbAPIConnectivityError);
    }

    public async recentPullrequestsForAllRepos(): Promise<PullRequest[]> {
        if (!this._pullRequestCache.getItem<PullRequest[]>('pullrequests')) {
            const prs = await Promise.all(this.getBitbucketRepositories().map(async repo => {
                const remote = firstBitbucketRemote(repo);
                const bbClient = await clientForRemote(remote);
                return (await bbClient.pullrequests.getRecentAllStatus(repo, remote)).data;
            }));
            const flatPrs = prs.reduce((prev, curr) => prev.concat(curr), []);
            this._pullRequestCache.setItem('pullrequests', flatPrs, 5 * Interval.MINUTE);
        }

        return this._pullRequestCache.getItem<PullRequest[]>('pullrequests')!;
    }

    private async refreshRepos() {
        this._pullRequestCache.clear();
        this._repoMap.clear();
        await Promise.all(this.getAllRepositories().map(async repo => {
            // sometimes the remote info is not populated during initialization
            // this is a workaround to wait for that information to be available
            if (repo.state.remotes.length === 0) {
                await repo.status();
            }
            this._repoMap.set(repo.rootUri.toString(), repo);
        }));
        this._onDidChangeBitbucketContext.fire();
    }

    private updateUsers(sites: DetailedSiteInfo[]) {
        const removed: string[] = [];
        this._currentUsers.getItems<User>().forEach(entry => {
            if (!sites.some(s => s.hostname === entry.key)) {
                removed.push(entry.key);
            }
        });
        removed.forEach(hostname => this._currentUsers.deleteItem(hostname));
        if (removed.length > 0) {
            this._onDidChangeBitbucketContext.fire();
        }
    }

    public getAllRepositories(): Repository[] {
        return this._gitApi.repositories;
    }

    public isBitbucketRepo(repo: Repository): boolean {
        return getBitbucketRemotes(repo).length > 0;
    }

    public isBitbucketCloudRepo(repo: Repository): boolean {
        return getBitbucketCloudRemotes(repo).length > 0;
    }

    public getBitbucketRepositories(): Repository[] {
        return this.getAllRepositories().filter(this.isBitbucketRepo);
    }

    public getBitbucketCloudRepositories(): Repository[] {
        return this.getAllRepositories().filter(this.isBitbucketCloudRepo);
    }

    public getRepository(repoUri: Uri): Repository | undefined {
        return this._repoMap.get(repoUri.toString());
    }

    dispose() {
        this.disposeForNow();
        this._disposable.dispose();
    }

    disposeForNow() {
        if (this._pullRequestsExplorer) {
            this._pullRequestsExplorer.dispose();
        }
        if (this._bitbucketIssuesExplorer) {
            this._bitbucketIssuesExplorer.dispose();
        }

        this._onDidChangeBitbucketContext.dispose();
    }
}
