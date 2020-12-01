import { EditIssueUI } from '@atlassianlabs/jira-metaui-client';
import { JiraSiteInfo } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, InputFieldUI, SelectFieldUI, UIType } from '@atlassianlabs/jira-pi-meta-models';
import { IssueRenderer } from './issueRenderer';

export class IssueUIHelper<S extends JiraSiteInfo, C> {
    private _meta: EditIssueUI<S>;
    private _renderer: IssueRenderer<C>;

    constructor(meta: EditIssueUI<S>, renderer: IssueRenderer<C>) {
        this._meta = meta;
        this._renderer = renderer;
    }

    public getSortedFieldUIs(): [FieldUI[], FieldUI[]] {
        const orderedValues: FieldUI[] = this.sortFieldValues(this._meta.fields);
        const advancedFields: FieldUI[] = [];
        const commonFields: FieldUI[] = [];

        orderedValues.forEach((field) => {
            if (field.advanced) {
                advancedFields.push(field);
            } else {
                commonFields.push(field);
            }
        });

        return [commonFields, advancedFields];
    }

    public getCommonFieldMarkup(): (C | undefined)[] {
        const [common] = this.getSortedFieldUIs();

        console.log(common.length);
        return common.map((fieldUI) => {
            return this.renderFieldUI(fieldUI);
        });
    }

    public getAdvancedFieldMarkup(): (C | undefined)[] {
        const [, advanced] = this.getSortedFieldUIs();

        return advanced.map((fieldUI) => {
            return this.renderFieldUI(fieldUI);
        });
    }

    protected sortFieldValues(fields: FieldUIs): FieldUI[] {
        return Object.values(fields).sort((left: FieldUI, right: FieldUI) => {
            if (left.displayOrder < right.displayOrder) {
                return -1;
            }
            if (left.displayOrder > right.displayOrder) {
                return 1;
            }
            return 0;
        });
    }

    private renderFieldUI(fieldUI: FieldUI): C | undefined {
        switch (fieldUI.uiType) {
            case UIType.Input: {
                const inputField = fieldUI as InputFieldUI;
                if (!inputField.isMultiline) {
                    return this._renderer.renderTextInput(
                        inputField,
                        this._meta.fieldValues[`${fieldUI.key}.rendered`]
                    );
                } else {
                    return this._renderer.renderTextAreaInput(
                        inputField,
                        this._meta.fieldValues[`${fieldUI.key}.rendered`]
                    );
                }
            }
            case UIType.Select: {
                const selectField = fieldUI as SelectFieldUI;
                return this._renderer.renderSelectInput(
                    selectField,
                    this._meta.selectFieldOptions[fieldUI.key],
                    this._meta.fieldValues[`${fieldUI.key}.rendered`]
                );
            }
        }

        return undefined;
    }
}
