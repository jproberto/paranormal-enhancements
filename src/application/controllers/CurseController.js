import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";

export class CurseController {
    /**
     * Checks for cursed items and posts a reminder message to chat.
     * @param {Actor} actor
     * @param {string} attribute
     */
    static async applyCurseEffects(actor, attribute) {
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

        const elementName = FoundryAdapter.localize(`PE.CurseElement.${rollElement}`);
        const sanityLoss = 2 * cursedItemsOfElement.length;

        const cardContent = FoundryAdapter.localize("PE.Curse.CardContent", {
            actorName: actor.name,
            elementName: elementName
        });

        const failureReminder = FoundryAdapter.localize("PE.Curse.FailureReminder", {
            sanityLoss: sanityLoss
        });

        const messageContent = `
        <div class="dnd5e chat-card item-card">
            <header class="card-header flexrow">
                <strong>${FoundryAdapter.localize("PE.Curse.CardTitle")}</strong>
            </header>
            <div class="card-content">
                <p>${cardContent}</p>
                <p>${failureReminder}</p>
            </div>
        </div>
        `;

        await FoundryAdapter.createChatMessage({
            user: game.user.id,
            speaker: FoundryAdapter.getSpeaker({ actor: actor }),
            content: `<div>${messageContent}</div>`
        });
    }
}
