import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum CreateIssueMessageType {
    Init = 'init',
    CreateVersionResponse = 'createVersionResponse',
}

export type CreateIssueMessage = ReducerAction<CreateIssueMessageType.Init, CreateIssueInitMessage>;

export type CreateIssueResponse = ReducerAction<
    CreateIssueMessageType.CreateVersionResponse,
    CreateVersionResponseMessage
>;

export interface CreateIssueInitMessage {}

export const emptyCreateIssueInitMessage = {};

export interface CreateVersionResponseMessage {
    data: any;
}
