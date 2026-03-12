/**
 * Adapter for Foundry VTT global objects and functions.
 * This class isolates the core logic from direct dependency on the Foundry API,
 * facilitating testing and maintenance.
 */
export class FoundryAdapter {
    /**
     * Wraps game.i18n.localize and game.i18n.format.
     * @param {string} key The localization key.
     * @param {object} [data] Optional data for formatting.
     * @returns {string} The localized string.
     */
    static localize(key, data) {
        if (data && Object.keys(data).length > 0) {
            return game.i18n.format(key, data);
        }
        return game.i18n.localize(key);
    }

    /**
     * Wraps ui.notifications.info.
     * @param {string} message The message to display.
     */
    static notifyInfo(message) {
        ui.notifications.info(message);
    }

    /**
     * Wraps ui.notifications.warn.
     * @param {string} message The message to display.
     */
    static notifyWarn(message) {
        ui.notifications.warn(message);
    }

    /**
     * Wraps ui.notifications.error.
     * @param {string} message The message to display.
     */
    static notifyError(message) {
        ui.notifications.error(message);
    }

    /**
     * Wraps game.actors.get.
     * @param {string} id The actor ID.
     * @returns {Actor|undefined} The actor document.
     */
    static getActor(id) {
        return game.actors.get(id);
    }

    /**
     * Wraps ChatMessage.create.
     * @param {object} data The chat message data.
     * @returns {Promise<ChatMessage>} The created chat message.
     */
    static async createChatMessage(data) {
        return ChatMessage.create(data);
    }

    /**
     * Wraps ChatMessage.getSpeakerActor.
     * @param {object} options Options for the speaker.
     * @returns {object} The speaker object.
     */
    static getSpeakerActor(speaker) {
        return ChatMessage.getSpeakerActor(speaker);
    }

    /**
     * Wraps Roll.create (or new Roll).
     * @param {string} formula The roll formula.
     * @param {object} [data] Optional data for the roll.
     * @returns {Roll} The roll instance.
     */
    static createRoll(formula, data) {
        return new Roll(formula, data);
    }

    /**
     * Finds a token for a given actor ID, prioritizing controlled tokens.
     * @param {string} actorId The actor ID.
     * @returns {Token|undefined} The token object (placeable).
     */
    static getTokenForActor(actorId) {
        let token = canvas.tokens.controlled.find(t => t.document.actorId === actorId);
        if (!token) {
            token = canvas.tokens.placeables.find(t => t.document.actorId === actorId);
        }
        return token;
    }

    /**
     * Wraps Dialog rendering.
     * @param {object} data Dialog data.
     * @param {object} options Dialog options.
     * @returns {Dialog} The dialog instance.
     */
    static renderDialog(data, options) {
        return new Dialog(data, options).render(true);
    }
    
    /**
     * Gets a setting value.
     * @param {string} module The module namespace.
     * @param {string} key The setting key.
     * @returns {*} The setting value.
     */
    static getSetting(module, key) {
        return game.settings.get(module, key);
    }

    /**
     * Calls a Foundry hook.
     * @param {string} hook The hook name.
     * @param {...*} args Arguments to pass to the hook.
     */
    static callHook(hook, ...args) {
        Hooks.callAll(hook, ...args);
    }

    /**
     * Registers a Foundry hook listener.
     * @param {string} hook The hook name.
     * @param {Function} callback The callback function.
     */
    static registerHook(hook, callback) {
        Hooks.on(hook, callback);
    }
}
