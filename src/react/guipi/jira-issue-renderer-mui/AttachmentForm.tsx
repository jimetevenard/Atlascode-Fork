import { DropzoneArea } from 'material-ui-dropzone';
import React from 'react';
import { FileWithPath } from 'react-dropzone';

type Props = {
    onChange: (files: FileWithPath[]) => void;
};

export const AttachmentForm: React.FC<Props> = ({ onChange }: Props) => {
    return <DropzoneArea filesLimit={10} showAlerts={false} onChange={onChange} />;
};
