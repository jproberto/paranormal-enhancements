import { Logger } from "../../infrastructure/utils/Logger.js";
import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";

export class IlluminationController {
    /**
     * Toggles the light state for a given illumination item on an actor.
     * @param {string} actorId The ID of the actor.
     * @param {string} itemId The ID of the item.
     * @returns {Promise<boolean|null>} The new light state (true for on, false for off), or null if an error occurred.
     */
    static async toggleIllumination(actorId, itemId) {
        const actor = FoundryAdapter.getActor(actorId);
        if (!actor) {
            Logger.warn(`Actor not found for ID: ${actorId}`);
            return null;
        }

        const item = actor.items.get(itemId);
        if (!item) {
            Logger.error(`Item with ID ${itemId} not found on actor ${actor.name}`);
            return null;
        }

        // Check battery status if the item uses battery
        const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
        if (batteryData.uses && batteryData.hasPower === false) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.BatteryAlreadyDead", { name: item.name }));
            return false; // Cannot turn on if battery is dead
        }

        const lightData = item.getFlag("paranormal-enhancements", "light") || {};
        const newState = !lightData.isOn;

        await item.setFlag("paranormal-enhancements", "light.isOn", newState);

        const token = FoundryAdapter.getTokenForActor(actor.id);

        if (!token) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.NoToken"));
            return newState;
        }

        let lightUpdate = {};
        if (newState) { 
            const dim = lightData.dim ?? 0;
            const bright = lightData.bright ?? 0;

            if (dim === 0 && bright === 0) {
                Logger.warn(`Item ${item.name} has no light radius configured. Using default values.`);
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

    /**
     * Turns off the light for a given item, typically called when battery dies.
     * @param {Item} item The item document.
     */
    static async turnOffLight(item) {
        const lightData = item.getFlag("paranormal-enhancements", "light") || {};
        
        if (!lightData.isOn) return; // Already off

        await item.setFlag("paranormal-enhancements", "light.isOn", false);

        const actor = item.actor;
        if (!actor) return;

        const token = FoundryAdapter.getTokenForActor(actor.id);

        if (token) {
            await token.document.update({
                light: {
                    dim: 0,
                    bright: 0,
                    angle: 360,
                    color: "#000000",
                    animation: { type: "", speed: 5, intensity: 5 }
                }
            });
        }
    }
}
