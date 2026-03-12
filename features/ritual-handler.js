import { Logger } from "../src/infrastructure/utils/Logger.js";

const RITUAL_REGISTRY = {
    "arma-atroz": { file: "arma-atroz.js", className: "ArmaAtroz" }
};

export async function executeRitual(context) {
    const { item, version, isFull } = context;
    const caster = item.actor;
    const targets = Array.from(game.user.targets);

    const ritualSlug = item.name.slugify();
    const ritualClassName = RITUAL_REGISTRY[ritualSlug];
    
    if (!ritualClassName) {
        Logger.warn(`Lógica não encontrada para o slug: ${ritualSlug}`);
        return ui.notifications.info(game.i18n.localize("PE.Ritual.NotImplemented"));
    }

    _dispatchRitual(ritualClassName, {
        item,
        caster,
        targets,
        version,
        isFull
    });
}

async function _dispatchRitual(config, context) {
    try {
        const module = await import(`./rituals/${config.file}`);
        const ritualClass = module[config.className];

        if (ritualClass && typeof ritualClass.execute === "function") {
            await ritualClass.execute(context);
        } else {
            const errorMsg = game.i18n.format("PE.Error.MethodNotFound", { className: config.className });
            throw new Error(errorMsg);
        }

    } catch (err) {
        const loadErrorMsg = game.i18n.format("PE.Error.LoadFailed", { file: config.file });
        Logger.error(loadErrorMsg, err);
        ui.notifications.error(loadErrorMsg);
    }
}

export function registerRitualHandlers() {
    Hooks.on("deleteActiveEffect", (effect, options, userId) => {
        const ritualData = effect.getFlag("paranormal-enhancements", "ritualData");
        if (!ritualData) return;

        if (globalThis.paranormalSocket) {
            paranormalSocket.executeAsGM(
                "removeEffectsAsGM", 
                ritualData.targetUuid, 
                ritualData.effectName, 
                ritualData.animationName
            );
        }
    });
}

export async function _applyEffectAsGM(targetUuid, effectData) {
    const target = await fromUuid(targetUuid);
    const actor = target?.actor ?? target; 
    if (actor) return actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

export async function _removeEffectsAsGM(actorUuid, effectIds) {
    const doc = await fromUuid(actorUuid);
    const actor = doc?.actor || (doc instanceof Actor ? doc : null);
    
    if (!actor) {
        console.error(`GM Error: Ator com UUID ${actorUuid} não encontrado.`);
        return;
    }

    if (effectIds && effectIds.length > 0) {
        try {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
        } catch (err) {
            console.error(`GM Error: Falha ao deletar efeitos em ${actor.name}`, err);
        }
    }
}

export async function getRitualClass(slug) {
    const config = RITUAL_REGISTRY[slug];
    
    if (!config) {
        Logger.warn(`Ritual "${slug}" não possui implementação customizada.`);
        return null;
    }

    try {
        const module = await import(`./rituals/${config.file}`);
        return module[config.className];
    } catch (err) {
        Logger.error(`Erro ao carregar a classe do ritual "${slug}":`, err);
        return null;
    }
}

export async function registerPersistentRitual(data, instanceId, animationName) {
    const { caster, targetToken, selectedWeapon, mechanics } = data;

    const ritualRecord = {
        id: instanceId,
        name: data.item.name,
        timestamp: Date.now(),
        targetUuid: targetToken.actor.uuid,
        targetName: targetToken.name,
        animationName: animationName,
        weaponId: selectedWeapon?.id || null,
        casterEffectName: data.item.name,
        mechanics: mechanics
    };

    const currentRituals = foundry.utils.deepClone(caster.getFlag("paranormal-enhancements", "active-rituals") || {});
    currentRituals[instanceId] = ritualRecord;

    await caster.setFlag("paranormal-enhancements", "active-rituals", currentRituals);

}

export async function terminateRitual(instanceId, caster) {
    const rituals = foundry.utils.deepClone(caster.getFlag("paranormal-enhancements", "active-rituals") || {});
    const data = rituals[instanceId];

    if (!data) {
        console.error(`Instância ${instanceId} não encontrada no caster ${caster.name}`);
        return;
    }

    const targetUuids = Array.isArray(data.targetUuids) ? data.targetUuids : [data.targetUuid];
    
    const actorUuids = new Set([caster.uuid, ...targetUuids.filter(u => u)]);
    
    for (const uuid of actorUuids) {
        const doc = await fromUuid(uuid);
        const actor = doc?.actor || (doc instanceof Actor ? doc : null);
        if (!actor) continue;

        const effectsToDelete = actor.effects.filter(e => 
            e.getFlag("paranormal-enhancements", "ritualId") === instanceId
        );

        if (effectsToDelete.length > 0) {
            const effectIds = effectsToDelete.map(e => e.id);
            
            if (globalThis.paranormalSocket) {
                await globalThis.paranormalSocket.executeAsGM("removeEffectsAsGM", actor.uuid, effectIds);
            } else {
                for (const effect of effectsToDelete) {
                    await effect.delete().catch(err => console.error(`Erro ao deletar: ${err}`));
                }
            }
        }
    }

    if (game.modules.get("sequencer")?.active && data.animationName) {
        Sequencer.EffectManager.endEffects({ name: data.animationName });
    }

    await caster.update({ [`flags.paranormal-enhancements.active-rituals.-=${instanceId}`]: null });
}
