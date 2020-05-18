import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { CreateIssueAction, CreateIssueActionType } from '../../../lib/ipc/fromUI/jira/createIssue';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    CreateIssueInitMessage,
    CreateIssueMessage,
    CreateIssueMessageType,
    CreateIssueResponse,
    emptyCreateIssueInitMessage,
} from '../../../lib/ipc/toUI/jira/createIssue';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface CreateIssueControllerApi {
    postMessage: PostMessageFunc<CreateIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    closePage: () => void;
    openJiraIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
}

export const emptyApi: CreateIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    closePage: () => {},
    openJiraIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => {},
};

export const CreateIssueControllerContext = React.createContext(emptyApi);

export interface CreateIssueState extends CreateIssueInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: CreateIssueState = {
    ...emptyCreateIssueInitMessage,
    isSomethingLoading: false,
};

export enum CreateIssueUIActionType {
    Init = 'init',
    Loading = 'loading',
}

export type CreateIssueUIAction =
    | ReducerAction<CreateIssueUIActionType.Init, { data: CreateIssueInitMessage }>
    | ReducerAction<CreateIssueUIActionType.Loading, {}>;

function reducer(state: CreateIssueState, action: CreateIssueUIAction): CreateIssueState {
    switch (action.type) {
        case CreateIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case CreateIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useCreateIssueController(): [CreateIssueState, CreateIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: CreateIssueMessage): void => {
        switch (message.type) {
            case CreateIssueMessageType.Init: {
                dispatch({ type: CreateIssueUIActionType.Init, data: message });
                break;
            }
            default: {
                // uncomment this if another action is added above
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<
        CreateIssueAction,
        CreateIssueMessage,
        CreateIssueResponse
    >(onMessageHandler);

    const closePage = useCallback((): void => postMessage({ type: CreateIssueActionType.ClosePage }), [postMessage]);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: CreateIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({ type: CommonActionType.ExternalLink, source: WebViewID.JiraCreateIssue, linkId: linkId }),
        [postMessage]
    );

    const openJiraIssue = useCallback(
        (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) =>
            postMessage({ type: CommonActionType.OpenJiraIssue, issueOrKey: issueOrKey }),
        [postMessage]
    );

    const controllerApi = useMemo<CreateIssueControllerApi>((): CreateIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openJiraIssue,
            openLink,
            closePage,
        };
    }, [openJiraIssue, openLink, postMessage, sendRefresh, closePage]);

    return [state, controllerApi];
}
