import * as React from 'react';
import * as ReactDOM from 'react-dom';

const routes = {
    'atlascodeSettings': React.lazy(() => import('./webviews/components/config/ConfigPage')),
    'atlascodeWelcomeScreen': React.lazy(() => import('./webviews/components/config/Welcome')),
    'pullRequestDetailsScreen': React.lazy(() => import('./webviews/components/pullrequest/PullRequestPage')),
    'createPullRequestScreen': React.lazy(() => import('./webviews/components/pullrequest/CreatePullRequestPage')),
    'viewIssueScreen': React.lazy(() => import('./webviews/components/issue/JiraIssuePage')),
    'atlascodeCreateIssueScreen': React.lazy(() => import('./webviews/components/issue/CreateIssuePage')),
    'startWorkOnIssueScreen': React.lazy(() => import('./webviews/components/issue/StartWorkPage')),
    'pipelineSummaryScreen': React.lazy(() => import('./webviews/components/pipelines/PipelineSummaryPage')),
    'bitbucketIssueScreen': React.lazy(() => import('./webviews/components/bbissue/BitbucketIssuePage')),
    'bitbucketCreateIssueScreen': React.lazy(() => import('./webviews/components/bbissue/CreateBitbucketIssuePage')),
};


const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;
const App = () => {
    const Page = routes[view.getAttribute('content')!];
    return (
        <React.Suspense fallback={<div className="loading-spinner" />}>
            <Page />
        </React.Suspense>
    );
};

ReactDOM.render(<App />, root);

