import { log } from "../paranormal-enhancements.js";

import { equipmentStrategy } from "./chat/equipment.js";
import { armamentStrategy } from "./chat/armament.js";

const itemTypeStrategy = {
    "generalEquipment": equipmentStrategy,
    "armament": armamentStrategy
};

export function renderChatCardHandler(chatMessage, html, data) {
    const chatCard = html.find(".item-card");
    if (chatCard.length === 0) return;

    const { actorId, itemId } = chatCard.data();
    const actor = ChatMessage.getSpeakerActor(chatMessage.speaker) || game.actors.get(actorId);
    const item = actor?.items.get(itemId);
    
    if (!item) return;

    const strategy = itemTypeStrategy[item.type];
    if (strategy) {
        strategy.render?.(html, item);
        strategy.listeners?.(html, item, chatMessage);
    }
}

export function handleRitualPreCreate(message, data, options, userId) {
    if (userId !== game.user.id) return true;

    if (message.getFlag("paranormal-enhancements", "isAuthorized")) return true;

    const content = message.content || "";
    const itemIdMatch = content.match(/data-item-id="([^"]+)"/);
    if (!itemIdMatch) return true;

    const itemId = itemIdMatch[1];
    const actorId = message.speaker.actor;
    const actor = game.actors.get(actorId);
    
    if (!actor) return true;

    const item = actor.items.get(itemId);

    if (item?.type === "ritual") {
        _triggerRitualDialog(item, message);
        return false;
    }

    return true; 
}

async function _triggerRitualDialog(item, message) {
    const { getRitualClass } = await import("./ritual-handler.js");
    const slug = item.name.slugify();
    const ritualClass = await getRitualClass(slug);

    if (!ritualClass) {
        const messageData = message.toObject();
        foundry.utils.setProperty(messageData, "flags.paranormal-enhancements.isAuthorized", true);
        
        return ChatMessage.create(messageData);
    }

    const { showPreRollDialog } = await import("./rituals/ritual-ui.js");
    showPreRollDialog(item, message, ritualClass);
}