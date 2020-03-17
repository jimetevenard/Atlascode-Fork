import { window } from 'vscode';
import { configuration } from '../config/configuration';
import { Container } from '../container';

interface HintNotification {
    body: string;
    actionDescription: string;
    action: () => void;
    disableHintsDescription: string;
    disableHints: () => void;
    configToWatch: string;
}

export class HintProvider {
    private hintMap: Map<string, HintNotification>;
    private alreadyShown: Set<string>;

    constructor() {
        this.hintMap = new Map<string, HintNotification>();
        this.alreadyShown = new Set<string>();
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
        this.hintMap.set(body, this.buildHintNotification(body, action, configToWatch, actionDescription));
    }

    public showHintNotification(noRepeat?: boolean) {
        const hintNotifications = Array.from(this.hintMap.values());
        if (hintNotifications.length === 0 || !Container.config.showHintNotifications) {
            return;
        }

        //Pick a random action to suggest that the user hasn't completed
        const notComplete = hintNotifications.filter(notification => {
            //Check if the action has already been completed or if we're showing an action that has already been shown
            return !(
                Container.hintChecklist.getChecklistItem(notification.configToWatch) ||
                (noRepeat && this.alreadyShown.has(notification.body))
            );
        });

        if (notComplete.length === 0) {
            return;
        }

        const randomNotification = notComplete[Math.floor(Math.random() * notComplete.length)];
        this.alreadyShown.add(randomNotification.body);

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
