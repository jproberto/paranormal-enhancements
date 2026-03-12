import { FoundryAdapter } from "../adapter/FoundryAdapter.js";
import { ArmamentController } from "../../application/controllers/ArmamentController.js";
import { ArmamentService } from "../../core/services/ArmamentService.js";
import { ArmamentDialogs } from "../../application/ui/ArmamentDialogs.js";
import { Logger } from "../utils/Logger.js";
import { specialDamageHandlers } from "../../application/controllers/SpecialItemController.js";

export class ArmamentWrapperService {

    /**
     * Wraps the system's static chatListeners method to add listeners for burst-fire buttons.
     * @param {Function} wrapped The original chatListeners function.
     * @param {jQuery} html The jQuery object of the message's HTML.
     */
    static wrapChatListeners(wrapped, html) {
        wrapped(html);

        const message = game.messages.get(html.data("messageId"));
        if (!message) return;

        const burstAttackButton = html.find('button[data-action="burst-attack"]');
        const burstDamageButton = html.find('button[data-action="burst-damage"]');

        if (burstAttackButton.length > 0 || burstDamageButton.length > 0) {
            const itemUuid = message.flags?.['ordemparanormal.messageRoll']?.itemUuid;
            if (!itemUuid) return;
            
            const item = fromUuidSync(itemUuid);
            if (!item) return;

            burstAttackButton.on('click', (ev) => {
                ev.preventDefault();
                ArmamentController.rollBurstAttack(item);
            });

            burstDamageButton.on('click', (ev) => {
                ev.preventDefault();
                ArmamentController.rollBurstDamage(item, message, ev);
            });
        }
    }

    /**
     * A unified wrapper for Item.prototype.rollAttack.
     * Handles ammo consumption for ranged weapons and special logic for burst fire.
     * @param {Function} wrapped The original rollAttack function.
     * @param {object} options Options passed to the roll, including our custom 'isBurst'.
     */
    static async wrapRollAttack(wrapped, options = {}) {
        const item = this;
        const actor = item.parent;

        if (options.isBurst) {
            const attack = item.system.formulas.attack;
            if (!attack.attr || !attack.skill) {
                throw new Error(FoundryAdapter.localize("PE.Warnings.NoAttackFormula"));
            }

            const originalAttributeValue = actor.system.attributes[attack.attr].value;
            const burstAttributeBase = originalAttributeValue - 1;

            let diceCount;
            let keepMode;

            if (burstAttributeBase > 0) {
                diceCount = burstAttributeBase;
                keepMode = "kh";
            } else {
                diceCount = Math.abs(burstAttributeBase) + 2;
                keepMode = "kl";
            }
            
            const skill = actor.system.skills[attack.skill];
            const { parts, data } = CONFIG.Dice.BasicRoll.constructParts({
                degree: skill.degree.value || null,
                bonus: skill.value || null,
                modifier: skill.mod || null
            });

            const formula = `${diceCount}d20${keepMode} + ${(parts ?? []).join(' + ')}`;
            
            const roll = await FoundryAdapter.createRoll(formula, data).roll({ async: true });

            const d20Term = roll.terms[0]; 
            const d20Result = d20Term.results[0].result;
            const criticalValue = parseInt(item.system.critical.split('/')[0].replace('x', '')) || 20;
            const isCritical = d20Result >= criticalValue;
            const criticalStatus = { isCritical: isCritical }

            const flavorText = FoundryAdapter.localize("PE.AttackFlavor", {
                weapon: item.name,
                context: (options.flavor || "")
            });

            roll.toMessage({
                speaker: FoundryAdapter.getSpeakerActor({ actor: actor }),
                flavor: flavorText,
                flags: { 
                    'ordemparanormal.messageRoll': { 
                        type: 'attack', 
                        itemId: item.id,
                        itemUuid: item.uuid,
                        isCritical: isCritical, 
                        isBurst: true
                    } 
                }
            });

            Hooks.callAll('ordemparanormal.rollFormula', this, roll);
            
            return { roll, criticalStatus };
        }

        const isRangedWeapon = item.system.types?.rangeType?.name === "ranged";
        
        // Attempt to get the freshest instance of the item from the actor
        let freshItem = item;
        if (item.actor) {
            const found = item.actor.items.get(item.id);
            if (found) freshItem = found;
        }

        const ammoData = freshItem.getFlag("paranormal-enhancements", "ammo");

        if (freshItem.type === "armament" && isRangedWeapon && ammoData) {
            Logger.log(`Checking ammo for ${freshItem.name}. Current: ${ammoData.current}`);
            
            if (ammoData.current <= 0) {
                FoundryAdapter.notifyWarn(FoundryAdapter.localize("PE.Warnings.NoAmmo", { name: freshItem.name }));
                return;
            }
            
            const newAmmoData = { ...ammoData, current: ammoData.current - 1 };
            await freshItem.setFlag("paranormal-enhancements", "ammo", newAmmoData);
        }
        
        return wrapped(options);
    }

    /**
     * Wraps the rollDamage method to implement custom critical damage calculation.
     * @param {Function} wrapped The original rollDamage function.
     * @param {object} options   Options passed to the original function.
     * @returns {Promise<Roll|undefined>} The resulting roll, or undefined if the original function is bypassed.
     */
    static async wrapRollDamage(wrapped, options = {}) {
        const item = this;
        const actor = item.parent;

        const baseFormula = await ArmamentWrapperService._determineBaseFormula(item, options);
        if (!baseFormula) return; 

        const critical = options.critical || false;

        const diceParts = [];
        if (critical.isCritical) {
            const parts = await ArmamentService.calculateCriticalDice(baseFormula, critical.multiplier);
            diceParts.push(...parts);
        } else {
            diceParts.push(baseFormula);
        }

        const bonusParts = ArmamentService.getBonusDamageParts(item);

        const allParts = [...diceParts, ...bonusParts];
        const finalFormula = allParts.filter(p => p).join(' + '); 

        const flavorKey = critical.isCritical ? "PE.Damage.FlavorCritical" : "PE.Damage.Flavor";
        const flavorText = FoundryAdapter.localize(flavorKey, { itemName: item.name });

        const finalRoll = await FoundryAdapter.createRoll(finalFormula).roll({ async: true });

        finalRoll.toMessage({
            speaker: actor,
            flavor: flavorText,
            rollMode: FoundryAdapter.getSetting('core', 'rollMode'),
        });

        return finalRoll;
    }

    /**
     * Determines the base damage formula by routing to the correct helper function.
     * @param {Item} item
     * @param {object} options
     * @returns {Promise<string|null>} The base formula string, or null if cancelled.
     */
    static async _determineBaseFormula(item, options) {
        const defaultFormula = options.customFormula || item.system.formulas.damage.formula;
        
        const handler = specialDamageHandlers[item._stats.compendiumSource];
        if (handler) {
            return await handler(item);
        }

        if (item.system.conditions.adaptableGrip) {
            const twoHandedDamage = item.getFlag("paranormal-enhancements", "adaptableGrip.twoHandedDamage");
            if (twoHandedDamage) {
                return await ArmamentDialogs.promptAdaptableGrip(defaultFormula, twoHandedDamage);
            }
        }

        return defaultFormula;
    }
}
