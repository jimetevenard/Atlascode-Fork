import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from '../common';

export enum CreateIssueActionType {
    ClosePage = 'closePage',
}

export type CreateIssueAction = ReducerAction<CreateIssueActionType.ClosePage, {}> | CommonAction;
