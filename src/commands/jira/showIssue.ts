import {
    createEmptyMinimalIssue,
    createIssueNotFoundIssue,
    isIssueKeyAndSite,
    isMinimalIssue,
    MinimalIssue,
    MinimalIssueOrKeyAndSite,
} from '@atlassianlabs/jira-pi-common-models';
import { v4 } from 'uuid';
import * as vscode from 'vscode';
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { fetchMinimalIssue, getCachedOrFetchMinimalIssue } from '../../jira/fetchIssue';
import { issueForKey } from '../../jira/issueForKey';

export async function showIssue(issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) {
    let issueKey: string = '';
    let site: DetailedSiteInfo = emptySiteInfo;
    let issue: MinimalIssue<DetailedSiteInfo> = createIssueNotFoundIssue(createEmptyMinimalIssue(site));

    if (isMinimalIssue(issueOrKeyAndSite)) {
        issue = issueOrKeyAndSite;
    } else {
        if (isIssueKeyAndSite(issueOrKeyAndSite)) {
            issueKey = issueOrKeyAndSite.key;
            site = issueOrKeyAndSite.siteDetails;
        } else {
            if (Container.isDebugging) {
                Container.jiraIssueWebviewFactory.createOrShow(
                    v4(), //Issue view needs unique identifier, but since issue doesn't exist use UUID
                    createIssueNotFoundIssue(createEmptyMinimalIssue(site))
                );
            } else {
                Container.jiraIssueViewManager.createOrShow(createIssueNotFoundIssue(createEmptyMinimalIssue(site)));
            }
            return;
        }

        // Note: we try to get the cached issue first because it will contain epic child info we need
        const cachedOrFetched = await getCachedOrFetchMinimalIssue(issueKey, site);
        if (cachedOrFetched && isMinimalIssue(cachedOrFetched)) {
            issue = cachedOrFetched;
        } else {
            issue = await fetchMinimalIssue(issueKey, site);
        }
    }

    if (Container.isDebugging) {
        Container.jiraIssueWebviewFactory.createOrShow(issue.key, issue);
    } else {
        Container.jiraIssueViewManager.createOrShow(issue);
    }
    return;
}
export async function showIssueForSiteIdAndKey(siteId: string, issueKey: string) {
    const site: DetailedSiteInfo | undefined = Container.siteManager.getSiteForId(ProductJira, siteId);
    let issue: MinimalIssue<DetailedSiteInfo> = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));

    if (site) {
        const cachedOrFetched = await getCachedOrFetchMinimalIssue(issueKey, site);
        if (cachedOrFetched && isMinimalIssue(cachedOrFetched)) {
            issue = cachedOrFetched;
        } else {
            issue = await fetchMinimalIssue(issueKey, site);
        }
    }

    if (Container.isDebugging) {
        Container.jiraIssueWebviewFactory.createOrShow(issue.key, issue);
    } else {
        Container.jiraIssueViewManager.createOrShow(issue);
    }
    return;
}

export async function showIssueForKey(issueKey?: string) {
    let issue: MinimalIssue<DetailedSiteInfo> = createIssueNotFoundIssue(createEmptyMinimalIssue(emptySiteInfo));

    if (issueKey === undefined) {
        const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
        if (input) {
            issueKey = input.trim();
        }
    } else {
        issueKey = issueKey;
    }

    if (issueKey) {
        try {
            issue = await issueForKey(issueKey);
        } catch (e) {
            //not found
        }
    }

    if (Container.isDebugging) {
        Container.jiraIssueWebviewFactory.createOrShow(issue.key, issue);
    } else {
        Container.jiraIssueViewManager.createOrShow(issue);
    }
}
