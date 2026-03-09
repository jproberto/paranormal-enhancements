import { renderItemSheetHandler } from "./features/item-sheet-handler.js";
import { renderChatCardHandler, handleRitualPreCreate } from "./features/chat-handler.js";
import { wrapRollAttack, wrapRollDamage } from "./features/armament-handler.js";
import { registerCurseHooks } from "./features/curse-handler.js";
import { registerRitualHandlers, _applyEffectAsGM, _removeEffectsAsGM } from "./features/ritual-handler.js";
import { ActiveRitualsApp } from "./features/rituals/ritual-ui.js";
import { ArmaAtroz } from "./features/rituals/arma-atroz.js";

// Helpers
export const log = (...args) => console.log("paranormal-enhancement |", ...args);
export const warn = (...args) => console.warn("paranormal-enhancement |", ...args);
export const error = (...args) => console.error("paranormal-enhancement |", ...args);

// Globals
globalThis.paranormalSocket = null;


// Hooks de inicialização
Hooks.once('init', () => {
    log("Initializing module.");

    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        warn("The 'lib-wrapper' module is not active. Some features may not work correctly.");
    }

    // Register hooks
    Hooks.on("renderOrdemItemSheet", renderItemSheetHandler);
    Hooks.on("renderChatMessage", renderChatCardHandler);
    Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
        return handleRitualPreCreate(message, data, options, userId);
    });

    registerCurseHooks();
    registerRitualHandlers();

    // Register libWrapper mixins if active
    if (game.modules.get('lib-wrapper')?.active) {
        registerRollWrappers();
    }   
});

Hooks.once('setup', () => {
    const lib = game.modules.get('socketlib');
    if (!lib?.active) return error("SocketLib não encontrado ou inativo.");
    
    globalThis.paranormalSocket = socketlib.registerModule("paranormal-enhancements");

    globalThis.paranormalSocket.register("applyEffectAsGM", _applyEffectAsGM);
    globalThis.paranormalSocket.register("removeEffectsAsGM", _removeEffectsAsGM);

    log("SocketLib registrado.")
    log("Setup done.")
});

Hooks.once('ready', () => {
    log("Module is ready.");
});

// Funções de registro
function registerRollWrappers() {
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

Hooks.on("ordemparanormal.rollFormula", async (item, roll) => {
  if (item?.getFlag("itemacro", "macro") && item.executeMacro) {
    await item.executeMacro();
  }
});

Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControls = controls.tokens;

    if (tokenControls?.tools) {
        const toolsList = Array.isArray(tokenControls.tools) 
            ? tokenControls.tools 
            : Object.values(tokenControls.tools);

        if (!toolsList.some(t => t.name === "pe-active-rituals")) {
            const toolData = {
                name: "pe-active-rituals",
                title: "Gerenciar Rituais Ativos",
                icon: "fas fa-hand-sparkles",
                toggle: true,
                onClick: () => {
                    const app = new ActiveRitualsApp();
                    app.render(true);
                },
                button: true
            };

            if (Array.isArray(tokenControls.tools)) {
                tokenControls.tools.push(toolData);
            } else {
                tokenControls.tools["pe-active-rituals"] = toolData;
            }
        }
    }
});