import { CssBaseline } from '@material-ui/core';
import { default as MuiThemeProvider } from '@material-ui/styles/ThemeProvider';
import React, { useCallback, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useConstant from 'use-constant';
import AtlGlobalStyles from './atlascode/common/AtlGlobalStyles';
import { AtlLoader } from './atlascode/common/AtlLoader';
import { ErrorControllerContext, ErrorStateContext, useErrorController } from './atlascode/common/errorController';
import { atlascodeTheme } from './atlascode/theme/atlascodeTheme';
import { attachImageErrorHandler } from './imageErrorHandler';
import { ResourceContext } from './resourceContext';
import { computeStyles, VSCodeStylesContext } from './vscode/theme/styles';
import { createVSCodeTheme } from './vscode/theme/vscodeTheme';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
declare var __webpack_public_path__: string;
__webpack_public_path__ = `${document.baseURI!}build/`;

const routes = {
    atlascodeSettingsV2: React.lazy(() =>
        import(/* webpackChunkName: "atlascodeSettingsV2" */ './atlascode/config/ConfigPage')
    ),
    bitbucketIssuePageV2: React.lazy(() =>
        import(/* webpackChunkName: "bitbucketIssuePageV2" */ './atlascode/bbissue/BitbucketIssuePage')
    ),
    startWorkPageV2: React.lazy(() =>
        import(/* webpackChunkName: "startWorkPageV2" */ './atlascode/startwork/StartWorkPage')
    ),
};

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

attachImageErrorHandler();

const App = () => {
    const Page = routes[view.getAttribute('content')!];
    const [errorState, errorController] = useErrorController();
    const [vscStyles, setVscStyles] = useState(computeStyles());
    const [currentTheme, setCurrentTheme] = useState(atlascodeTheme(createVSCodeTheme(vscStyles), false));
    const onColorThemeChanged = useCallback(() => {
        const newStyles = computeStyles();
        setVscStyles(newStyles);
        setCurrentTheme(atlascodeTheme(createVSCodeTheme(newStyles), false));
    }, []);
    const themeObserver = useConstant<MutationObserver>(() => {
        const observer = new MutationObserver(onColorThemeChanged);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return observer;
    });

    useEffect(() => {
        return () => {
            themeObserver.disconnect();
        };
    }, [themeObserver]);

    return (
        <ResourceContext.Provider value="vscode-resource:">
            <React.Suspense fallback={<AtlLoader />}>
                <VSCodeStylesContext.Provider value={vscStyles}>
                    <MuiThemeProvider theme={currentTheme}>
                        <ErrorControllerContext.Provider value={errorController}>
                            <ErrorStateContext.Provider value={errorState}>
                                <CssBaseline />
                                <AtlGlobalStyles />
                                <Page />
                            </ErrorStateContext.Provider>
                        </ErrorControllerContext.Provider>
                    </MuiThemeProvider>
                </VSCodeStylesContext.Provider>
            </React.Suspense>
        </ResourceContext.Provider>
    );
};

ReactDOM.render(<App />, root);
