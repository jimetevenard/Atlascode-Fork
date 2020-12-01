import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { InputFieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';

export interface IssueRenderer<C> {
    renderTextInput: (field: InputFieldUI, value?: string) => C;
    renderTextAreaInput: (field: InputFieldUI, value?: string) => C;

    //TODO: Issue type selector seems to be specific to create issue. We should probably create a more general interface that shares
    //common stuff and then seperate out differing stuff via inheritance
    renderIssueTypeSelector: (field: SelectFieldUI, options: IssueType[], value?: IssueType) => C;
    renderSelectInput: (field: SelectFieldUI, options: any[], value?: any) => C;
}
