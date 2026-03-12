import { HookRegistry } from "./infrastructure/registries/HookRegistry.js";
import { LibWrapperRegistry } from "./infrastructure/registries/LibWrapperRegistry.js";
import { SocketProvider } from "./infrastructure/services/SocketProvider.js";
import { Logger } from "./infrastructure/utils/Logger.js";

// Globals
globalThis.paranormalSocket = null;

Hooks.once('init', () => {
    Logger.log("Initializing module.");

    HookRegistry.register();
    LibWrapperRegistry.register();
});

Hooks.once('setup', () => {
    SocketProvider.init();
    Logger.log("Setup done.");
});

Hooks.once('ready', () => {
    Logger.log("Module is ready.");
});
