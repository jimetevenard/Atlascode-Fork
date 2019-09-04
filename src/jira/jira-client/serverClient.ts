import { JiraClient } from './client';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { AuthorizationInterceptor } from '../../atlclients/authorizationInterceptor';
import { BasicInterceptor } from '../../atlclients/basicInterceptor';
import { CredentialManager } from '../../atlclients/authStore';


export class JiraServerClient extends JiraClient {
    private _interceptor: AuthorizationInterceptor;

    constructor(authStore: CredentialManager, site: DetailedSiteInfo, agent?: any) {
        super(site, agent);
        this._interceptor = new BasicInterceptor(site, authStore, this.transport);
        if (this._interceptor) { console.log('nick is too lazy to figure out how to suppress this error'); }
    }

    public async assignIssue(issueIdOrKey: string, accountId: string | undefined): Promise<any> {
        const res = await this.putToJira(`issue/${issueIdOrKey}/assignee`, { name: accountId });

        return res;
    }

    // Project
    public getProjectSearchPath(): string {
        return 'project';
    }
}
