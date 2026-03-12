import { HookRegistry } from "./infrastructure/registries/HookRegistry.js";
import { LibWrapperRegistry } from "./infrastructure/registries/LibWrapperRegistry.js";
import { Logger } from "./infrastructure/utils/Logger.js";

Hooks.once('init', () => {
    Logger.log("Initializing module.");

    HookRegistry.register();
    LibWrapperRegistry.register();
});

Hooks.once('ready', () => {
    Logger.log("Module is ready.");
});
