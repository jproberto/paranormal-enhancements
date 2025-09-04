import { log } from "../paranormal-enhancements.js";
import { toggleIllumination } from "./illumination-handler.js";
import { reloadWeapon } from "./armament-handler.js";

/**
 * Main handler for chat message rendering.
 * Acts as a dispatcher to apply specific enhancements based on item type.
 * @param {ChatMessage} chatMessage The ChatMessage document.
 * @param {jQuery} html The jQuery object for the message HTML.
 * @param {object} data The data object for the message.
 */
export function renderChatCardHandler(chatMessage, html, data) {
    // A more robust way is to get the item directly from the actor.
    const actor = game.actors.get(chatMessage.speaker.actor);
    if (!actor) return;

    // The item ID is stored in a data attribute on the card.
    const card = $(html).find('.item-card[data-item-id]');
    if (!card.length) return;

    const itemId = card.data('item-id');
    const item = actor.items.get(itemId);
    if (!item) return;

    // Now we use the up-to-date item data for all checks.
    const itemType = item.getFlag("paranormal-enhancements", "itemType");
    const isRangedWeapon = item.type === "armament" && item.system?.types?.rangeType?.name === "ranged";

    if (itemType === "illumination") {
        _handleIlluminationItem($(html), item, chatMessage);
    } else if (isRangedWeapon) {
        _handleArmamentItem($(html), item);
    }
}

/**
 * Handles adding UI elements for illumination items.
 * @param {jQuery} html The jQuery object for the message HTML.
 * @param {Item} item The full Item document from the actor.
 * @param {ChatMessage} chatMessage The ChatMessage document.
 */
function _handleIlluminationItem(html, item, chatMessage) {
    log(`Rendering chat card for illumination item: ${item.name}`);
    const cardButtons = html.find(".card-buttons");
    if (cardButtons.length === 0) return;

    const lightData = item.getFlag("paranormal-enhancements", "light") || {};
    const isOn = lightData.isOn || false;
    const buttonText = isOn ? game.i18n.localize("PE.TurnOff") : game.i18n.localize("PE.TurnOn");

    const button = $(`<button type="button" class="pe-toggle-light-btn" data-item-id="${item.id}">${buttonText}</button>`);
    cardButtons.append(button);

    button.on("click", (event) => _onToggleButtonClick(event, chatMessage));
}

/**
 * Handles adding UI elements for armament items.
 * @param {jQuery} html The jQuery object for the message HTML.
 * @param {Item} item The full Item document.
 */
function _handleArmamentItem(html, item) {
    log(`Rendering chat card for armament item: ${item.name}`);
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) return;

    const cardButtons = html.find(".card-buttons");
    const cardFooter = html.find(".card-footer");
    const ammunitionType = item.system.types.ammunitionType;

    const ammoInfo = $(`
        <div style="text-align: center; font-size: 14px; margin-top: 10px; font-weight: bold;">
            ${game.i18n.localize("PE.AmmoCurrent")}: ${ammoData.current}/${ammoData.max}
        </div>
    `);
    cardFooter.before(ammoInfo);

    if (cardButtons.length && ammunitionType) {
        const reloadContainer = $(`<div class="card-buttons" style="margin-top: 5px;"></div>`);
        const reloadButton = $(`<button data-action="reload" style="flex-grow: 1;"><i class="fa-solid fa-sync"></i> ${game.i18n.localize("PE.Reload")}</button>`);
        
        reloadContainer.append(reloadButton);
        cardButtons.after(reloadContainer);
        
        reloadButton.click(() => reloadWeapon(item));
    }
}

/**
 * Handles the toggle button click for illumination items.
 * @param {Event} event The click event.
 * @param {ChatMessage} chatMessage The associated chat message.
 */
async function _onToggleButtonClick(event, chatMessage) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const itemId = button.data("itemId");
    const actorId = chatMessage.speaker.actor;

    if (!actorId || !itemId) return;

    const newState = await toggleIllumination(actorId, itemId);
    if (newState !== null) {
        button.text(newState ? game.i18n.localize("PE.TurnOff") : game.i18n.localize("PE.TurnOn"));
    }
}