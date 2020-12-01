import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CreateIssueUIHelper } from '../../../lib/guipi/jira-issue-renderer/src';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { CreateJiraIssueAction, CreateJiraIssueActionType } from '../../../lib/ipc/fromUI/createJiraIssue';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    CreateJiraIssueInitMessage,
    CreateJiraIssueMessage,
    CreateJiraIssueMessageType,
    CreateJiraIssueResponse,
    emptyCreateJiraIssueInitMessage,
} from '../../../lib/ipc/toUI/createJiraIssue';
import { CreateJiraIssueRenderer } from '../../guipi/jira-issue-renderer-mui/createJiraIssueRenderer';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface CreateJiraIssueControllerApi {
    postMessage: PostMessageFunc<CreateJiraIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    createIssueUIHelper?: CreateIssueUIHelper<DetailedSiteInfo, JSX.Element>;
}

export const emptyApi: CreateJiraIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    createIssueUIHelper: undefined,
};

export const CreateJiraIssueControllerContext = React.createContext(emptyApi);

export interface CreateJiraIssueState extends CreateJiraIssueInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: CreateJiraIssueState = {
    ...emptyCreateJiraIssueInitMessage,
    isSomethingLoading: false,
};

export enum CreateJiraIssueUIActionType {
    Init = 'init',
    FieldUpdate = 'fieldUpdate',
    Loading = 'loading',
}

export type CreateJiraIssueUIAction =
    | ReducerAction<CreateJiraIssueUIActionType.Init, { data: CreateJiraIssueInitMessage }>
    | ReducerAction<CreateJiraIssueUIActionType.FieldUpdate, { fieldUI: FieldUI; value: any }>
    | ReducerAction<CreateJiraIssueUIActionType.Loading, {}>;

export type JiraIssueChanges = { [key: string]: any };

function reducer(state: CreateJiraIssueState, action: CreateJiraIssueUIAction): CreateJiraIssueState {
    switch (action.type) {
        case CreateJiraIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case CreateJiraIssueUIActionType.FieldUpdate: {
            console.log(action);
            console.log(state);
            const selectedIssueType =
                action.fieldUI.key === 'issuetype' ? action.value : state.screenData.selectedIssueType;
            const newState: CreateJiraIssueState = {
                ...state,
                screenData: {
                    ...state.screenData,
                    issueTypeUIs: {
                        ...state.screenData.issueTypeUIs,
                        [selectedIssueType.id]: {
                            ...state.screenData.issueTypeUIs[selectedIssueType.id],
                            fieldValues: {
                                ...state.screenData.issueTypeUIs[selectedIssueType.id].fieldValues,
                                ...{ [action.fieldUI.key]: action.value },
                            },
                        },
                    },
                    selectedIssueType: selectedIssueType,
                },
            };

            console.log(newState);
            return newState;
        }
        case CreateJiraIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useCreateJiraIssuePageController(): [CreateJiraIssueState, CreateJiraIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: CreateJiraIssueMessage): void => {
        switch (message.type) {
            case CreateJiraIssueMessageType.Init: {
                dispatch({ type: CreateJiraIssueUIActionType.Init, data: message });
            }
            default: {
                // uncomment this if another action is added above
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<CreateJiraIssueAction, CreateJiraIssueMessage, CreateJiraIssueResponse>(
        onMessageHandler
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: CreateJiraIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.CreateJiraIssueWebview,
                linkId: linkId,
            }),
        [postMessage]
    );

    const renderer = React.useMemo(() => new CreateJiraIssueRenderer(dispatch), [dispatch]);

    const createIssueUIHelper = React.useMemo(() => new CreateIssueUIHelper(state.screenData, renderer), [
        renderer,
        state.screenData,
    ]);

    React.useEffect(() => {
        postMessage({
            type: CreateJiraIssueActionType.GetCreateMeta,
            site: state.site,
            projectKey: state.project.key,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.site.id, state.project.key, postMessage]);

    const controllerApi = useMemo<CreateJiraIssueControllerApi>((): CreateJiraIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink,
            createIssueUIHelper,
        };
    }, [openLink, postMessage, sendRefresh, createIssueUIHelper]);

    return [state, controllerApi];
}
