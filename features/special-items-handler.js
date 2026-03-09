/**
 * Handles the special damage flow for the Cracked Arquebus, which involves a two-step dialog process.
 * @param {Item} item - The weapon item.
 * @returns {Promise<string|null>} A promise that resolves to the final damage formula string, or null if cancelled.
 */
async function handleCrackedArquebusDamage(item) {
    const actor = item.parent;

    const confirmedEffectRoll = await new Promise(resolve => {
        new Dialog({
            title: game.i18n.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Title"),
            content: `<p>${game.i18n.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Content")}</p>`,
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-dice-d6"></i>',
                    label: game.i18n.localize("PE.SpecialItems.CrackedArquebus.EffectRollDialog.Button"),
                    callback: () => resolve(true)
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PE.Dialog.CancelButton"),
                    callback: () => resolve(false)
                }
            },
            default: "confirm",
            close: () => resolve(false)
        }).render(true);
    });

    if (!confirmedEffectRoll) return null;
    
    const effectRoll = new Roll("1d6");
    await effectRoll.evaluate({ async: true });

    const effectRollFlavor = game.i18n.format("PE.SpecialItems.CrackedArquebus.ChatFlavor", { itemName: item.name });
    await effectRoll.toMessage({ 
        speaker: ChatMessage.getSpeaker({ actor }), 
        flavor: effectRollFlavor 
    });

    const damageMap = { 1: "2d4", 2: "2d6", 3: "2d8", 4: "2d10", 5: "2d12", 6: "2d20" };
    const damageFormula = damageMap[effectRoll.total];

    return new Promise(resolve => {
        const dialogContent = game.i18n.format("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Content", {
            effectResult: effectRoll.total,
            damageFormula: damageFormula
        });

        new Dialog({
            title: game.i18n.localize("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Title"),
            content: `<p>${dialogContent}</p>`,
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: game.i18n.localize("PE.SpecialItems.CrackedArquebus.DamageRollDialog.Button"),
                    callback: () => resolve(damageFormula) 
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PE.Dialog.CancelButton"),
                    callback: () => resolve(null) 
                }
            },
            default: "confirm",
            close: () => resolve(null)
        }).render(true);
    });
}

/**
 * A registry of special damage handling functions.
 */
export const specialDamageHandlers = {
   "Compendium.paranormal-enhancements.cursed.Item.PRqUmyFFgsiXgjOo": handleCrackedArquebusDamage
};