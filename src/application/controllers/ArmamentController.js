import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";
import { Logger } from "../../infrastructure/utils/Logger.js";
import { ArmamentService } from "../../core/services/ArmamentService.js";

export class ArmamentController {
    
    /**
     * Handles the logic for reloading a ranged weapon.
     * @param {Item} weapon The weapon item to reload.
     */
    static async reloadWeapon(weapon) {
        Logger.log("estou no reloadWeapon");
        const actor = weapon.actor;
        if (!actor) return;

        const ammoData = weapon.getFlag("paranormal-enhancements", "ammo");
        if (!ammoData) return;

        const needed = ammoData.max - ammoData.current;
        if (needed <= 0) {
            FoundryAdapter.notifyInfo(FoundryAdapter.localize("PE.AlreadyLoaded"));
            return;
        }

        const ammunitionType = weapon.system.types.ammunitionType;
        const localizedAmmoType = FoundryAdapter.localize(CONFIG.op.dropdownWeaponAmmunition[ammunitionType]);
        
        const ammoItem = actor.items.find(i => 
            i.getFlag("paranormal-enhancements", "itemType") === "ammunition" &&
            i.name.includes(localizedAmmoType)
        );

        if (!ammoItem) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.NoAmmoItem", { ammoType: localizedAmmoType }));
            return;
        }

        const available = ammoItem.getFlag("paranormal-enhancements", "ammoQuantity") ?? 0;
        if (available <= 0) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.NoAmmoAvailable"));
            return;
        }

        Logger.log(`Reloading ${weapon.name}. Current: ${ammoData.current}, Max: ${ammoData.max}, Available: ${available}`);

        const toLoad = ArmamentService.calculateReloadAmount(ammoData.current, ammoData.max, available);
        
        Logger.log(`Amount to load: ${toLoad}`);

        // Update the entire ammo object to ensure consistency
        const newAmmoData = {
            ...ammoData,
            current: ammoData.current + toLoad
        };

        await weapon.setFlag("paranormal-enhancements", "ammo", newAmmoData);
        await ammoItem.setFlag("paranormal-enhancements", "ammoQuantity", available - toLoad);

        FoundryAdapter.notifyInfo(FoundryAdapter.localize("PE.Reloaded", {
            name: weapon.name,
            amount: toLoad,
            ammoType: localizedAmmoType
        }));
    }

    /**
     * Initiates a burst attack roll.
     * @param {Item} item The weapon item document.
     */
    static async rollBurstAttack(item) {
        const ammoData = item.getFlag("paranormal-enhancements", "ammo");
        if (!ammoData) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.Warnings.NoAmmoSystem"));
            return;
        }

        const burstAmmoCost = 10;
        if (ammoData.current < burstAmmoCost) {
            const warning = FoundryAdapter.localize("PE.Warnings.NoAmmoForBurst", { 
                name: item.name, 
                cost: burstAmmoCost, 
                current: ammoData.current 
            });
            FoundryAdapter.notifyWarn(warning);
            return;
        }

        const newAmmoData = { ...ammoData, current: ammoData.current - burstAmmoCost };
        await item.setFlag("paranormal-enhancements", "ammo", newAmmoData);
        
        const rollOptions = {
            flavor: ` (${FoundryAdapter.localize("PE.BurstAttack")})`,
            isBurst: true
        };
        
        return item.rollAttack(rollOptions);
    }

    /**
     * Initiates a burst damage roll.
     * @param {Item} item The weapon item.
     * @param {ChatMessage} message The chat message document that originated the click.
     * @param {Event} event The original click event.
     */
    static rollBurstDamage(item, message, event) {
        if (typeof item.rollDamage !== 'function') return;

        const finalFormula = ArmamentService.getBurstDamageFormula(item.system.formulas.damage?.formula);
        
        const rollOptions = {
            customFormula: finalFormula,
            event: event,
            flavor: ` (${FoundryAdapter.localize("PE.Burst")})`,
        };

        rollOptions.critical = item.system.critical.isCritical
            ? { isCritical: true, multiplier: item.system.critical.multiplier || 2 }
            : { isCritical: false };
        
        item.rollDamage(rollOptions);
    }
}
