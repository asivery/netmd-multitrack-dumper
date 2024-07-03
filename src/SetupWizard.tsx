import { Button, StepLabel, Stepper, Step, StepContent, Box, Typography, FormControlLabel, Checkbox, Tooltip, CircularProgress, Select, MenuItem } from "@mui/material";
import { openNewDevice, openPairedDevice } from "netmd-js";
import { useCallback, useState } from "react";
import { STATE } from "./state";
import { AtracRecovery, CachedSectorBulkDownload, CachedSectorControlDownload, ConsoleLogger, ExploitStateManager, MultitrackATRACRecovery, getBestSuited, isCompatible } from "netmd-exploits";
import { useSavedState } from "./frontend-utils";

export function SetupWizard({ complete }: { complete: (exportMarkersAsCSV: 'no' | 'song' | 'session') => void }){
    const [activeStep, setActiveStep] = useState(0);
    const [deviceName, setDeviceName] = useState("");
    const [patchIncompatible, setPatchIncompatible] = useState(false);
    const [connectionLocked, setConnectionLocked] = useState(false);
    const [csvExport, setCSVExport] = useSavedState<'no' | 'song' | 'session'>('no', 'saveCSV');
    // Apple please fix your drivers...
    const [m1MacUsed, setM1MacUsed] = useSavedState(false, 'm1mac');

    const handleConnect = useCallback(async () => {
        try{
            setConnectionLocked(true);
            let connection = await openPairedDevice(navigator.usb);
            if(!connection) connection = await openNewDevice(navigator.usb);
            if(!connection) {
                setConnectionLocked(false);
                return;
            }
            const deviceName = connection.netMd.getDeviceName();
            setDeviceName(connection.netMd.getDeviceName());
            if(!((deviceName?.includes('Sony') &&
                (deviceName?.includes('MZ-N') || deviceName?.includes('MZ-S1') || deviceName.includes('MZ-RH') || deviceName.includes('MZ-DH10P'))) ||
                (deviceName?.includes('Aiwa') && deviceName?.includes('AM-NX')) ||
                deviceName?.includes('PCGA-MDN1')))
            {
                // This device does not support exploits
                setPatchIncompatible(true);
                setConnectionLocked(false);
                return;
            }
            STATE.interface = connection;
            STATE.factory = await connection.factory();

            // Try to initialize the exploits
            STATE.exploitManager = await ExploitStateManager.create(STATE.interface, STATE.factory, ConsoleLogger);

            // Try to load the exploit for dumping data off of multitrack discs.

            let rippingBackendConstructor = getBestSuited(AtracRecovery, STATE.exploitManager.device);
            if (m1MacUsed && rippingBackendConstructor === CachedSectorBulkDownload) {
                rippingBackendConstructor = CachedSectorControlDownload;
            }
            if(!rippingBackendConstructor || !isCompatible(MultitrackATRACRecovery, STATE.exploitManager.device)) {
                setPatchIncompatible(true);
                setConnectionLocked(false);
                return;
            }
            STATE.ripper = await STATE.exploitManager.require(MultitrackATRACRecovery, await STATE.exploitManager.require(rippingBackendConstructor));
            await STATE.ripper.prepareUnit();
            // All setup!

            setActiveStep(1);
        }catch(ex){
            window.alert("An error has occurred! Please see console for details");
            console.log(ex);
            setConnectionLocked(false);
        }
    }, [setDeviceName, setActiveStep, m1MacUsed]);

    const handleLoadLists = useCallback(() => {
        complete(csvExport);
    }, [complete, csvExport]);

    return (
        <>
            <Stepper activeStep={activeStep} orientation="vertical" sx={{marginLeft: 'auto', marginRight: 'auto'}}>
                <Step>
                    <StepLabel
                        error={patchIncompatible}
                        optional={patchIncompatible && <Typography variant="caption" color="red">Device incompatible!</Typography>}
                    >Connect to the device</StepLabel>
                    <StepContent>
                        <Typography>Make sure there's no data disc inside of your device</Typography>
                        <FormControlLabel
                                control={<Checkbox checked={m1MacUsed} onClick={() => setM1MacUsed(e => !e)} />}
                                label={<Tooltip title="Apple Silicon Macs have broken USB1 drivers.">
                                    <Typography>I am using an Apple Silicon Mac</Typography>
                                </Tooltip>}
                            />
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={handleConnect} disabled={connectionLocked}>
                                {connectionLocked ? <CircularProgress /> : "Connect"}
                            </Button>
                        </Box>
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>Insert the MD Data multitrack disc</StepLabel>
                    <StepContent>
                        <Typography>Connected to {deviceName}</Typography>
                        {patchIncompatible ? <Typography color="red">
                            The device you connected is not compatible with the patches required for this software to run.
                            </Typography> : 
                            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column' }}>
                                <FormControlLabel
                                    sx={{ margin: 0 }}
                                    labelPlacement="start"
                                    control={
                                        <Select sx={{ flexGrow: 1, ml: 2 }} value={csvExport} onChange={e => setCSVExport(e.target.value as any)}>
                                            <MenuItem value="no">Do not save</MenuItem>
                                            <MenuItem value="song">CSV files (one per song)</MenuItem>
                                            <MenuItem value="session">CSV files (one per session)</MenuItem>
                                        </Select>
                                    }
                                    label={<Typography>Save marker data to: </Typography>}
                                    />
                            </Box>
                        }
                        <Typography></Typography>
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" disabled={patchIncompatible} onClick={handleLoadLists}>
                                Continue
                            </Button>
                        </Box>
                    </StepContent>
                </Step>

            </Stepper>
        </>
    )
}
