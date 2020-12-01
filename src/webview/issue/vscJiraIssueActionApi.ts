import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { commands } from 'vscode';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { JiraIssueActionApi } from '../../lib/webview/controller/issue/jiraIssueActionApi';

export class VSCJiraIssueActionImpl implements JiraIssueActionApi {
    //Updating issues is modeled after how the old code works. In particular, new field values are sent from the UI
    //and the state is updated. What is strange about this is that we don't wait for confirmation from the Jira API
    //to update values. I will leave this for now but this should be looked into...
    public async updateIssue(issue: MinimalIssue<DetailedSiteInfo>, newFieldValues: FieldValues): Promise<FieldValues> {
        const client = await Container.clientManager.jiraClient(issue.siteDetails);
        await client.editIssue(issue.key, newFieldValues);
        commands.executeCommand(Commands.RefreshJiraExplorer);
        return newFieldValues;
    }
}
