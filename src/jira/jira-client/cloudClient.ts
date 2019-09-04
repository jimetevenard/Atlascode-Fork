import { JiraClient } from './client';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { CredentialManager } from '../../atlclients/authStore';
import { OAuthInterceptor } from '../../atlclients/oauthInterceptor';
import { AuthorizationInterceptor } from '../../atlclients/authorizationInterceptor';


export class JiraCloudClient extends JiraClient {
    private _interceptor: AuthorizationInterceptor;

    constructor(_authStore: CredentialManager, site: DetailedSiteInfo, agent?: any) {
        super(site, agent);
        this._interceptor = new OAuthInterceptor(site, _authStore, this.transport);
        if (this._interceptor) { console.log('nick is too lazy to figure out how to suppress this error'); }
    }

    public async assignIssue(issueIdOrKey: string, accountId: string | undefined): Promise<any> {
        const res = await this.putToJira(`issue/${issueIdOrKey}/assignee`, { accountId: accountId });

        return res;
    }

    // Project
    public getProjectSearchPath(): string {
        return 'project/search';
    }
}
