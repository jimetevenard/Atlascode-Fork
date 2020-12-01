import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { createEmptyMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';
import { EditIssueData, emptyEditIssueData } from '../../../ipc/issueMessaging';

export enum JiraIssueMessageType {
    Init = 'init',
    UpdateFieldValues = 'updateFieldValues',
}

export type JiraIssueMessage =
    | ReducerAction<JiraIssueMessageType.Init, JiraIssueInitMessage>
    | ReducerAction<JiraIssueMessageType.UpdateFieldValues, JiraIssueUpdateFieldValuesMessage>;

export type JiraIssueResponse = {};

export interface JiraIssueUpdateFieldValuesMessage {
    fieldValues: FieldValues;
}

export interface JiraIssueInitMessage {
    issue: MinimalIssue<DetailedSiteInfo>;
    editUIData: EditIssueData;
}

export const emptyJiraIssueInitMessage: JiraIssueInitMessage = {
    issue: createEmptyMinimalIssue(emptySiteInfo),
    editUIData: emptyEditIssueData,
};
