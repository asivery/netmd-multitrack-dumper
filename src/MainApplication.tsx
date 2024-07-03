import { Refresh } from "@mui/icons-material";
import { Box, Button, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow as _TableRow, Typography, styled, lighten, alpha, Tooltip } from "@mui/material";
import { readUTOCSector } from "netmd-js";
import { DiscAddress, ToC, getTitleByTrackNumber, getTrackInfo, parseTOC } from "netmd-tocmanip";
import { useCallback, useEffect, useState } from "react";
import { STATE } from "./state";
import { DownloadDialog } from "./DownloadDialog";
import { downloadBlob } from "./frontend-utils";

const TableRow = styled(_TableRow)(({theme}) => ({
    "&.Mui-selected": theme.palette.mode === 'light' ? {
        backgroundColor: lighten(theme.palette.secondary.main, 0.85),
        "&:hover": {
            backgroundColor: lighten(theme.palette.secondary.main, 0.85),
        }
    } : {
        backgroundColor: alpha(theme.palette.secondary.main, 0.16),
        "&:hover": {
            backgroundColor: alpha(theme.palette.secondary.main, 0.16),
        }
    },
    "&:hover": {
        cursor: 'pointer',
        backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))",
    }
}));
const IndexCell = styled(TableCell)(({theme}) => 
    ({
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    })
);

const FormatBadge = styled('span')(({theme}) => ({
    color: 'white',
    height: theme.spacing(2.5),
    zIndex: 1,
    flexWrap: 'wrap',
    fontSize: '0.75rem',
    minWidth: theme.spacing(2.5),
    boxSizing: 'border-box',
    alignItems: 'center',
    fontWeight: 'bold',
    alignContent: 'center',
    borderRadius: '10px',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: theme.palette.primary.main,
    position: 'static',
    display: 'inline-flex',
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
    verticalAlign: 'middle',
    width: theme.spacing(4.5),
    marginRight: theme.spacing(0.5),
    lineHeight: 'normal',
}));

interface Track {
    type: 'SP' | 'SPM' | 'LP2' | 'LP4' | 'MT4' | 'MT8' | '???',
    title: string,
    duration: number,
    markers: Marker[],
}

interface Marker {
    trackIndex: number,
    trackName: string,
    markerNumber: number,
    markerTimestampSecondsMilliseconds: number,
}

function formatTimeFromSeconds(secs: number): string {
    secs = Math.ceil(secs);
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

function csvivyMarkers(fileName: string, markers: Marker[]) {
    const rows: string[][] = [["TRACK INDEX", "TRACK NAME", "MARKER NUMBER", "MARKER TIMESTAMP (ms)"]];
    for(let marker of markers) {
        rows.push([
            marker.trackIndex + '',
            marker.trackName,
            marker.markerNumber + '',
            marker.markerTimestampSecondsMilliseconds + '',
        ]);

        const csvDocument = rows.map(e => e.map(q => q.toString().replace(/,/g, '\\,')).join(',')).join('\n');

        downloadBlob(new Blob([csvDocument]), fileName);
    }
}

export function MainApplication( { csvExport }: { csvExport: 'no' | 'song' | 'session' }) {
    const [toc, setToC] = useState<ToC | null>(null);
    const [loading, setLoading] = useState(false);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [discName, setDiscName] = useState("");
    const [selected, setSelected] = useState<number[]>([]);
    const [downloadDialogVisible, setDownloadDialogVisible] = useState(false);
    const [progressProps, setProgresProps] = useState<{
        units: string, currentProgress: number, totalProgress: number, actionName: string, additionalInfo: string
    }>({
        units: 'sectors',
        currentProgress: -1,
        totalProgress: 0,
        actionName: '',
        additionalInfo: '',
    });

    const reloadToC = useCallback(async () => {
        const discAddressToGr = (da: DiscAddress) => da.group + (da.sector + da.cluster * 32) * 11;
        setLoading(true);
        // Fetch the ToC

        const tocS0 = await readUTOCSector(STATE.factory!, 0);
        const tocS1 = await readUTOCSector(STATE.factory!, 1);
        const toc = parseTOC(tocS0, tocS1);
        setToC(toc);
        STATE.ripper!.setCachedToC(toc);

        const discTitle = getTitleByTrackNumber(toc, 0).replace("\0", "");
        const tracks: Track[] = [];
        for(let i = 0; i<toc.nTracks; i++) {
            const trackData = getTrackInfo(toc, i + 1);
            const markers: Marker[] = [];
            let totalSoundGroups = 0;
            let markerTime = 0, j = 0;
            for(const frag of trackData.ranges) {
                const groupCount = discAddressToGr(frag.end) - discAddressToGr(frag.start);
                totalSoundGroups += groupCount;
                markerTime += Math.floor(groupCount * 11.6);
                markers.push({
                    trackIndex: i + 1,
                    trackName: trackData.title?.replace("\0", "") ?? '',
                    markerNumber: j,
                    markerTimestampSecondsMilliseconds: markerTime,
                });
                j++
            }
            let duration = totalSoundGroups * 0.0116;
            let type = "???";
            if(trackData.ranges.length) {
                const rootFragment = trackData.ranges[0];
                let sM;
                switch(rootFragment.mode) {
                    case 200:
                        type = 'MT4';
                        duration /= 4;
                        break;
                    case 201:
                        type = 'MT8';
                        duration /= 8;
                        break;
                    default:
                        sM = (rootFragment.mode >> 1) & 0b11;
                        type = ['LP4', 'LP2', 'SPM', 'SP'][sM];
                        duration /= [0.5, 1, 2, 2][sM];
                        break;
                }
            }
            tracks.push({
                title: trackData.title?.replace("\0", "") ?? '',
                duration,
                type: type as any,
                markers,
            });
        }
        setTracks(tracks);
        setDiscName(discTitle);
        setLoading(false);
    }, [setToC, setLoading, setTracks, setDiscName]);

    // Initial loader
    useEffect(() => {
        if(toc === null) {
            reloadToC();
        }
    }, [toc, reloadToC]);

    // Download handler
    const handleDownload = useCallback(async () => {
        setDownloadDialogVisible(true);
        // Start the process
        const newProgress: typeof progressProps = {
            units: 'sectors',
            currentProgress: -1,
            totalProgress: 0,
            actionName: '',
            additionalInfo: '',
        };
        const updateProgress = () => setProgresProps({...newProgress});
        updateProgress();

        let timeout: ReturnType<typeof setTimeout> | null = null;
        const perTrackProgressUpdater = ({ total, read, action, sector }: { read: number; total: number; action: 'READ' | 'SEEK' | 'CHUNK'; sector?: string }) => {
            if (timeout !== null) clearTimeout(timeout);
            timeout = setTimeout(() => {
                newProgress.currentProgress = Math.min(read, total);
                newProgress.totalProgress = total;
                newProgress.additionalInfo = {
                    SEEK: 'Seeking...',
                    CHUNK: 'Receiving...',
                    READ: `Reading sector ${sector!}...`,
                }[action];

                updateProgress();
            }, 100);
        }

        for(const trackIdx of selected) {
            try{
                const track = tracks[trackIdx];
                if(timeout !== null) clearTimeout(timeout);
                newProgress.actionName = `Transferring track ${trackIdx + 1}`;
                newProgress.currentProgress = -1;
                newProgress.totalProgress = 0;
                updateProgress();
                let func;
                if(track.type.startsWith("MT")) {
                    // Use multitrack code
                    func = STATE.ripper!.downloadMultitrackTrack.bind(STATE.ripper!);
                } else {
                    // Use backend directly
                    func = STATE.ripper!.backend!.downloadTrack.bind(STATE.ripper!.backend!);
                }
                let bsCounter = 0;
                const contents = await func(trackIdx, perTrackProgressUpdater, {
                    handleBadSector: async (address: string, count: number, seconds: number) => {
                        console.log(`Bad sector encountered at address ${address}, count ${count} (${seconds} sec.)`);
                        if(bsCounter >= 3) return 'abort';
                        bsCounter++;
                        return 'reload';
                    }
                });
                const extension = {
                    SP: 'aea',
                    SPM: 'aea',
                    MT4: 'aea',
                    MT8: 'aea',
                    LP2: 'wav',
                    LP4: 'wav',

                    '???': 'bin',
                }[track.type];

                const fileName = `${trackIdx+1}. ${track.title ?? `Untitled ${track.type} track`}.${extension}`;

                downloadBlob(new Blob([contents]), fileName);
                if(csvExport === 'song') {
                    const name = `${discName || 'Unnamed disc'} - ${trackIdx}. ${track.title || 'Unnamed song'} - Markers.csv`;
                    csvivyMarkers(name, track.markers);
                }
            }catch(ex) {
                window.alert(`Error while ripping track ${trackIdx + 1}\n${ex}`);
                console.log(`Error while ripping track ${trackIdx + 1}.`);
                console.log(ex);
            }
        }
        if(csvExport === 'session') {
            const name = `${discName || 'Unnamed disc'} - Markers.csv`;
            csvivyMarkers(name, selected.flatMap(e => tracks[e].markers));
        }
        setDownloadDialogVisible(false);
    }, [setDownloadDialogVisible, setProgresProps, selected, tracks, csvExport, discName]);
    return <>
        <Box sx={{position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                <Typography variant="h5" fontWeight='bold'>{discName || "Unnamed disc"}</Typography>
                <Button onClick={reloadToC}><Refresh /></Button>
            </Box>
            <Box sx={{flexGrow: 1, minHeight: 0, overflowY: 'auto'}}>
                <Table sx={{overflow: 'auto', minHeight: 0}} size="small">
                    <TableHead>
                        <IndexCell>#</IndexCell>
                        <TableCell>Title</TableCell>
                        <TableCell align="right">Duration</TableCell>
                    </TableHead>
                    <TableBody>
                        {tracks.map((t, i) => 
                            <TableRow key={`row-${i}`} selected={selected.includes(i)} onClick={() => setSelected(old => old.includes(i) ? old.filter(e => e !== i) : [...old, i].sort())}>
                                <IndexCell>{i + 1}</IndexCell>
                                <TableCell>{t.title || 'Unnamed track'}</TableCell>
                                <TableCell align="right" sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'right' }}>
                                    {t.markers.length > 1 &&
                                        <Typography
                                            sx={theme => ({
                                                display: 'inline',
                                                color: theme.palette.grey[600],
                                                fontSize: 10,
                                                verticalAlign: 'middle',
                                                textWrap: 'nowrap',
                                                mr: theme.spacing(1),
                                            })}>
                                            {t.markers.length} MARKERS
                                        </Typography>
                                    }
                                    <FormatBadge>{t.type}</FormatBadge>
                                    <span style={{verticalAlign: 'middle'}}>{formatTimeFromSeconds(t.duration)}</span>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
            <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                <Button onClick={() => selected.length ? setSelected([]) : setSelected(Array(tracks.length).fill(0).map((_, i) => i))}>{selected.length === 0 ? 'Select' : 'Deselect'} All</Button>
                {selected.length === 0 ? (
                    <Tooltip title="Select the tracks to download by clicking on them">
                        <span>
                            <Button disabled>Download selected</Button>
                        </span>
                    </Tooltip>
                ) : (
                    <Button onClick={handleDownload}>Download selected</Button>
                )}
            </Box>
            {loading &&
                <Box sx={{backdropFilter: 'blur(2px)', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', pointerEvents: 'all'}}>
                    <CircularProgress sx={{margin: 'auto'}}/>
                </Box>
            }
        </Box>

        <DownloadDialog visible={downloadDialogVisible} {...progressProps} />
    </>;
}
