import { ExploitStateManager, MultitrackATRACRecovery } from "netmd-exploits"
import { NetMDFactoryInterface, NetMDInterface } from "netmd-js"

export const STATE: {
    interface: NetMDInterface | null,
    factory: NetMDFactoryInterface | null,
    exploitManager: ExploitStateManager | null,
    ripper: MultitrackATRACRecovery | null,
} = {
    interface: null,
    factory: null,
    exploitManager: null,
    ripper: null,
};
