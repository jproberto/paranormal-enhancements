import { log } from "../paranormal-enhancements.js";

export function registerCurseHooks() {
    Hooks.on("op.postAttributeCheckRollConfiguration", (roll, result) => {
        applyCurseEffects(result.subject, result.attributeId);
    });

    Hooks.on("op.postSkillRollConfiguration", (roll, result) => {
        const actor = result.subject;
        const skill = actor.system.skills[result.skill];
        if (skill) applyCurseEffects(actor, skill.attr[0]);
    });

    Hooks.on("ordemparanormal.rollFormula", (rollData) => {
        const attribute = rollData.system.formulas.attack.attr;
        if (attribute) applyCurseEffects(rollData.actor, attribute);
    });
}

/**
 * Checks for cursed items and posts a reminder message to chat.
 * @param {Actor} actor
 * @param {string} attribute
 */
export async function applyCurseEffects(actor, attribute) {
    if (!actor || !attribute) return;

    const attributeElementMap = {
        'STR': 'Blood',
        'VIG': 'Blood',
        'PRE': 'Death',
        'INT': 'Knowledge',
        'DEX': 'Energy'
    };

    const rollElement = attributeElementMap[attribute.toUpperCase()];
    if (!rollElement) return;

    const cursedItemsOfElement = [];
    for (const item of actor.items) {
        const curseFlags = item.getFlag("paranormal-enhancements", "curse");
        
        if (curseFlags?.active && curseFlags.element === rollElement) {
            cursedItemsOfElement.push(item);
        }
    }

    if (cursedItemsOfElement.length === 0) return;

    const elementName = game.i18n.localize(`PE.CurseElement.${rollElement}`);
    const sanityLoss = 2 * cursedItemsOfElement.length;

    const cardContent = game.i18n.format("PE.Curse.CardContent", {
        actorName: actor.name,
        elementName: elementName
    });

    const failureReminder = game.i18n.format("PE.Curse.FailureReminder", {
        sanityLoss: sanityLoss
    });

    const messageContent = `
    <div class="dnd5e chat-card item-card">
        <header class="card-header flexrow">
            <strong>${game.i18n.localize("PE.Curse.CardTitle")}</strong>
        </header>
        <div class="card-content">
            <p>${cardContent}</p>
            <p>${failureReminder}</p>
        </div>
    </div>
    `;

    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: `<div>${messageContent}</div>`
    });
}