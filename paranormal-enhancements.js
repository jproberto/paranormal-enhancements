/*****************************************************
 * Paranormal Enhancements (for Ordem Paranormal)
 * Main entrypoint
 *****************************************************/

// Import only the handlers that are directly registered in the hooks
import { renderItemSheetHandler } from "./features/item-sheet-handler.js";
import { renderChatCardHandler } from "./features/chat-handler.js"; 
import { wrapRollAttack } from "./features/armament-handler.js";

// Log functions exported for use in other modules
export const log = (...args) => console.log("paranormal-enhancement |", ...args);
export const debug = (...args) => console.debug("paranormal-enhancement |", ...args);
export const warn = (...args) => console.warn("paranormal-enhancement |", ...args);
export const error = (...args) => console.error("paranormal-enhancement |", ...args);

/**
 * Main class to organize hooks and module initialization.
 */
class ParanormalEnhancement {
    static init() {
        log("Initializing module.");

        // Register hooks to handle sheet and chat message rendering
        Hooks.on("renderOrdemItemSheet", renderItemSheetHandler);
        Hooks.on("renderChatMessage", renderChatCardHandler);
    }

    static ready() {
        // Register the wrapper for the attack roll, checking if libWrapper is active.
        if (game.modules.get('lib-wrapper')?.active) {
            libWrapper.register(
                "paranormal-enhancements", 
                "CONFIG.Item.documentClass.prototype.rollAttack", 
                wrapRollAttack, 
                "MIXED"
            );
            log("libWrapper registration for rollAttack is complete.");
        } else {
            warn("libWrapper is not active. The rollAttack functionality will not work.");
        }
        
        log("Module is ready.");
    }
}

Hooks.on('init', () => {
    ParanormalEnhancement.init();
});

Hooks.on("ready", () => {
    ParanormalEnhancement.ready();
});