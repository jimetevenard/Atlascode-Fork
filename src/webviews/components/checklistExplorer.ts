import { commands } from 'vscode';
import { Commands } from '../../commands';
import { HintProvider } from '../../commands/HintProvider';
import { ChecklistTreeId } from '../../constants';
import { Container } from '../../container';
import { Explorer } from '../../views/Explorer';

export class ChecklistExplorer extends Explorer {
    private timer: any;
    private hintProvider: HintProvider;
    constructor() {
        super(() => this.dispose());
        this.hintProvider = new HintProvider();

        if (Container.config.jira.enabled) {
            this.hintProvider.addHint(
                'You can view your Jira Issues by clicking on an issue in the "Jira Issues" explorer',
                () => {}, //TODO action to focus and open issue
                'completedTasks.jira.viewedIssueScreen'
            );
            this.hintProvider.addHint(
                'You can create Jira issues by clicking on the "Create issue" button in the "Jira Issues" explorer',
                () => commands.executeCommand(Commands.CreateIssue, undefined, 'HintNotification'),
                'completedTasks.jira.createdJiraIssue'
            );
        }

        if (Container.config.bitbucket.enabled) {
            this.hintProvider.addHint(
                'You can view your Pull Requests by clicking clicking on a pull request node in the "Pull Requests" explorer',
                () => {}, //TODO action to focus and open pull request
                'completedTasks.bitbucket.viewedPullRequest'
            );
        }

        //Suggest a hint every hour
        this.hintProvider.showHintNotification();
        this.timer = setInterval(() => {
            this.hintProvider.showHintNotification();
        }, 60 * 60 * 1000);
    }

    public product() {
        return { name: '', key: '' };
    }

    viewId(): string {
        return ChecklistTreeId;
    }

    dispose() {
        super.dispose();
        clearInterval(this.timer);
    }
}
