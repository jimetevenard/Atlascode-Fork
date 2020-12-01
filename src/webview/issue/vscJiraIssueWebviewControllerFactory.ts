import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { Disposable, Uri } from 'vscode';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { JiraIssueInitMessage } from '../../lib/ipc/toUI/jiraIssue';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { JiraIssueActionApi } from '../../lib/webview/controller/issue/jiraIssueActionApi';
import { JiraIssueWebviewController } from '../../lib/webview/controller/issue/jiraIssueWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCJiraIssueWebviewControllerFactory implements VSCWebviewControllerFactory<JiraIssueInitMessage> {
    constructor(
        private api: JiraIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private analytics: AnalyticsApi
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.JIRAICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.JiraIssuePage;
    }

    public createController(postMessage: PostMessageFunc): [JiraIssueWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): JiraIssueWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: MinimalIssue<DetailedSiteInfo>
    ): JiraIssueWebviewController | [JiraIssueWebviewController, Disposable | undefined] {
        if (!factoryData) {
            throw new Error('Error creating Jira Issue webview');
        }
        const controller = new JiraIssueWebviewController(
            factoryData,
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            this.analytics
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, 'jiraIssueScreenV2');
    }
}
