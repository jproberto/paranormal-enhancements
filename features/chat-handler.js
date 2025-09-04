import { toggleIllumination } from "./illumination-handler.js";
import { reloadWeapon } from "./armament-handler.js";
import { checkBattery, rechargeBattery } from "./battery-handler.js";

/**
 * Main handler for rendering chat messages, delegating to specific item type handlers.
 * @param {ChatMessage} chatMessage The ChatMessage document instance.
 * @param {jQuery} html The jQuery object of the message HTML.
 * @param {object} data The data object for the message.
 */
export function renderChatCardHandler(chatMessage, html, data) {
    const chatCard = html.find(".item-card");
    if (chatCard.length === 0) return;

    const actorId = chatCard.data("actor-id");
    const itemId = chatCard.data("item-id");
    
    if (!actorId || !itemId) return;

    const actor = game.actors.get(actorId);
    if (!actor) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    // Delegate to specific handlers based on item type
    if (item.type === "generalEquipment") {
        _handleGeneralEquipmentItem(html, item);
    } else if (item.type === "armament") {
        _handleArmamentItem(html, item);
    }
}

/**
 * Handles UI modifications for General Equipment items.
 * @param {jQuery} html The jQuery object of the message HTML.
 * @param {Item} item The item document.
 */
function _handleGeneralEquipmentItem(html, item) {
    const customButtonsContainer = $('<div class="custom-buttons-container"></div>');

    // Handle illumination controls
    const itemType = item.getFlag("paranormal-enhancements", "itemType");
    if (itemType === "illumination") {
        _addIlluminationControls(customButtonsContainer, item);
    }

    // Handle battery controls
    const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
    if (batteryData.uses) {
        _addBatteryControls(customButtonsContainer, item);
    }

    // If we added any buttons, append the container to the card
    if (customButtonsContainer.children().length > 0) {
        html.find(".card-footer").before(customButtonsContainer);
    }
}

/**
 * Adds the toggle button for illumination items to a container.
 * @param {jQuery} container The jQuery container to append the button to.
 * @param {Item} item The item document.
 */
function _addIlluminationControls(container, item) {
    const lightData = item.getFlag("paranormal-enhancements", "light") || {};
    const buttonLabel = lightData.isOn ? game.i18n.localize("PE.TurnOff") : game.i18n.localize("PE.TurnOn");
    const buttonIcon = lightData.isOn ? "fa-solid fa-lightbulb" : "fa-regular fa-lightbulb";

    const toggleButton = $(`
        <div class="card-buttons" style="margin-top: 5px;">
            <button data-action="toggle-light">
                <i class="${buttonIcon}"></i> ${buttonLabel}
            </button>
        </div>
    `);

    toggleButton.find('button').on('click', async (ev) => {
        ev.preventDefault();
        await toggleIllumination(item.actor.id, item.id);
    });

    container.append(toggleButton);
}

/**
 * Adds the battery control buttons for items that use them to a container.
 * @param {jQuery} container The jQuery container to append the buttons to.
 * @param {Item} item The item document.
 */
function _addBatteryControls(container, item) {
    const batteryButtons = $(`
        <div class="card-buttons" style="margin-top: 5px; display: flex; gap: 5px;">
            <button data-action="check-battery" style="flex: 1;">
                <i class="fa-solid fa-battery-half"></i> ${game.i18n.localize("PE.CheckBattery")}
            </button>
            <button data-action="recharge-battery" style="flex: 1;">
                <i class="fa-solid fa-bolt"></i> ${game.i18n.localize("PE.Recharge")}
            </button>
        </div>
    `);

    batteryButtons.find('button[data-action="check-battery"]').on('click', (ev) => {
        ev.preventDefault();
        checkBattery(item);
    });

    batteryButtons.find('button[data-action="recharge-battery"]').on('click', (ev) => {
        ev.preventDefault();
        rechargeBattery(item);
    });

    container.append(batteryButtons);
}


/**
 * Handles UI modifications for Armament items.
 * @param {jQuery} html The jQuery object of the message HTML.
 * @param {Item} item The item document.
 */
function _handleArmamentItem(html, item) {
    const isRangedWeapon = item.system.types?.rangeType?.name === "ranged";
    if (!isRangedWeapon) return;
    
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (!ammoData) return;

    _addAmmoUI(html, item, ammoData);
}

/**
 * Creates and injects the ammo count and reload button UI.
 * @param {jQuery} html The jQuery object of the message HTML.
 * @param {Item} item The item document.
 * @param {object} ammoData The ammo data from flags.
 */
function _addAmmoUI(html, item, ammoData) {
    const cardButtons = html.find(".card-buttons");
    const cardFooter = html.find(".card-footer");

    const ammoInfoContainer = $(`
        <div style="text-align: center; font-size: 14px; margin-top: 10px; font-weight: bold;">
            ${game.i18n.localize("PE.AmmoCurrent")}: ${ammoData.current}/${ammoData.max}
        </div>
    `);
    cardFooter.before(ammoInfoContainer);
    
    const ammunitionType = item.system.types.ammunitionType;
    if (cardButtons.length && ammunitionType) {
        const reloadButtonContainer = $(`<div class="card-buttons" style="margin-top: 5px;"></div>`);
        const reloadButton = $(`<button data-action="reload" style="flex-grow: 1;"><i class="fa-solid fa-sync"></i> ${game.i18n.localize("PE.Reload")}</button>`);
        
        reloadButtonContainer.append(reloadButton);
        cardButtons.after(reloadButtonContainer);
        
        reloadButton.on('click', (ev) => {
            ev.preventDefault();
            reloadWeapon(item);
        });
    }
}

