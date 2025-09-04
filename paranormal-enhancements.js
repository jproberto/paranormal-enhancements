import { renderItemSheetHandler } from "./features/item-sheet-handler.js";
import { renderChatCardHandler } from "./features/chat-handler.js";
import { wrapRollAttack, wrapRollDamage } from "./features/armament-handler.js";

export const log = (...args) => console.log("paranormal-enhancement |", ...args);
export const warn = (...args) => console.warn("paranormal-enhancement |", ...args);
export const error = (...args) => console.error("paranormal-enhancement |", ...args);

Hooks.once('init', () => {
    log("Initializing module.");

    // Check for libWrapper module
    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        warn("The 'lib-wrapper' module is not active. Some features may not work correctly.");
    }

    // Register hooks
    Hooks.on("renderOrdemItemSheet", renderItemSheetHandler);
    Hooks.on("renderChatMessage", renderChatCardHandler);

    // Register libWrapper mixins if active
    if (game.modules.get('lib-wrapper')?.active) {
        libWrapper.register(
            "paranormal-enhancements", 
            "CONFIG.Item.documentClass.prototype.rollAttack", 
            wrapRollAttack, 
            "MIXED"
        );
        libWrapper.register(
            "paranormal-enhancements", 
            "CONFIG.Item.documentClass.prototype.rollDamage", 
            wrapRollDamage, 
            "MIXED"
        );
    }
});

Hooks.once('ready', () => {
    log("Module is ready.");
});

