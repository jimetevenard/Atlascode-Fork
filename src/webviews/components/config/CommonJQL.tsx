import React, { PureComponent } from "react";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { JQLEntry } from "src/config/model";
import { Field } from '@atlaskit/form';
import Select, { components } from '@atlaskit/select';
import { chain } from "../fieldValidators";
import Button from '@atlaskit/button';
import { DetailedSiteInfo, emptySiteInfo } from "../../../atlclients/authInfo";

const IconOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue>
);

export default class CommonJQL extends PureComponent<{
  sites: DetailedSiteInfo[];
  jqlEntry: JQLEntry;
  onCancel: () => void;
  onRestoreDefault?: (jqlEntry: JQLEntry) => void;
  onSave: (jqlEntry: JQLEntry) => void;
}, {
  selectedSite: DetailedSiteInfo;
  inputValue: string;
  openComplete: boolean;
  nameValue: string;
}> {

  constructor(props: any) {
    super(props);

    let defaultSite = this.props.sites.find(site => site.id === this.props.jqlEntry.siteId);
    if (!defaultSite && this.props.sites.length > 0) {
      defaultSite = this.props.sites[0];
    } else if (!defaultSite) {
      defaultSite = emptySiteInfo;
    }

    this.state = {
        inputValue: 'unselected',
        selectedSite: defaultSite,
        openComplete: false,
        nameValue: 'default'
    };
  }

  handleSiteChange = (e: DetailedSiteInfo) => {
    this.setState({
      selectedSite: e
    });
  }

  onJQLChange = (e: any) => {
    console.log(JSON.stringify(e, null, 2));
    this.setState({
      inputValue: e.value,
      nameValue: e.label
    });
  }

  onSave = () => {
    var entry = this.props.jqlEntry;
    this.props.onSave(Object.assign({}, entry, { siteId: this.state.selectedSite.id, name: this.state.nameValue, query: this.state.inputValue }));
  }

  onOpenComplete = () => {
    this.setState({ openComplete: true });
  }

  render() {
    return (
      <ModalTransition>
        <Modal
          onClose={this.props.onCancel}
          heading="Select From List of Common JQL"
          onOpenComplete={this.onOpenComplete}
          shouldCloseOnEscapePress={false}
          scrollBehavior="outside"
        >
            <Field label='Select Site'
                id='site'
                name='site'
                defaultValue={this.state.selectedSite}
            >
                {
                (fieldArgs: any) => {
                    return (
                    <Select
                        {...fieldArgs.fieldProps}
                        className="ac-select-container"
                        classNamePrefix="ac-select"
                        getOptionLabel={(option: any) => option.name}
                        getOptionValue={(option: any) => option.id}
                        options={this.props.sites}
                        components={{ Option: IconOption, SingleValue: IconValue }}
                        onChange={chain(fieldArgs.fieldProps.onChange, this.handleSiteChange)}
                    />
                    );
                }
                }
            </Field>
            {this.state.openComplete &&
            <Field label='Select JQL Preset'
                id='JQL'
                name='JQL'
                defaultValue='default'
            >
                {
                (fieldArgs: any) => {
                    return (
                        <Select
                        className="ac-select-container"
                        classNamePrefix="ac-select"
                        onChange={this.onJQLChange}
                        options={[
                            { label: 'My Open Issues', value: 'project = "VSCODE" AND assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC' },
                            { label: 'Reported by me', value: 'reporter = currentUser() order by created DESC' },
                            { label: 'All Issues', value: 'order by created DESC' },
                            { label: 'Open Issues', value: 'resolution = Unresolved order by priority DESC,updated DESC' },
                            { label: 'Done Issues', value: 'statusCategory = Done order by updated DESC' },
                            { label: 'Viewed Recently', value: 'issuekey in issueHistory() order by lastViewed DESC' },
                            { label: 'Created Recently', value: 'created >= -1w order by created DESC' },
                            { label: 'Resolved Recently', value: 'resolutiondate >= -1w order by updated DESC' },
                            { label: 'Updated Recently', value: 'updated >= -1w order by updated DESC' },
                        ]}
                        placeholder="Select JQL Preset"
                        />
                    );
                    }
                }
            </Field>
            }
            <div style={{
            marginTop: '24px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'flex-end'
            }}>
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button
                    className='ac-button'
                    isDisabled={this.state.inputValue === 'unselected'}
                    onClick={this.onSave}
                    >
                        Save
                    </Button>
                </div>
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button
                    className='ac-button'
                    onClick={this.props.onCancel}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
      </ModalTransition>
    );
  }
}
