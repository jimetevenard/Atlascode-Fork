import { Repository } from "../typings/git";
import { RepositoriesApi } from "./repositories";
import { GitUrlParse, bitbucketHosts, PullRequestApi } from "./pullRequests";
import { PaginatedBitbucketIssues } from "./model";

const defaultPageLength = 10;
export const maxItemsSupported = {
    comments: 100,
    changes: 100
};
const dummyRemote = { name: '', isReadOnly: true };

export namespace BitbucketIssuesApi {

    export async function getList(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function getLatest(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: 1,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function refetch(issue: Bitbucket.Schema.Issue): Promise<Bitbucket.Schema.Issue> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString()
        });

        return data;
    }

    export async function getComments(issue: Bitbucket.Schema.Issue): Promise<Bitbucket.Schema.Comment[]> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssueComments({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.comments,
            issue_id: issue.id!.toString()
        });

        return data.values || [];
    }

    export async function getChanges(issue: Bitbucket.Schema.Issue): Promise<Bitbucket.Schema.IssueChange[]> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssueChanges({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.changes,
            issue_id: issue.id!.toString()
        });

        return data.values || [];
    }

    export async function postChange(issue: Bitbucket.Schema.Issue, newStatus: string, content?: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        await bb.repositories.createIssueChange({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue_change',
                changes: {
                    state: {
                        new: newStatus
                    }
                },
                content: {
                    raw: content
                }
            }
        });
    }

    export async function postComment(issue: Bitbucket.Schema.Issue, content: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        await bb.repositories.createIssueComment({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue_comment',
                content: {
                    raw: content
                }
            }
        });
    }

    export async function nextPage({ repository, remote, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remote));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        return { repository: repository, remote: remote, data: data.values || [], next: data.next };
    }
}