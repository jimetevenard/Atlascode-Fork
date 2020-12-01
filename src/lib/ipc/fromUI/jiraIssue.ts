import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { EditIssueData } from '../../../ipc/issueMessaging';
import { CommonAction } from './common';

export enum JiraIssueActionType {
    EditIssue = 'editIssue',
}
export type JiraIssueAction = ReducerAction<JiraIssueActionType.EditIssue, EditIssueAction> | CommonAction;

export interface EditIssueAction {
    editUIData: EditIssueData;
}
