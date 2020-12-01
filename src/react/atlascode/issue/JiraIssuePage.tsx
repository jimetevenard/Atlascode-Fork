import {
    AppBar,
    Box,
    Container,
    Divider,
    Grid,
    makeStyles,
    Paper,
    Theme,
    Toolbar,
    Typography,
} from '@material-ui/core';
import React from 'react';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { JiraIssueControllerContext, useJiraIssuePageController } from './jiraIssueController';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
                marginLeft: theme.spacing(1),
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1),
            },
            grow: {
                flexGrow: 1,
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            paperOverflow: {
                overflow: 'hidden',
            },
        } as const)
);

const JiraIssuePage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useJiraIssuePageController();

    return (
        <JiraIssueControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <AppBar position="relative">
                    <Toolbar>
                        <Typography variant="h3" className={classes.title}>
                            {state.issue.key}
                        </Typography>
                        <Box className={classes.grow} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12} zeroMinWidth>
                        <Paper className={classes.paper100}>
                            <Box margin={2}>
                                <ErrorDisplay />
                                <PMFDisplay postMessageFunc={controller.postMessage} />
                                <Grid container spacing={2} direction="column">
                                    <Grid item>
                                        <Typography>Site: {state.issue.siteDetails.name}</Typography>
                                    </Grid>
                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    {controller.issueUIHelper &&
                                        controller.issueUIHelper
                                            .getCommonFieldMarkup()
                                            .map((item) => <Grid item>{item}</Grid>)}
                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    {controller.issueUIHelper &&
                                        controller.issueUIHelper
                                            .getAdvancedFieldMarkup()
                                            .map((item) => <Grid item>{item}</Grid>)}
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </JiraIssueControllerContext.Provider>
    );
};

export default JiraIssuePage;
