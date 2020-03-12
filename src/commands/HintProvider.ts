import { window } from 'vscode';
import { configuration } from '../config/configuration';
import { HintNotification } from '../config/model';
import { Container } from '../container';

export class HintProvider {
    private hintNotifications: HintNotification[];

    constructor() {
        this.hintNotifications = [];
    }

    private buildHintNotification(
        body: string,
        action: () => void,
        configToWatch: string,
        actionDescription?: string
    ): HintNotification {
        return {
            body: body,
            actionDescription: actionDescription ?? 'Try it!',
            action: action,
            disableHintsDescription: 'Disable Hints',
            disableHints: () => {
                configuration.updateEffective('showHintNotifications', true);
                window
                    .showInformationMessage(
                        'Hints have been disabled. To re-enable hints, go to settings > general > enable hints',
                        'Open Settings'
                    )
                    .then(selection => {
                        if (selection) {
                            if (selection === 'Open Settings') {
                                //TODO take the user to the settings > general (need to wait for MUI update)
                            }
                        }
                    });
            },
            configToWatch: configToWatch
        };
    }

    public addHint(body: string, action: () => void, configToWatch: string, actionDescription?: string) {
        this.hintNotifications.push(this.buildHintNotification(body, action, configToWatch, actionDescription));
    }

    public showHintNotification() {
        if (this.hintNotifications.length === 0 || !Container.config.showHintNotifications) {
            return;
        }

        //Pick a random action to suggest that the user hasn't completed
        const notComplete = this.hintNotifications.filter(
            notification => !Container.getChecklistItem(notification.configToWatch)
        );

        if (notComplete.length === 0) {
            return;
        }

        const randomNotification = notComplete[Math.floor(Math.random() * notComplete.length)];

        window
            .showInformationMessage(
                randomNotification.body,
                randomNotification.actionDescription,
                randomNotification.disableHintsDescription
            )
            .then(selection => {
                if (selection) {
                    if (selection === randomNotification.actionDescription) {
                        configuration.updateEffective(randomNotification.configToWatch, true);
                        randomNotification.action();
                    } else {
                        randomNotification.disableHints();
                    }
                }
            });
    }
}
