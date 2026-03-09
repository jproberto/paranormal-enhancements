import { ASSETS_PATH, DEFAULT_DURATION, RITUAL_ELEMENTS } from "./ritual-constants.js";
import { selectTargetWeapon } from "./ritual-ui.js";
import { registerPersistentRitual } from "../ritual-handler.js"; 
import { log } from "../../paranormal-enhancements.js";

Hooks.on('renderChatMessageHTML', (message, html) => {
    const card = html.querySelector('.chat-card.item-card');
    if (!card) return;

    const actor = game.actors.get(card.dataset.actorId);
    const item = actor?.items.get(card.dataset.itemId);
    if (!item) return;

    const effect = actor.effects.find(e => 
        e.getFlag('paranormal-enhancements', 'effectType') === 'ArmaAtroz' &&
        e.getFlag('paranormal-enhancements', 'targetWeaponUuid') === item.uuid
    );

    if (effect) {
        const mechanics = effect.getFlag('paranormal-enhancements', 'mechanics');
        
        const div = document.createElement('div');
        div.classList.add('ritual-bonus-tag');
        
        div.style.cssText = `
            background: rgba(139, 0, 0, 0.1); 
            border: 1px solid #8b0000; 
            color: #8b0000;
            padding: 4px; 
            margin: 8px 0; 
            font-size: 0.75rem; 
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
        `;
        
        div.innerHTML = `<span>${effect.name}: +${mechanics.attack} Atk | +${mechanics.threat} Margem</span>`;

        const buttons = card.querySelector('.card-buttons');
        if (buttons) {
            buttons.before(div);
        } else {
            card.appendChild(div); 
        }
    }
});

Hooks.on('ordemparanormal.preRollFormula', (item, rollConfig) => {
    if (item.type !== 'armament' || !item.actor) return;
    
    const effect = item.actor?.effects.find(e => 
        e.getFlag('paranormal-enhancements', 'effectType') === 'ArmaAtroz' &&
        e.getFlag('paranormal-enhancements', 'targetWeaponUuid') === item.uuid
    );

    if (effect) {
        const mechanics = effect.getFlag('paranormal-enhancements', 'mechanics');
        rollConfig.formula += ` + ${mechanics.attack}`;
    }
});

Hooks.on('ordemparanormal.getIsCriticalOverrides', (item, overrides) => {
    const effect = item.actor?.effects.find(e => 
        e.getFlag('paranormal-enhancements', 'effectType') === 'ArmaAtroz' &&
        e.getFlag('paranormal-enhancements', 'targetWeaponUuid') === item.uuid
    );

    if (effect) {
        const mechanics = effect.getFlag('paranormal-enhancements', 'mechanics');
        overrides.threatMargin -= (mechanics.threat || 0); 
        overrides.multiplier += (mechanics.critical || 0); 
    }
});

export const ArmaAtroz = {
    variations: {
        base: {
            quick: { 
                attack: 2, threat: 1, cost: 1, 
                execution: "PE.Ritual.Execution.Standard", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Sustained",
                persistent: true
            },
            complete: { 
                attack: 2, threat: 1, cost: 1, 
                execution: "PE.Ritual.Execution.Complete", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Scene",
                persistent: true
            }
        },
        student: {
            quick: { 
                attack: 5, threat: 1, cost: 3, 
                execution: "PE.Ritual.Execution.Standard", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Sustained",
                requirements: { circle: 2 },
                persistent: true
            },
            complete: { 
                attack: 5, threat: 1, cost: 3, 
                execution: "PE.Ritual.Execution.Complete", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Scene",
                requirements: { circle: 2 },
                persistent: true
            }
        },
        true: {
            quick: { 
                attack: 5, threat: 2, critical: 2, cost: 6, 
                execution: "PE.Ritual.Execution.Standard", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Sustained",
                requirements: { circle: 3, affinity: true },
                persistent: true
            },
            complete: { 
                attack: 5, threat: 2, critical: 2, cost: 6, 
                execution: "PE.Ritual.Execution.Complete", 
                range: "PE.Ritual.Range.Touch", 
                target: { key: "PE.Ritual.Target.Weapon.Melee", number: 1 }, 
                duration: "PE.Ritual.Duration.Scene",
                requirements: { circle: 3, affinity: true },
                persistent: true
            }
        }
    },

    getMechanics(version, isFull) {
        const mode = isFull ? "complete" : "quick";
        return this.variations[version][mode];
    },

    async execute(context) {
        const { targets, version, isFull } = context;
        if (!this._validate(targets)) return;

        const instanceId = foundry.utils.randomID();
        const mechanics = this.getMechanics(version, isFull);
        const data = this._prepareData(context, mechanics);
        const animationName = `Arma_Atroz_${data.targetToken.id}`;

        const selectedWeapon = await selectTargetWeapon(data.targetToken.actor, { rangeType: "melee" });
        if (!selectedWeapon) {
            ui.notifications.warn(game.i18n.localize("PE.Ritual.NoWeapon"));
            return;
        }
        data.selectedWeapon = selectedWeapon;

        await this._runAnimation(data, animationName);
        await this._applyMechanics(data, animationName, instanceId);

        if (data.mechanics.persistent) {
            await registerPersistentRitual(data, instanceId, animationName);
        }
    },

    _validate(targets) {
        if (targets.length === 0) {
            ui.notifications.warn(game.i18n.localize("PE.Ritual.NoTarget"));
            return false;
        }

        if (targets.length > 1) {
            ui.notifications.warn(game.i18n.localize("PE.Ritual.TooManyTargets"));
            return false;
        }
        return true;
    },

    _prepareData({ item, caster, targets }, mechanics) {
        const element = item.system.element || "neutral";
        return {
            item, caster, mechanics,
            targetToken: targets[0],
            casterToken: caster.getActiveTokens()[0],
            elementConfig: RITUAL_ELEMENTS[element] || RITUAL_ELEMENTS.neutral
        };
    },

    async _runAnimation(data, animationName) {
        const { casterToken, targetToken, elementConfig } = data;
        return new Sequence()
            .effect().file(`${ASSETS_PATH}/rituals/arma-atroz.webm`)
                .screenSpace().screenSpacePosition({ x: 0.5, y: 0.5 }).screenSpaceScale({ x: 0.4, y: 0.4 })
                .duration(3000).fadeOut(500).waitUntilFinished()
            .effect().file("jb2a.magic_missile.purple.15ft.0")
                .atLocation(casterToken).stretchTo(targetToken).tint(elementConfig.color).waitUntilFinished(-500)
            .effect().file("jb2a.spiritual_weapon.greataxe.01.spectral.02.green")
                .attachTo(targetToken).size(1.5, { gridUnits: true }).tint(elementConfig.color).persist().name(animationName).opacity(0.6)
            .play();
    },

    async _applyMechanics(data, animationName, instanceId) {
        const { caster, targetToken, selectedWeapon } = data;

        const trackerEffect = this._buildTrackerEffect(data, instanceId, selectedWeapon.uuid);
        
        if (globalThis.paranormalSocket) {
            globalThis.paranormalSocket.executeAsGM("applyEffectAsGM", targetToken.actor.uuid, trackerEffect);
        }
        
        if (data.mechanics.duration === "PE.Ritual.Duration.Sustained") {
            const concentrationEffect = this._buildConcentrationEffect(data, animationName, instanceId);
            await caster.createEmbeddedDocuments("ActiveEffect", [concentrationEffect]);
        }
    },

    _buildTrackerEffect(data, instanceId, weaponUuid) {
        const { item, caster, mechanics } = data;
        return {
            name: `${item.name} (${data.selectedWeapon.name})`,
            icon: item.img,
            origin: caster.uuid,
            duration: { seconds: DEFAULT_DURATION },
            changes: [],
            flags: { 
                "paranormal-enhancements": { 
                    ritualId: instanceId,
                    effectType: "ArmaAtroz",
                    targetWeaponUuid: weaponUuid,
                    mechanics: mechanics
                } 
            }
        };
    },

    _buildConcentrationEffect(data, animationName, instanceId) {
        const { item, caster, targetToken } = data;
        return {
            name: game.i18n.format("PE.Ritual.Concentration", { name: item.name }),
            icon: `${ASSETS_PATH}/icons/concentration.svg`,
            origin: caster.uuid,
            duration: { seconds: DEFAULT_DURATION },
            flags: { 
                "paranormal-enhancements": { 
                    concentrationId: animationName,
                    targetUuid: targetToken.actor.uuid,
                    ritualId: instanceId
                } 
            }
        }
    },

    _calculateNewCritical(originalCrit, threatBonus = 0, multiplierBonus = 0) {
        let threat = 20;
        let multiplier = 2;

        if (originalCrit) {
            if (originalCrit.includes('/')) {
                let parts = originalCrit.split('/');
                threat = Number.parseInt(parts[0], 10) || 20;
                multiplier = parts[1] ? Number.parseInt(parts[1].replace('x', ''), 10) : 2;
            } else if (originalCrit.startsWith('x')) {
                multiplier = Number.parseInt(originalCrit.replace('x', ''), 10) || 2;
            } else {
                threat = Number.parseInt(originalCrit, 10) || 20;
            }
        }

        const newThreat = threat - (threatBonus || 0);
        const newMultiplier = multiplier + (multiplierBonus || 0);

        if (newThreat === 20 && newMultiplier === 2) return "20";
        if (newThreat === 20) return `x${newMultiplier}`;
        if (newMultiplier === 2) return `${newThreat}`;
        return `${newThreat}/x${newMultiplier}`;
    }
 };

