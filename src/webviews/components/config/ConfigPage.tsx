import * as React from 'react';
import uuid from 'uuid';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import Button from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import { AuthAction, SaveSettingsAction, FeedbackData, SubmitFeedbackAction, LoginAuthAction } from '../../../ipc/configActions';
import { DetailedSiteInfo, AuthInfo, SiteInfo } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import BitbucketExplorer from './BBExplorer';
import JiraStatusBar from './JiraStatusBar';
import BBStatusBar from './BBStatusBar';
import DisplayFeedback from './DisplayFeedback';
import { Action, HostErrorMessage } from '../../../ipc/messaging';
import JiraHover from './JiraHover';
import BitbucketContextMenus from './BBContextMenus';
import WelcomeConfig from './WelcomeConfig';
import { BitbucketIcon, ConfluenceIcon } from '@atlaskit/logo';
import PipelinesConfig from './PipelinesConfig';
import { WorkingProject } from '../../../config/model';
import { FetchQueryAction } from '../../../ipc/issueActions';
import { ProjectList } from '../../../ipc/issueMessaging';
import Form from '@atlaskit/form';
import JiraSiteProject from './JiraSiteProject';
import BitbucketIssuesConfig from './BBIssuesConfig';
import MultiOptionList from './MultiOptionList';
import ErrorBanner from '../ErrorBanner';
import BitbucketAuth from './BBAuth';
import JiraAuth from './JiraAuth';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ProductEnabler from './ProductEnabler';

type changeObject = { [key: string]: any };

const panelHeader = (heading: string, subheading: string) =>
    <div>
        <h3 className='inlinePanelHeader'>{heading}</h3>
        <p className='inlinePanelSubheading'>{subheading}</p>
    </div>;

type Emit = AuthAction | LoginAuthAction | SaveSettingsAction | SubmitFeedbackAction | FetchQueryAction | Action;
type Accept = ConfigData | ProjectList | HostErrorMessage;

interface ViewState extends ConfigData {
    isProjectsLoading: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
}

const emptyState: ViewState = {
    ...emptyConfigData,
    isProjectsLoading: false,
    isErrorBannerOpen: false,
    errorDetails: undefined
};

export default class ConfigPage extends WebviewComponent<Emit, Accept, {}, ViewState> {
    private nonce: string;
    private newProjects: WorkingProject[] = [];

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isProjectsLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'update': {
                this.setState({ ...e as ConfigData, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                this.nonce = e.nonce;
                break;
            }
        }

        return true;

    }

    public onConfigChange = (change: changeObject, removes?: string[]) => {
        this.postMessage({ action: 'saveSettings', changes: change, removes: removes });
    }

    handleLogin = (site: SiteInfo, auth: AuthInfo) => {
        console.log('config posting saving site', site);
        this.postMessage({ action: 'login', siteInfo: site, authInfo: auth });
    }

    handleLogout = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'logout', siteInfo: site });
    }

    handleSourceLink = () => {
        this.postMessage({ action: 'sourceLink' });
    }

    handleIssueLink = () => {
        this.postMessage({ action: 'issueLink' });
    }

    handleDocsLink = () => {
        this.postMessage({ action: 'docsLink' });
    }

    handleFeedback = (feedback: FeedbackData) => {
        this.postMessage({ action: 'submitFeedback', feedback: feedback });
    }

    loadProjectOptions = (input: string): Promise<any> => {
        this.setState({ isProjectsLoading: true });
        return new Promise(resolve => {
            this.newProjects = [];

            const nonce = uuid.v4();
            this.postMessage({ action: 'fetchProjects', query: input, nonce: nonce });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if ((this.newProjects.length > 0 && this.nonce === nonce) || (end - start) > 2000) {
                    this.setState({ isProjectsLoading: false });
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 100);
        });
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    public render() {
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;
        const connyicon = <ConfluenceIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

        return (
            <Page>
                {this.state.isErrorBannerOpen &&
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                }
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <h1>Atlassian for VSCode</h1>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>Settings</h2>
                    </GridColumn>
                </Grid>
                <Grid spacing='comfortable' layout='fixed'>

                    <GridColumn medium={9}>
                        <Form
                            name="jira-explorer-form"
                            onSubmit={(e: any) => { }}
                        >
                            {(frmArgs: any) => {
                                return (<form {...frmArgs.formProps}>
                                    <ProductEnabler
                                        jiraEnabled={this.state.config.jira.enabled}
                                        bbEnabled={this.state.config.bitbucket.enabled}
                                        onConfigChange={this.onConfigChange} />
                                    <Tabs>
                                        <TabList>
                                            {this.state.config.jira.enabled &&
                                                <Tab>Jira</Tab>
                                            }
                                            {this.state.config.bitbucket.enabled &&
                                                <Tab>Bitbucket</Tab>
                                            }
                                            <Tab>General</Tab>
                                        </TabList>
                                        {this.state.config.jira.enabled &&
                                            <TabPanel>
                                                <Panel isDefaultExpanded={true} header={panelHeader('Authentication', 'configure authentication for Jira')}>
                                                    <JiraAuth
                                                        sites={this.state.jiraSites}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin} />
                                                    {/* TODO: [VSCODE-509] move default site selection to auth list */}
                                                    <JiraSiteProject configData={this.state} isLoading={this.state.isProjectsLoading} onConfigChange={this.onConfigChange} loadProjectOptions={this.loadProjectOptions} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Issues and JQL', 'configure the Jira issue explorer')}>
                                                    <JiraExplorer configData={this.state}
                                                        jiraAccessToken={this.state.jiraAccessToken}
                                                        sites={this.state.jiraSites}
                                                        onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Jira Issue Hovers', 'configure hovering for Jira issue keys')}>
                                                    <JiraHover configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Create Jira Issue Triggers', 'configure creation of Jira issues from TODOs and similar')}>
                                                    <MultiOptionList
                                                        onConfigChange={this.onConfigChange}
                                                        enabledConfig={'jira.todoIssues.enabled'}
                                                        optionsConfig={'jira.todoIssues.triggers'}
                                                        enabledValue={this.state.config.jira.todoIssues.enabled}
                                                        enabledDescription={'Prompt to create Jira issues for TODO style comments'}
                                                        promptString={'Add Trigger'}
                                                        options={this.state.config.jira.todoIssues.triggers} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Status Bar', 'configure the status bar display for Jira')}>
                                                    <JiraStatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                            </TabPanel>
                                        }

                                        {this.state.config.bitbucket.enabled &&
                                            <TabPanel>
                                                <Panel isDefaultExpanded={true} header={panelHeader('Authentication', 'configure authentication for Bitbucket')}>
                                                    <BitbucketAuth
                                                        sites={this.state.bitbucketSites}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Pull Request Explorer', 'configure the Bitbucket pull request explorer')}>
                                                    <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Pipeline Explorer', 'configure the Bitbucket Pipeline explorer')}>
                                                    <PipelinesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Bitbucket Issues Explorer', 'configure the Bitbucket Issues explorer')}>
                                                    <BitbucketIssuesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel isDefaultExpanded={true} header={panelHeader('Bitbucket Context Menus', 'configure the Bitbucket context menus in editor')}>
                                                    <BitbucketContextMenus configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                                <Panel isDefaultExpanded={true} header={panelHeader('Status Bar', 'configure the status bar display for Bitbucket')}>
                                                    <BBStatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                            </TabPanel>
                                        }
                                        <TabPanel>
                                            <Panel isDefaultExpanded={true} header={<div><p className='subheader'>miscellaneous settings</p></div>}>
                                                <WelcomeConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                            </Panel>
                                        </TabPanel>
                                    </Tabs>

                                </form>);
                            }
                            }
                        </Form>
                    </GridColumn>


                    <GridColumn medium={3}>
                        <DisplayFeedback onFeedback={this.handleFeedback} />
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleIssueLink}>Got Issues?</Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={connyicon} onClick={this.handleDocsLink}>User Guide</Button>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>

        );
    }
}
