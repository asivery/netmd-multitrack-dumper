import { Box, Dialog, DialogContent, DialogContentText, DialogTitle, LinearProgress, Slide, SlideProps } from "@mui/material";
import React from "react";

const Transition = React.forwardRef(function Transition(
    props: SlideProps,
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const DownloadDialog = ({visible, actionName, units, currentProgress, totalProgress, additionalInfo}: {visible: boolean, units: string, currentProgress: number, totalProgress: number, actionName: string, additionalInfo: string}) => {
    const progressValue = Math.round((100 / (totalProgress || 1)) * currentProgress);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="factory-dialog-slide-title"
            aria-describedby="factory-dialog-slide-description"
        >
            <DialogTitle id="factory-dialog-slide-title">{actionName}...</DialogTitle>
            <DialogContent>
                <DialogContentText id="factory-dialog-slide-description">
                    {currentProgress >= 0
                        ? `${currentProgress} ${units} of ${totalProgress} done ${additionalInfo && `(${additionalInfo})`}`
                        : additionalInfo}
                </DialogContentText>
                <LinearProgress
                    sx={theme => ({marginTop: theme.spacing(3)})}
                    variant={currentProgress >= 0 ? 'determinate' : 'indeterminate'}
                    color="primary"
                    value={progressValue}
                />
                <Box sx={theme => ({marginTop: theme.spacing(1)})}>{currentProgress >= 0 ? `${progressValue}%` : ``}</Box>
            </DialogContent>
        </Dialog>
    );
};
