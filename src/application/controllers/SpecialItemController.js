import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";

export class SpecialItemController {
    /**
     * Handles the special damage flow for the Cracked Arquebus, which involves a two-step dialog process.
     * @param {Item} item - The weapon item.
     * @returns {Promise<string|null>} A promise that resolves to the final damage formula string, or null if cancelled.
     */
    static async handleCrackedArquebusDamage(item) {
        const actor = item.parent;

        const confirmedEffectRoll = await new Promise(resolve => {
            FoundryAdapter.renderDialog({
                title: FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Title"),
                content: `<p>${FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Content")}</p>`,
                buttons: {
                    confirm: {
                        icon: '<i class="fas fa-dice-d6"></i>',
                        label: FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Button"),
                        callback: () => resolve(true)
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: FoundryAdapter.localize("PE.Dialog.CancelButton"),
                        callback: () => resolve(false)
                    }
                },
                default: "confirm",
                close: () => resolve(false)
            });
        });

        if (!confirmedEffectRoll) return null;
        
        const effectRoll = FoundryAdapter.createRoll("1d6");
        await effectRoll.evaluate({ async: true });

        const effectRollFlavor = FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.ChatFlavor", { itemName: item.name });
        await effectRoll.toMessage({ 
            speaker: FoundryAdapter.getSpeaker({ actor }), 
            flavor: effectRollFlavor 
        });

        const damageMap = { 1: "2d4", 2: "2d6", 3: "2d8", 4: "2d10", 5: "2d12", 6: "2d20" };
        const damageFormula = damageMap[effectRoll.total];

        return new Promise(resolve => {
            const dialogContent = FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Content", {
                effectResult: effectRoll.total,
                damageFormula: damageFormula
            });

            FoundryAdapter.renderDialog({
                title: FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Title"),
                content: `<p>${dialogContent}</p>`,
                buttons: {
                    confirm: {
                        icon: '<i class="fas fa-dice-d20"></i>',
                        label: FoundryAdapter.localize("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Button"),
                        callback: () => resolve(damageFormula) 
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: FoundryAdapter.localize("PE.Dialog.CancelButton"),
                        callback: () => resolve(null) 
                    }
                },
                default: "confirm",
                close: () => resolve(null)
            });
        });
    }
}

/**
 * A registry of special damage handling functions.
 */
export const specialDamageHandlers = {
   "Compendium.paranormal-enhancements.cursed.Item.PRqUmyFFgsiXgjOo": SpecialItemController.handleCrackedArquebusDamage
};
