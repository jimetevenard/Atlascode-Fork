import { SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    Grid,
    MenuItem,
    TextField
} from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CommonAction, CommonActionType } from '../../../../lib/ipc/fromUI/common';
import { FeedbackData, FeedbackType, FeedbackUser } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';
type FeedbackDialogButtonProps = {
    user: FeedbackUser;
    postMessageFunc: PostMessageFunc<CommonAction>;
};

export const FeedbackDialogButton: React.FunctionComponent<FeedbackDialogButtonProps> = ({ user, postMessageFunc }) => {
    const [formOpen, setFormOpen] = useState(false);

    const { register, handleSubmit, errors, watch, formState, control, reset } = useForm<FeedbackData>({
        mode: 'onChange'
    });

    const watches = watch(['canBeContacted']);

    const submitForm = useCallback(
        (data: FeedbackData) => {
            if (!data.canBeContacted) {
                data.emailAddress = 'do-not-reply@atlassian.com';
            }
            postMessageFunc({ type: CommonActionType.SubmitFeedback, feedback: data });
            setFormOpen(false);
            reset();
        },
        [postMessageFunc, reset]
    );

    const handleDialogClose = useCallback(() => {
        setFormOpen(false);
        reset();
    }, [reset]);

    const handleOpenDialog = useCallback(() => {
        setFormOpen(true);
    }, []);

    return (
        <>
            <Button variant="contained" color="primary" onClick={handleOpenDialog}>
                Send Feedback
            </Button>

            <Dialog fullWidth maxWidth="md" open={formOpen} onClose={handleDialogClose}>
                <DialogContent>
                    <DialogContentText>Send Feedback</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <Controller
                                control={control}
                                name="type"
                                defaultValue={FeedbackType.Question}
                                as={
                                    <TextField
                                        select
                                        required
                                        autoFocus
                                        autoComplete="off"
                                        margin="dense"
                                        id="type"
                                        label="Type of Feedback"
                                        helperText={errors.type ? errors.type.message : undefined}
                                        fullWidth
                                        error={!!errors.type}
                                        inputRef={register}
                                    >
                                        <MenuItem key={FeedbackType.Question} value={FeedbackType.Question}>
                                            Ask a question
                                        </MenuItem>
                                        <MenuItem key={FeedbackType.Comment} value={FeedbackType.Comment}>
                                            Leave a comment
                                        </MenuItem>
                                        <MenuItem key={FeedbackType.Bug} value={FeedbackType.Bug}>
                                            Report a bug
                                        </MenuItem>
                                        <MenuItem key={FeedbackType.Suggestion} value={FeedbackType.Suggestion}>
                                            Suggest an impprovement
                                        </MenuItem>
                                    </TextField>
                                }
                            />
                        </Grid>
                        <Grid item>
                            <TextField
                                required
                                multiline
                                rows={3}
                                id="description"
                                name="description"
                                label="Description"
                                helperText={errors.description ? errors.description.message : undefined}
                                fullWidth
                                error={!!errors.description}
                                inputRef={register({
                                    required: 'Description URL is required'
                                })}
                            />
                        </Grid>
                        <Grid item>
                            <Controller
                                control={control}
                                name="userName"
                                defaultValue={user.userName}
                                as={
                                    <TextField
                                        required
                                        autoComplete="off"
                                        margin="dense"
                                        id="userName"
                                        label="Your name"
                                        helperText={errors.userName ? errors.userName.message : undefined}
                                        fullWidth
                                        error={!!errors.userName}
                                        inputRef={register({
                                            required: 'Your name is required'
                                        })}
                                    />
                                }
                            />
                        </Grid>
                        <Grid item>
                            <Controller
                                control={control}
                                name="canBeContacted"
                                defaultValue={true}
                                as={
                                    <SwitchWithLabel
                                        size="small"
                                        color="primary"
                                        id="canBeContacted"
                                        value="canBeContacted"
                                        label="Atlassian can contact me about this feedback"
                                    />
                                }
                            />
                        </Grid>
                        <Grid item>
                            {watches.canBeContacted && (
                                <Controller
                                    control={control}
                                    name="emailAddress"
                                    defaultValue={user.emailAddress}
                                    as={
                                        <TextField
                                            required
                                            autoComplete="off"
                                            margin="dense"
                                            id="emailAddress"
                                            label="Your contact email"
                                            helperText={errors.emailAddress ? errors.emailAddress.message : undefined}
                                            fullWidth
                                            error={!!errors.emailAddress}
                                            inputRef={register({
                                                required: 'Your contact email is required'
                                            })}
                                        />
                                    }
                                />
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!formState.isValid}
                        onClick={handleSubmit(submitForm)}
                        variant="contained"
                        color="primary"
                    >
                        Submit
                    </Button>
                    <Button onClick={handleDialogClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        </>
    );
};
