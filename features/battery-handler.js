const DICE_SEQUENCE = [20, 12, 10, 8, 6, 4];

/**
 * Checks the battery status of an item by rolling a progressively smaller die.
 * @param {Item} item The item document to check.
 */
export async function checkBattery(item) {
    const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
    
    // Default values for a new item
    const dieIndex = batteryData.dieIndex ?? 0;
    const uses = batteryData.usesOnDie ?? 0;
    const hasPower = batteryData.hasPower ?? true;

    if (!hasPower) {
        ui.notifications.warn(game.i18n.format("PE.BatteryAlreadyDead", { name: item.name }));
        return;
    }

    const currentDie = DICE_SEQUENCE[dieIndex];
    const roll = await new Roll(`1d${currentDie}`).roll({ async: true });

    // Send roll to chat for transparency
    roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        flavor: `Teste de Bateria para ${item.name} (1d${currentDie})`
    });

    if (roll.total === 1) {
        // --- Failure ---
        await item.setFlag("paranormal-enhancements", "battery.hasPower", false);
        ui.notifications.error(game.i18n.format("PE.BatteryCheckedFailure", { name: item.name }));
    } else {
        // --- Success ---
        let nextDieIndex = dieIndex;
        let nextUses = uses + 1;

        const isPotent = batteryData.isPotent ?? false;
        const usesNeeded = isPotent ? 2 : 1;

        if (nextUses >= usesNeeded && dieIndex < DICE_SEQUENCE.length - 1) {
            nextDieIndex++;
            nextUses = 0;
        }

        await item.setFlag("paranormal-enhancements", "battery", { 
            ...batteryData, // Preserve existing flags
            dieIndex: nextDieIndex, 
            usesOnDie: nextUses 
        });

        const nextDie = `d${DICE_SEQUENCE[nextDieIndex]}`;
        ui.notifications.info(game.i18n.format("PE.BatteryCheckedSuccess", { name: item.name, die: nextDie }));
    }
}

/**
 * Recharges an item's battery, resetting its consumption die to d20.
 * @param {Item} item The item document to recharge.
 */
export async function rechargeBattery(item) {
    const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};

    await item.setFlag("paranormal-enhancements", "battery", {
        ...batteryData,
        dieIndex: 0,
        usesOnDie: 0,
        hasPower: true
    });

    ui.notifications.info(game.i18n.format("PE.ItemRecharged", { name: item.name }));
}
