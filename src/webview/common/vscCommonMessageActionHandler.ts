import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { env, Uri } from 'vscode';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { submitFeedback } from '../../feedback/feedbackSubmitter';
import { submitJSDPMF } from '../../feedback/pmfJSDSubmitter';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { CommonAction, CommonActionType } from '../../lib/ipc/fromUI/common';
import { KnownLinkID, numForPMFLevel } from '../../lib/ipc/models/common';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';

const knownLinkIdMap: Map<string, string> = new Map([
    [KnownLinkID.AtlascodeRepo, 'https://bitbucket.org/atlassianlabs/atlascode'],
    [KnownLinkID.AtlascodeIssues, 'https://bitbucket.org/atlassianlabs/atlascode/issues'],
    [KnownLinkID.AtlascodeDocs, 'https://confluence.atlassian.com/display/BITBUCKET/Atlassian+for+VS+Code'],
]);

export class VSCCommonMessageHandler implements CommonActionMessageHandler {
    private _analytics: AnalyticsApi;
    private _cancelMan: CancellationManager;

    constructor(analytics: AnalyticsApi, cancelMan: CancellationManager) {
        this._analytics = analytics;
        this._cancelMan = cancelMan;
    }
    public async onMessageReceived(msg: CommonAction): Promise<void> {
        switch (msg.type) {
            case CommonActionType.SubmitPMF: {
                submitJSDPMF(msg.pmfData);
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfSubmitted(numForPMFLevel(msg.pmfData.level));
                break;
            }
            case CommonActionType.DismissPMFLater: {
                Container.pmfStats.snoozeSurvey();
                this._analytics.firePmfSnoozed();
                break;
            }
            case CommonActionType.DismissPMFNever: {
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfClosed();
                break;
            }
            case CommonActionType.OpenPMFSurvey: {
                Container.pmfStats.touchSurveyed();
                this._analytics.fireViewScreenEvent('atlascodePmf');
                break;
            }
            case CommonActionType.ExternalLink: {
                let foundUrl = msg.url;

                if (!foundUrl) {
                    foundUrl = knownLinkIdMap.get(msg.linkId);
                }

                if (foundUrl) {
                    env.openExternal(Uri.parse(foundUrl));
                    // TODO: add new analytics event for clicking links using the linkID
                }
                break;
            }
            case CommonActionType.SubmitFeedback: {
                submitFeedback(msg.feedback);
                break;
            }
            case CommonActionType.OpenJiraIssue: {
                showIssue(msg.issueOrKey);
                break;
            }
            case CommonActionType.Refresh: {
                // should be handled by caller
                break;
            }
            case CommonActionType.Cancel: {
                this._cancelMan.get(msg.abortKey)?.cancel(msg.reason);
                this._cancelMan.delete(msg.abortKey);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
