import { Memento } from 'vscode';

export class HintChecklist {
    constructor(private globalStore: Memento) {}

    public updateChecklistItem(key: string, value: boolean) {
        this.globalStore.update(key, value);
    }

    public getChecklistItem(key: string): boolean {
        const result = this.globalStore.get(key) as boolean | undefined;
        return result ?? false;
    }
}
