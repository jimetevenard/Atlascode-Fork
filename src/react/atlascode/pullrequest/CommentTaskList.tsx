import { Grid } from '@material-ui/core';
import React from 'react';
import { Task } from '../../../bitbucket/model';
import { CommentTask } from './CommentTask';

type CommentTaskListProps = {
    tasks: Task[];
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};
export const CommentTaskList: React.FunctionComponent<CommentTaskListProps> = ({ tasks, onEdit, onDelete }) => {
    return (
        <Grid item container spacing={1} direction="column" justify="center">
            {tasks.map((task) => (
                <CommentTask key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </Grid>
    );
};
