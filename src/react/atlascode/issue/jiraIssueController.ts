import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { IssueUIHelper } from '../../../lib/guipi/jira-issue-renderer/src/issueUIHelper';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { JiraIssueAction } from '../../../lib/ipc/fromUI/jiraIssue';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    emptyJiraIssueInitMessage,
    JiraIssueInitMessage,
    JiraIssueMessage,
    JiraIssueMessageType,
    JiraIssueResponse,
} from '../../../lib/ipc/toUI/jiraIssue';
import { JiraIssueRenderer } from '../../guipi/jira-issue-renderer-mui/jiraIssueRenderer';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface JiraIssueControllerApi {
    postMessage: PostMessageFunc<JiraIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    issueUIHelper?: IssueUIHelper<DetailedSiteInfo, JSX.Element>;
}

export const emptyApi: JiraIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    issueUIHelper: undefined,
};

export const JiraIssueControllerContext = React.createContext(emptyApi);

export interface JiraIssueState extends JiraIssueInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: JiraIssueState = {
    ...emptyJiraIssueInitMessage,
    isSomethingLoading: false,
};

export enum JiraIssueUIActionType {
    Init = 'init',
    FieldUpdate = 'fieldUpdate',
    Loading = 'loading',
}

export type JiraIssueUIAction =
    | ReducerAction<JiraIssueUIActionType.Init, { data: JiraIssueInitMessage }>
    | ReducerAction<JiraIssueUIActionType.FieldUpdate, { fieldUI: FieldUI; value: any }>
    | ReducerAction<JiraIssueUIActionType.Loading, {}>;

export type JiraIssueChanges = { [key: string]: any };

function reducer(state: JiraIssueState, action: JiraIssueUIAction): JiraIssueState {
    switch (action.type) {
        case JiraIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case JiraIssueUIActionType.FieldUpdate: {
            const newState: JiraIssueState = {
                ...state,
                editUIData: {
                    ...state.editUIData,
                    fieldValues: {
                        ...state.editUIData.fieldValues,
                        ...{ [action.fieldUI.key]: action.value },
                    },
                },
            };
            return newState;
        }
        case JiraIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useJiraIssuePageController(): [JiraIssueState, JiraIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: JiraIssueMessage): void => {
        switch (message.type) {
            case JiraIssueMessageType.Init: {
                dispatch({ type: JiraIssueUIActionType.Init, data: message });
            }
            default: {
                // uncomment this if another action is added above
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<JiraIssueAction, JiraIssueMessage, JiraIssueResponse>(onMessageHandler);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: JiraIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.JiraIssueWebview,
                linkId: linkId,
            }),
        [postMessage]
    );

    const renderer = React.useMemo(() => new JiraIssueRenderer(dispatch), [dispatch]);

    const issueUIHelper = React.useMemo(() => new IssueUIHelper(state.editUIData, renderer), [
        renderer,
        state.editUIData,
    ]);

    const controllerApi = useMemo<JiraIssueControllerApi>((): JiraIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink: openLink,
            issueUIHelper: issueUIHelper,
        };
    }, [openLink, postMessage, sendRefresh, issueUIHelper]);

    return [state, controllerApi];
}
