import { ExtensionContext, Disposable, env } from 'vscode';
import { configuration, IConfig } from './config/configuration';
import { ConfigWebview } from './webviews/configWebview';
import { PullRequestViewManager } from './webviews/pullRequestViewManager';
import { JiraIssueViewManager } from './webviews/jiraIssueViewManager';
import { ClientManager } from './atlclients/clientManager';
import { AuthManager } from './atlclients/authStore';
import { JiraExplorer } from './views/jira/jiraExplorer';
import { AuthStatusBar } from './views/authStatusBar';
import { JiraSiteManager } from './jira/siteManager';
import { WelcomeWebview } from './webviews/welcomeWebview';
import { AnalyticsClient } from '@atlassiansox/analytics-node-client';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';

export class Container {
    static initialize(context: ExtensionContext, config: IConfig, version:string) {
        this._context = context;
        this._config = config;

        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._authManager = new AuthManager()));
        context.subscriptions.push((this._authStatusBar = new AuthStatusBar()));
        context.subscriptions.push((this._jiraSiteManager = new JiraSiteManager()));
        context.subscriptions.push((this._configWebview = new ConfigWebview(context.extensionPath)));
        context.subscriptions.push((this._welcomeWebview = new WelcomeWebview(context.extensionPath)));
        context.subscriptions.push((this._pullRequestViewManager = new PullRequestViewManager(context.extensionPath)));
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
        context.subscriptions.push(new IssueHoverProviderManager());

        let analyticsEnv:string = configuration.isDebugging ? 'stg' : 'prod';

        this._analyticsClient = new AnalyticsClient({
            origin:'desktop',
            env:analyticsEnv,
            product:'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version
        });

        if (config.jira.explorer.enabled) {
            context.subscriptions.push((this._jiraExplorer = new JiraExplorer()));
        } else {
            let disposable: Disposable;
            disposable = configuration.onDidChange(e => {
                if (configuration.changed(e, 'jira.explorer.enabled')) {
                    disposable.dispose();
                    context.subscriptions.push((this._jiraExplorer = new JiraExplorer()));
                }
           });
        }
    }
    static get machineId() {
        return env.machineId;
    }

    private static _config: IConfig | undefined;
    static get config() {
        return  this._config || configuration.get<IConfig>();
    }

    private static _context: ExtensionContext;
    static get context() {
        return this._context;
    }

    private static _configWebview: ConfigWebview;
    static get configWebview() {
        return this._configWebview;
    }

    private static _welcomeWebview: WelcomeWebview;
    static get welcomeWebview() {
        return this._welcomeWebview;
    }

    private static _pullRequestViewManager: PullRequestViewManager;
    static get pullRequestViewManager() {
        return this._pullRequestViewManager;
    }

    private static _jiraExplorer: JiraExplorer | undefined;
    static get jiraExplorer(): JiraExplorer {
        return this._jiraExplorer!;
    }

    private static _jiraIssueViewManager: JiraIssueViewManager;
    static get jiraIssueViewManager() {
        return this._jiraIssueViewManager;
    }

    private static _clientManager: ClientManager;
    static get clientManager() {
        return this._clientManager;
    }

    private static _authManager: AuthManager;
    static get authManager() {
        return this._authManager;
    }

    private static _authStatusBar: AuthStatusBar;
    static get authStatusBar() {
        return this._authStatusBar;
    }

    private static _jiraSiteManager: JiraSiteManager;
    static get jiraSiteManager() {
        return this._jiraSiteManager;
    }

    private static _analyticsClient:AnalyticsClient;
    static get analyticsClient() {
        return this._analyticsClient;
    }

    static resetConfig() {
        this._config = undefined;
    }
}