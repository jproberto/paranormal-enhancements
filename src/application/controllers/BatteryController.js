import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";
import { BatteryService } from "../../core/services/BatteryService.js";

export class BatteryController {
    /**
     * Checks the battery status of an item by rolling a progressively smaller die.
     * @param {Item} item The item document to check.
     */
    static async checkBattery(item) {
        const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
        
        // Default values for a new item
        const dieIndex = batteryData.dieIndex ?? 0;
        const uses = batteryData.usesOnDie ?? 0;
        const hasPower = batteryData.hasPower ?? true;

        if (!hasPower) {
            FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.BatteryAlreadyDead", { name: item.name }));
            return;
        }

        const currentDieFace = BatteryService.getDieFace(dieIndex);
        const roll = await FoundryAdapter.createRoll(`1d${currentDieFace}`).roll({ async: true });

        // Send roll to chat for transparency
        roll.toMessage({
            speaker: item.actor,
            flavor: `Teste de Bateria para ${item.name} (1d${currentDieFace})`
        });

        const isPotent = batteryData.isPotent ?? false;
        const nextState = BatteryService.calculateNextState(dieIndex, uses, isPotent, roll.total);

        if (nextState.isDepleted) {
            // --- Failure ---
            await item.setFlag("paranormal-enhancements", "battery", {
                ...batteryData,
                hasPower: false
            });
            FoundryAdapter.notifyError(FoundryAdapter.localize("PE.BatteryCheckedFailure", { name: item.name }));
            
            // Emit event for other services (like Illumination) to react
            FoundryAdapter.callHook("paranormal-enhancements.batteryDepleted", item);

        } else {
            // --- Success ---
            await item.setFlag("paranormal-enhancements", "battery", { 
                ...batteryData, // Preserve existing flags
                dieIndex: nextState.nextDieIndex, 
                usesOnDie: nextState.nextUses 
            });

            const nextDieFace = BatteryService.getDieFace(nextState.nextDieIndex);
            const nextDieLabel = `d${nextDieFace}`;
            FoundryAdapter.notifyInfo(FoundryAdapter.localize("PE.BatteryCheckedSuccess", { name: item.name, die: nextDieLabel }));
        }
    }

    /**
     * Recharges an item's battery, resetting its consumption die to d20.
     * @param {Item} item The item document to recharge.
     */
    static async rechargeBattery(item) {
        const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};

        await item.setFlag("paranormal-enhancements", "battery", {
            ...batteryData,
            dieIndex: 0,
            usesOnDie: 0,
            hasPower: true
        });

        FoundryAdapter.notifyInfo(FoundryAdapter.localize("PE.ItemRecharged", { name: item.name }));
    }
}
