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
    
    // Find ammunition item in the actor's inventory
    const ammoItem = actor.items.find(i => 
        i.getFlag("paranormal-enhancements", "itemType") === "ammunition" &&
        i.name.includes(localizedAmmoType) // This might need adjustment
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
    const ammunitionType = item.system.types.ammunitionType;
    
    if (!ammoData) {
        return wrapped(...args);
    }
    
    if (ammoData.current <= 0 || !ammunitionType) {
        log("No ammo, preventing roll.");
        ui.notifications.warn(game.i18n.format("PE.NoAmmo", { name: item.name }));
        return false;
    }

    log("Consuming ammo and proceeding with roll.");
    await item.setFlag("paranormal-enhancements", "ammo.current", ammoData.current - 1);
    
    return wrapped(...args);
}