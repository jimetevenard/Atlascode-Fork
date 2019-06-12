import BitbucketServer from '@atlassian/bitbucket-server';
import { PullRequest, PaginatedCommits, User, PaginatedComments, BuildStatus } from '../bitbucket/model';

const username = '';
const password = '';
const baseUrl = '';
const projectKey = '';
const repositorySlug = '';

const bb = new BitbucketServer({
    baseUrl: baseUrl
});
bb.authenticate({
    username: username,
    password: password,
    type: 'apppassword'
});

export namespace ServerPullRequestApi {
    export async function get(pr: PullRequest): Promise<PullRequest> {

        const { data } = await bb.pullRequests.get({
            projectKey: projectKey,
            repositorySlug: repositorySlug,
            pullRequestId: pr.data.id
        });

        return {
            remote: pr.remote,
            repository: pr.repository,
            data: {
                id: data.id,
                url: data.links.self[0].href,
                author: {
                    accountId: data.author.user.id,
                    displayName: data.author.user.displayName,
                    url: data.author.user.links.self[0].href,
                    avatarUrl: patchAvatarUrl(baseUrl, data.author.user.avatarUrl)
                },
                reviewers: [],
                participants: data.reviewers.map((reviewer: any) => (
                    {
                        accountId: reviewer.user.id,
                        displayName: reviewer.user.displayName,
                        url: reviewer.user.links.self[0].href,
                        avatarUrl: patchAvatarUrl(baseUrl, reviewer.user.avatarUrl),
                        role: reviewer.role,
                        approved: reviewer.approved
                    }
                )),
                source: {
                    repo: {
                        name: data.fromRef.repository.slug,
                        displayName: data.fromRef.repository.name,
                        fullName: `${data.fromRef.repository.project.key}/${data.fromRef.repository.slug}`,
                        url: data.fromRef.repository.links.self[0].href,
                        avatarUrl: patchAvatarUrl(baseUrl, data.fromRef.repository.avatarUrl),
                        mainbranch: undefined,
                        issueTrackerEnabled: false
                    },
                    branchName: data.fromRef.displayId,
                    commitHash: data.fromRef.latestCommit
                },
                destination: {
                    repo: {
                        name: data.toRef.repository.slug,
                        displayName: data.toRef.repository.name,
                        fullName: `${data.toRef.repository.project.key}/${data.fromRef.repository.slug}`,
                        url: data.toRef.repository.links.self[0].href,
                        avatarUrl: patchAvatarUrl(baseUrl, data.toRef.repository.avatarUrl),
                        mainbranch: undefined,
                        issueTrackerEnabled: false
                    },
                    branchName: data.toRef.displayId,
                    commitHash: data.toRef.latestCommit
                },
                title: data.title,
                htmlSummary: data.description,
                rawSummary: data.description,
                ts: data.createdDate,
                updatedTs: data.updatedDate,
                state: data.state,
                closeSourceBranch: false,
                taskCount: 0,
                buildStatuses: []
            }
        };
    }

    export async function getCurrentUser(): Promise<User> {
        const { data } = await bb.api.getUser({
            userSlug: username
        });

        return {
            accountId: data.id!.toString(),
            displayName: data.displayName!,
            url: data.links!.self![0].href!,
            avatarUrl: patchAvatarUrl(baseUrl, data.links!.avatarUrl!)
        };
    }

    export async function getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        return {
            data: []
        };
    }

    export async function getComments(pr: PullRequest): Promise<PaginatedComments> {
        return {
            data: []
        };
    }

    export async function getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        return [];
    }

    function patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }
}
