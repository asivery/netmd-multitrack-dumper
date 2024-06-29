import { darkTheme, lightTheme } from './themes';
import { Box, CssBaseline, Paper, ThemeProvider, Typography } from '@mui/material'
import { forAnyDesktop, forWideDesktop, useThemeDetector } from './frontend-utils'
import { MainApplication } from './MainApplication';
import { useState } from 'react';
import { SetupWizard } from './SetupWizard';

function App() {
  const isSystemDarkTheme = useThemeDetector();
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const [csvExport, setCSVExport] = useState<'no' | 'song' | 'session'>('no');

  return (
    <ThemeProvider theme={isSystemDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={theme => ({
        width: 'auto',
        height: '100%',
        [forAnyDesktop(theme)]: {
            width: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        [forWideDesktop(theme)]: {
            width: 700,
        },
      })}>
        <Paper sx={theme => ({
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: theme.spacing(2),
          height: 'calc(100% - 20px)',
          [forAnyDesktop(theme)]: {
              marginTop: theme.spacing(2),
              marginBottom: theme.spacing(1),
              padding: theme.spacing(3),
              height: 600,
          },
          [forWideDesktop(theme)]: {
              height: 700,
          },
        })}>
          {navigator.usb ? 
            <>
              {!hasLoadedList ? <SetupWizard complete={(csvExport) => {
                setHasLoadedList(true);
                setCSVExport(csvExport);
              }} /> : <MainApplication csvExport={csvExport} />}
            </> :
              <Typography sx={{margin: 'auto'}}>This browser does not support WebUSB.</Typography>
          }
        </Paper>
      </Box>
    </ThemeProvider>
  )
}

export default App
