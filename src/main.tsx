import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Assembler } from 'netmd-exploits';
import { STATE } from './state.ts';

Assembler.setWASMUrl(`${import.meta.env.BASE_URL}assembler.wasm`);

if(navigator.usb) {
    navigator.usb.addEventListener('disconnect', evt => {
        if(STATE.interface?.netMd.isDeviceConnected(evt.device)) {
            window.location.reload();
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
