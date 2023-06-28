import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { CreatePullRequestAction, CreatePullRequestActionType } from '../../../ipc/fromUI/createPullRequest';
import {
    CreatePullRequestMessage,
    CreatePullRequestMessageType,
    CreatePullRequestResponse,
} from '../../../ipc/toUI/createPullRequest';
import { MessagePoster, WebviewController } from '../webviewController';

import { AnalyticsApi } from '../../../analyticsApi';
import Axios from 'axios';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { CreatePullRequestActionApi } from './createPullRequestActionApi';
import { Logger } from '../../../logger';
import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { Registry } from '../../../../analytics';
import { WebViewID } from '../../../ipc/models/common';
import { WorkspaceRepo } from '../../../../bitbucket/model';
import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { formatError } from '../../formatError';

export class CreatePullRequestWebviewController implements WebviewController<WorkspaceRepo> {
    private isRefreshing = false;
    private initData: WorkspaceRepo;

    constructor(
        private messagePoster: MessagePoster,
        private api: CreatePullRequestActionApi,
        private commonHandler: CommonActionMessageHandler,
        private logger: Logger,
        private analytics: AnalyticsApi,
        factoryData?: WorkspaceRepo
    ) {
        this.initData = factoryData!;
    }

    public title(): string {
        return 'Create pull request';
    }

    public screenDetails() {
        return { id: WebViewID.CreatePullRequest, site: undefined, product: ProductBitbucket };
    }

    private postMessage(message: CreatePullRequestMessage | CreatePullRequestResponse | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }
            this.isRefreshing = true;

            const wsRepo = this.initData;

            const repoData = await this.api.getRepoDetails(wsRepo);

            this.postMessage({
                type: CreatePullRequestMessageType.Init,
                repoData: repoData,
            });
        } catch (e) {
            let err = new Error(`error updating start work page: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public update(factoryData?: WorkspaceRepo) {
        this.initData = factoryData || this.initData;
        this.invalidate();
    }

    public async onMessageReceived(msg: CreatePullRequestAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing start work page: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing start work page'),
                    });
                }
                break;
            }
            case CreatePullRequestActionType.FetchIssue:
                try {
                    const issue = await this.api.fetchIssue(msg.branchName);
                    if (issue !== undefined) {
                        this.postMessage({
                            type: CreatePullRequestMessageType.UpdateIssue,
                            issue,
                        });
                    }
                } catch (e) {
                    this.logger.error(new Error(`error fetching issue for branch name: ${e}`));
                    // ignore posting error to UI
                }
                break;
            case CreatePullRequestActionType.FetchDetails:
                try {
                    const [commits, fileDiffs] = await this.api.fetchDetails(
                        this.initData,
                        msg.sourceBranch,
                        msg.destinationBranch
                    );
                    this.postMessage({
                        type: CreatePullRequestMessageType.UpdateDetails,
                        commits,
                        fileDiffs,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error fetching commits: ${e}`));
                    // ignore posting error to UI
                }
                break;
            case CreatePullRequestActionType.OpenDiff:
                try {
                    this.api.openDiff(msg.fileDiff);
                    this.analytics.fireViewScreenEvent(
                        Registry.screen.pullRequestPreviewDiffScreen,
                        undefined,
                        ProductBitbucket
                    );
                } catch (e) {
                    this.logger.error(new Error(`error opening diff: ${e}`));
                    // ignore posting error to UI
                }
                break;
            case CreatePullRequestActionType.FetchUsersRequest:
                try {
                    const users = await this.api.fetchUsers(msg.site, msg.query, msg.abortKey);
                    this.postMessage({
                        type: CreatePullRequestMessageType.FetchUsersResponse,
                        users: users,
                    });
                } catch (e) {
                    if (Axios.isCancel(e)) {
                        this.logger.warn(formatError(e));
                    } else {
                        this.logger.error(new Error(`error fetching users: ${e}`));
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Error fetching users'),
                        });
                    }
                }
                break;
            case CreatePullRequestActionType.SubmitCreateRequest:
                try {
                    const pr = await this.api.create(msg);
                    this.postMessage({
                        type: CreatePullRequestMessageType.SubmitResponse,
                        pr: pr,
                    });
                    this.analytics.firePrCreatedEvent(msg.sourceSiteRemote.site?.details);
                } catch (e) {
                    this.logger.error(new Error(`error creating pull request: ${e}`));
                    this.postMessage({
                        type: CreatePullRequestMessageType.SubmitResponse,
                        pr: undefined!,
                    });
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error creating pull request'),
                    });
                }
                break;

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
}
