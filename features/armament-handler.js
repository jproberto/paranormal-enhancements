import { log } from "../paranormal-enhancements.js";

/**
 * Handles the logic for reloading a ranged weapon.
 * @param {Item} weapon The weapon item to reload.
 */
export async function reloadWeapon(weapon) {
    const actor = weapon.actor;
    if (!actor) return;

    const ammoData = weapon.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) return;

    const needed = ammoData.max - ammoData.current;
    if (needed <= 0) {
        return ui.notifications.info(game.i18n.localize("PE.AlreadyLoaded"));
    }

    const ammunitionType = weapon.system.types.ammunitionType;
    const localizedAmmoType = game.i18n.localize(CONFIG.op.dropdownWeaponAmmunition[ammunitionType]);
    
    const ammoItem = actor.items.find(i => 
        i.getFlag("paranormal-enhancements", "itemType") === "ammunition" &&
        i.name.includes(localizedAmmoType)
    );

    if (!ammoItem) {
        return ui.notifications.warn(game.i18n.format("PE.NoAmmoItem", { ammoType: localizedAmmoType }));
    }

    const available = ammoItem.getFlag("paranormal-enhancements", "ammoQuantity") ?? 0;
    if (available <= 0) {
        return ui.notifications.warn(game.i18n.localize("PE.NoAmmoAvailable"));
    }

    const toLoad = Math.min(needed, available);
    await weapon.setFlag("paranormal-enhancements", "ammo.current", ammoData.current + toLoad);
    await ammoItem.setFlag("paranormal-enhancements", "ammoQuantity", available - toLoad);

    ui.notifications.info(game.i18n.format("PE.Reloaded", {
        name: weapon.name,
        amount: toLoad,
        ammoType: localizedAmmoType
    }));
}

/**
 * Wraps the rollAttack method to check for ammo on ranged weapons.
 */
export async function wrapRollAttack(wrapped, ...args) {
    const item = this;
    const isRangedWeapon = item.system.types?.rangeType?.name === "ranged";

    if (item.type !== "armament" || !isRangedWeapon) {
        return wrapped(...args);
    }
    
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) {
        return wrapped(...args);
    }
    
    const ammunitionType = item.system.types.ammunitionType;
    if (ammoData.current <= 0 || !ammunitionType) {
        ui.notifications.warn(game.i18n.format("PE.NoAmmo", { name: item.name }));
        return; 
    }

    log("Consuming ammo and proceeding with roll.");
    await item.setFlag("paranormal-enhancements", "ammo.current", ammoData.current - 1);
    
    return wrapped(...args);
}


/**
 * Wraps the rollDamage method to implement custom critical damage calculation.
 * @param {Function} wrapped The original rollDamage function.
 * @param {object} options   Options passed to the original function.
 * @returns {Promise<Roll|undefined>} The resulting roll, or undefined if the original function is bypassed.
 */
export async function wrapRollDamage(wrapped, options = {}) {
    const item = this;
    const critical = options.critical || false;
    
    if (!critical.isCritical) {
        return wrapped(options);
    }

    log(`Custom critical damage for ${item.name}`);

    const damage = item.system.formulas.damage;
    const baseFormula = damage.formula; 

    // 1. Calculate the maximized damage value
    const maxRoll = new Roll(baseFormula);
    await maxRoll.evaluate({maximize: true, async: true});
    const maximizedDamageValue = maxRoll.total;
    
    // 2. Determine the remaining critical rolls based on the multiplier
    const multiplier = critical.multiplier || 2; // Default to x2 if not specified
    const remainingMultiplier = multiplier - 1;

    // 3. Collect other parts of the formula (attributes, other bonuses)
    const otherParts = [];
    if (damage.attr && item.parent.system.attributes[damage.attr]) {
        otherParts.push(item.parent.system.attributes[damage.attr].value);
    }
    damage.parts.forEach(part => otherParts.push(`(${part[0] || 0})`));

    // 4. Construct a single, complete formula for the roll engine
    const formulaParts = [
        `${maximizedDamageValue}[Dano Máximo]`
    ];

    // Add the remaining critical dice rolls if multiplier is > 1
    if (remainingMultiplier > 0) {
        const [diceCountStr, diceFace] = baseFormula.split('d');
        const diceCount = parseInt(diceCountStr) || 1;
        const criticalDiceFormula = `${diceCount * remainingMultiplier}d${diceFace}`;
        formulaParts.push(`${criticalDiceFormula}[Crítico]`);
    }

    if (otherParts.length > 0) {
        formulaParts.push(...otherParts);
    }
    
    const finalFormula = formulaParts.join(' + ');
    const flavorText = `Dano Crítico com ${item.name}!`;
    
    // 5. Create and execute the final roll
    const finalRoll = await new Roll(finalFormula).roll({async: true});

    // 6. Send the complete roll object to the chat
    finalRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        flavor: flavorText,
        rollMode: game.settings.get('core', 'rollMode'),
    });

    return finalRoll;
}

