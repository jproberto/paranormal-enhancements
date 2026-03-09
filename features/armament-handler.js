import { log } from "../paranormal-enhancements.js";
import { specialDamageHandlers } from './special-items-handler.js';

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

// Funções Auxiliares (privadas ao módulo)

function _getBurstDamageFormula(baseFormula) {
    const simpleMatch = baseFormula.match(/^(\d*)d(\d+)/);
    if (simpleMatch) {
        const originalDiceCount = parseInt(simpleMatch[1], 10) || 1;
        const diceFace = simpleMatch[2];
        const burstDiceCount = originalDiceCount + 2;
        const burstDiceTerm = `${burstDiceCount}d${diceFace}`;
        const remainingFormula = baseFormula.replace(simpleMatch[0], "").trim();
        return [burstDiceTerm, remainingFormula].filter(part => part).join(' ');
    }
    const diceTerms = baseFormula.match(/(\d*d\d+)/g) || [];
    if (diceTerms.length > 0) {
        let highestFace = 0;
        diceTerms.forEach(term => {
            const face = parseInt(term.split('d')[1], 10);
            if (face > highestFace) highestFace = face;
        });
        const burstBonusTerm = `2d${highestFace}[${game.i18n.localize("PE.Burst")}]`;
        return `${baseFormula} + ${burstBonusTerm}`;
    }
    return baseFormula;
}

async function _handleBurstAttack(item, message) {
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) return ui.notifications.warn(game.i18n.localize("PE.Warnings.NoAmmoSystem"));

    const burstAmmoCost = 10;
    if (ammoData.current < burstAmmoCost) {
        return ui.notifications.warn(game.i18n.format("PE.Warnings.NoAmmoForBurst", { name: item.name, cost: burstAmmoCost, current: ammoData.current }));
    }
    await item.setFlag("paranormal-enhancements", "ammo.current", ammoData.current - burstAmmoCost);

    const rollAttack = await item.rollAttack({ disadvantage: true, flavor: ` (${game.i18n.localize("PE.Burst")})` });
    
    if (rollAttack) {
        item.lastMessageId = message.id;
        item.critical = rollAttack.criticalStatus;
    }
}

async function _handleBurstDamage(item, message, event) {
    const finalFormula = _getBurstDamageFormula(item.system.formulas.damage?.formula);
    
    return item.rollDamage({
        customFormula: finalFormula,
        event: event,
        critical: item.critical,
        lastId: item.lastMessageId === message.id,
        flavor: ` (${game.i18n.localize("PE.Burst")})`
    });
}

// Funções Públicas Exportadas (Wrappers)

/**
 * Wraps the system's static chatListeners method to add listeners for burst-fire buttons.
 * @param {Function} wrapped The original chatListeners function.
 * @param {jQuery} html The jQuery object of the message's HTML.
 */
export function wrapChatListeners(wrapped, html) {
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
            _handleBurstAttack(item, message);
        });

        burstDamageButton.on('click', (ev) => {
            ev.preventDefault();
            _handleBurstDamage(item, message, ev);
        });
    }
}

/**
 * A unified wrapper for Item.prototype.rollAttack.
 * Handles ammo consumption for ranged weapons and special logic for burst fire.
 * @param {Function} wrapped The original rollAttack function.
 * @param {object} options Options passed to the roll, including our custom 'isBurst'.
 */
export async function wrapRollAttack(wrapped, options = {}) {
    const item = this;
    const actor = item.parent;

    if (options.isBurst) {
        const attack = item.system.formulas.attack;
        if (!attack.attr || !attack.skill) {
            throw new Error(game.i18n.localize("PE.Warnings.NoAttackFormula"));
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
        
        const roll = await new Roll(formula, data).roll({ async: true });

        const d20Term = roll.terms[0]; 
        const d20Result = d20Term.results[0].result;
        const criticalValue = parseInt(item.system.critical.split('/')[0].replace('x', '')) || 20;
        const isCritical = d20Result >= criticalValue;
        const criticalStatus = { isCritical: isCritical }

        const flavorText = game.i18n.format("PE.AttackFlavor", {
            weapon: item.name,
            context: (options.flavor || "")
        });

        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
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
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");

    if (item.type === "armament" && isRangedWeapon && ammoData) {
        if (ammoData.current <= 0) {
            ui.notifications.warn(game.i18n.format("PE.Warnings.NoAmmo", { name: item.name }));
            return;
        }
        await item.setFlag("paranormal-enhancements", "ammo.current", ammoData.current - 1);
    }
    
    return wrapped(options);
}


/**
 * Initiates a burst attack roll.
 * @param {Item} item The weapon item document.
 */
export async function rollBurstAttack(item) {
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) {
        return ui.notifications.warn(game.i18n.localize("PE.Warnings.NoAmmoSystem"));
    }

    const burstAmmoCost = 10;
    if (ammoData.current < burstAmmoCost) {
        const warning = game.i18n.format("PE.Warnings.NoAmmoForBurst", { 
            name: item.name, 
            cost: burstAmmoCost, 
            current: ammoData.current 
        });
        return ui.notifications.warn(warning);
    }

    await item.setFlag("paranormal-enhancements", "ammo.current", ammoData.current - burstAmmoCost);
    
    const rollOptions = {
        flavor: ` (${game.i18n.localize("PE.BurstAttack")})`,
        isBurst: true
    };
    
    return item.rollAttack(rollOptions);
}

/**
 * Wraps the rollDamage method to implement custom critical damage calculation.
 * @param {Function} wrapped The original rollDamage function.
 * @param {object} options   Options passed to the original function.
 * @returns {Promise<Roll|undefined>} The resulting roll, or undefined if the original function is bypassed.
 */
export async function wrapRollDamage(wrapped, options = {}) {
    const item = this;
    const actor = item.parent;

    const baseFormula = await _determineBaseFormula(item, options);
    if (!baseFormula) return; 

    const critical = options.critical || false;

    const diceParts = await _calculateDiceParts(baseFormula, critical);

    const bonusParts = _getBonusDamageParts(item);

    const allParts = [...diceParts, ...bonusParts];
    const finalFormula = allParts.filter(p => p).join(' + '); 

    const flavorKey = critical.isCritical ? "PE.Damage.FlavorCritical" : "PE.Damage.Flavor";
    const flavorText = game.i18n.format(flavorKey, { itemName: item.name });

    const finalRoll = await new Roll(finalFormula).roll({ async: true });

    finalRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: flavorText,
        rollMode: game.settings.get('core', 'rollMode'),
    });

    return finalRoll;
}

/**
 * Determines the base damage formula by routing to the correct helper function.
 * This function is lean and follows the Single Responsibility Principle.
 * @param {Item} item
 * @param {object} options
 * @returns {Promise<string|null>} The base formula string, or null if cancelled.
 */
async function _determineBaseFormula(item, options) {
    const defaultFormula = options.customFormula || item.system.formulas.damage.formula;
    
    const handler = specialDamageHandlers[item._stats.compendiumSource];
    if (handler) {
        return await handler(item);
    }

    if (item.system.conditions.adaptableGrip) {
        return await _handleAdaptableGrip(item, defaultFormula);
    }

    return defaultFormula;
}

/**
 * Handles the user dialog for the Adaptable Grip feature.
 * @param {Item} item
 * @param {string} defaultFormula The default 1-handed damage formula.
 * @returns {Promise<string|null>} The chosen formula string, or null if cancelled.
 */
async function _handleAdaptableGrip(item, defaultFormula) {
    const twoHandedDamage = item.getFlag("paranormal-enhancements", "adaptableGrip.twoHandedDamage");
    if (!twoHandedDamage) return defaultFormula; 

    return new Promise(resolve => {
        new Dialog({
            title: game.i18n.localize("PE.AdaptableGrip.DialogTitle"),
            content: `<p>${game.i18n.localize("PE.AdaptableGrip.DialogContent")}</p>`,
            buttons: {
                oneHand: {
                    label: game.i18n.localize("PE.AdaptableGrip.Button1Hand"),
                    callback: () => resolve(defaultFormula)
                },
                twoHands: {
                    label: game.i18n.localize("PE.AdaptableGrip.Button2Hands"),
                    callback: () => resolve(twoHandedDamage)
                }
            },
            default: "oneHand",
            close: () => resolve(null)
        }).render(true);
    });
}


/**
 * Calculates the primary dice parts of a damage roll, handling critical hits.
 * @param {string} baseFormula The base dice formula (e.g., "1d12").
 * @param {object} critical Critical hit information.
 * @returns {Promise<Array>} An array of strings/numbers for the formula.
 */
async function _calculateDiceParts(baseFormula, critical = {}) {
    const formulaParts = [];
    if (critical.isCritical) {
        const maxRoll = new Roll(baseFormula);
        await maxRoll.evaluate({ maximize: true, async: true });
        formulaParts.push(maxRoll.total);
        
        const multiplier = critical.multiplier;
        const remainingMultiplier = multiplier - 1;
        
        if (remainingMultiplier > 0) {
            const [diceCountStr, diceFace] = baseFormula.split('d');
            const diceCount = parseInt(diceCountStr) || 1;
            if (diceFace) { // Evita erro se a fórmula for um dano flat
                const criticalDiceFormula = `${diceCount * remainingMultiplier}d${diceFace}`;
                formulaParts.push(criticalDiceFormula);
            }
        }
    } else {
        formulaParts.push(baseFormula);
    }
    return formulaParts;
}


/**
 * Gets other bonus damage parts from attributes and the item's damage parts array.
 * @param {Item} item
 * @returns {Array} An array of strings/numbers for the formula.
 */
function _getBonusDamageParts(item) {
    const bonusParts = [];
    const damage = item.system.formulas.damage;
    const actor = item.parent;

    if (damage.attr && actor.system.attributes[damage.attr]) {
        bonusParts.push(actor.system.attributes[damage.attr].value);
    }
    damage.parts.forEach(part => bonusParts.push(`(${part[0] || 0})`));
    
    return bonusParts;
}

/**
 * Initiates a burst damage roll by presenting a dialog to the player.
 * @param {Item} item The weapon item.
 * @param {ChatMessage} message The chat message document that originated the click.
 * @param {Event} event The original click event.
 */
export function rollBurstDamage(item, message, event) {
    if (typeof item.rollDamage !== 'function') return;

    const finalFormula = _getBurstDamageFormula(item.system.formulas.damage?.formula);
    
    const rollOptions = {
        customFormula: finalFormula,
        event: event,
        flavor: ` (${game.i18n.localize("PE.Burst")})`,
    };

    rollOptions.critical = item.critical.isCritical
        ? { isCritical: true, multiplier: item.system.critical.multiplier || 2 }
        : { isCritical: false };
    
    item.rollDamage(rollOptions);
}