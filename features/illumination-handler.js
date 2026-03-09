import { log, warn, error } from "../paranormal-enhancements.js";

/**
 * Toggles the light state for a given illumination item on an actor.
 * @param {string} actorId The ID of the actor.
 * @param {string} itemId The ID of the item.
 * @returns {Promise<boolean|null>} The new light state (true for on, false for off), or null if an error occurred.
 */
export async function toggleIllumination(actorId, itemId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
        warn(`Actor not found for ID: ${actorId}`);
        return null;
    }

    const item = actor.items.get(itemId);
    if (!item) {
        error(`Item with ID ${itemId} not found on actor ${actor.name}`);
        return null;
    }

    const lightData = item.getFlag("paranormal-enhancements", "light") || {};
    const newState = !lightData.isOn;

    await item.setFlag("paranormal-enhancements", "light.isOn", newState);

    let token = canvas.tokens.controlled.find(t => t.document.actorId === actor.id);
    if (!token) {
        token = canvas.tokens.placeables.find(t => t.document.actorId === actor.id);
    }

    if (!token) {
        ui.notifications.warn(game.i18n.localize("PE.NoToken"));
        return newState;
    }

    let lightUpdate = {};
    if (newState) { 
        const dim = lightData.dim ?? 0;
        const bright = lightData.bright ?? 0;

        if (dim === 0 && bright === 0) {
            warn(`Item ${item.name} has no light radius configured. Using default values.`);
            lightUpdate = {
                dim: 6,
                bright: 3,
                color: lightData.color || "#ffffff",
                angle: lightData.angle || 360,
                animation: { type: "torch", speed: 2, intensity: 2 },
            };
        } else {
            lightUpdate = {
                dim: dim,
                bright: bright,
                color: lightData.color || "#ffffff",
                angle: lightData.angle || 360,
                animation: { type: "torch", speed: 2, intensity: 2 },
            };
        }
    } else { 
        lightUpdate = {
            dim: 0,
            bright: 0,
            angle: 360,
            color: "#000000",
            animation: { type: "", speed: 5, intensity: 5 }
        };
    }
    
    await token.document.update({ light: lightUpdate });

    return newState;
}
