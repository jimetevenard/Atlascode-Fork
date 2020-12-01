import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';

export interface JiraIssueActionApi {
    updateIssue(issue: MinimalIssue<DetailedSiteInfo>, newFieldValues: FieldValues): Promise<FieldValues>;
}
