import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { emptyUser, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo, ProductJira } from '../../../../atlclients/authInfo';
import { EditIssueData } from '../../../../ipc/issueMessaging';
import { fetchEditIssueUI } from '../../../../jira/fetchIssue';
import { Logger } from '../../../../logger';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { JiraIssueAction, JiraIssueActionType } from '../../../ipc/fromUI/jiraIssue';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    emptyJiraIssueInitMessage,
    JiraIssueInitMessage,
    JiraIssueMessage,
    JiraIssueMessageType,
} from '../../../ipc/toUI/jiraIssue';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { JiraIssueActionApi } from './jiraIssueActionApi';
export const id: string = 'atlascodeSettingsV2';

export class JiraIssueWebviewController implements WebviewController<MinimalIssue<DetailedSiteInfo>> {
    private isRefreshing = false;
    private editUIData: EditIssueData;

    constructor(
        private issue: MinimalIssue<DetailedSiteInfo>,
        private messagePoster: MessagePoster,
        private api: JiraIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private logger: Logger,
        private analytics: AnalyticsApi,
        factoryData?: JiraIssueInitMessage
    ) {
        console.log(this.api, this.analytics); // suppress errors for unused variables
    }

    public title(): string {
        return `${this.issue.key}`;
    }

    public screenDetails() {
        return { id: WebViewID.JiraIssueWebview, site: undefined, product: ProductJira };
    }

    private postMessage(message: JiraIssueMessage | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        if (this.isRefreshing) {
            return;
        }
        this.isRefreshing = true;

        try {
            this.editUIData = (await fetchEditIssueUI(this.issue)) as EditIssueData;
            this.editUIData.recentPullRequests = [];
            this.editUIData.currentUser = emptyUser;

            this.postMessage({
                ...emptyJiraIssueInitMessage,
                type: JiraIssueMessageType.Init,
                issue: this.issue,
                editUIData: this.editUIData,
            });
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public update() {
        this.invalidate();
    }

    public async onMessageReceived(msg: JiraIssueAction) {
        switch (msg.type) {
            case JiraIssueActionType.EditIssue: {
                //TODO: This should act like a promise
                const newFieldValues: FieldValues = msg.editUIData.fields;
                try {
                    const newFieldValues: FieldValues = this.api.updateIssue(this.issue, msg.editUIData.fieldValues);
                    if (
                        Object.keys(newFieldValues).some(
                            (fieldKey) => this.editUIData.fieldValues[`${fieldKey}.rendered`] !== undefined
                        )
                    ) {
                        await this.invalidate();
                    } else {
                        this.editUIData.fieldValues = { ...this.editUIData.fieldValues, ...newFieldValues };
                        this.postMessage({
                            type: JiraIssueMessageType.UpdateFieldValues,
                            fieldValues: newFieldValues,
                        });
                    }

                    //TODO: Handle analytics
                    // Object.keys(newFieldValues).forEach((key) => {
                    //     issueUpdatedEvent(this.issue.siteDetails, this.issue.key, key, this.fieldNameForKey(key)).then(
                    //         (e) => {
                    //             Container.analyticsClient.sendTrackEvent(e);
                    //         }
                    //     );
                    // });
                } catch (e) {
                    Logger.error(new Error(`error updating issue: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error updating issue'),
                        additionalData: {
                            fieldValues: this.getFieldValuesForKeys(Object.keys(newFieldValues)),
                        },
                    });
                }
                break;
            }
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing jira issue page: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing jira issue page'),
                    });
                }
                break;
            }
            case CommonActionType.CopyLink:
            case CommonActionType.OpenJiraIssue:
            case CommonActionType.ExternalLink:
            case CommonActionType.Cancel:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.SubmitPMF:
            case CommonActionType.SubmitFeedback: {
                this.commonHandler.onMessageReceived(msg);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }

    // private fieldNameForKey(key: string): string {
    //     const found = Object.values(this.editUIData.fields).filter((field) => field.key === key);
    //     if (Array.isArray(found) && found.length > 0) {
    //         return found[0].name;
    //     }

    //     return '';
    // }

    private getFieldValuesForKeys(keys: string[]): FieldValues {
        const values: FieldValues = {};
        const editKeys: string[] = Object.keys(this.editUIData.fieldValues);

        keys.map((key, idx) => {
            if (editKeys.includes(key)) {
                values[key] = this.editUIData.fieldValues[key];
            }
        });

        return values;
    }
}
