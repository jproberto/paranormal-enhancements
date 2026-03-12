import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";
import { BatteryController } from "../controllers/BatteryController.js";
import { IlluminationController } from "../controllers/IlluminationController.js";
import { ArmamentController } from "../controllers/ArmamentController.js";

export class ChatService {
    /**
     * Main handler for rendering chat cards.
     * @param {ChatMessage} chatMessage The chat message document.
     * @param {jQuery} html The jQuery object of the message HTML.
     */
    static renderChatCardHandler(chatMessage, html) {
        const chatCard = html.find(".item-card");
        if (chatCard.length === 0) return;

        const { actorId, itemId } = chatCard.data();
        const actor = FoundryAdapter.getSpeakerActor(chatMessage.speaker) || FoundryAdapter.getActor(actorId);
        const item = actor?.items.get(itemId);
        
        if (!item) return;

        if (item.type === "generalEquipment") {
            ChatService._handleGeneralEquipmentItem(html, item);
        } else if (item.type === "armament") {
            ChatService._handleArmamentItem(html, item, chatMessage);
        }
    }

    /**
     * Handles UI modifications for General Equipment items.
     * @param {jQuery} html 
     * @param {Item} item 
     */
    static _handleGeneralEquipmentItem(html, item) {
        if (html.find(".custom-buttons-container").length > 0) return;

        const customButtonsContainer = $('<div class="custom-buttons-container"></div>');

        // Illumination Controls
        const itemType = item.getFlag("paranormal-enhancements", "itemType");
        if (itemType === "illumination") {
            ChatService._addIlluminationControls(customButtonsContainer, item);
        }

        // Battery Controls
        const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
        if (batteryData.uses) {
            ChatService._addBatteryControls(customButtonsContainer, item);
        }

        if (customButtonsContainer.children().length > 0) {
            html.find(".card-footer").before(customButtonsContainer);
        }
    }

    static _addIlluminationControls(container, item) {
        const lightData = item.getFlag("paranormal-enhancements", "light") || {};
        const isOn = lightData.isOn;
        
        const buttonLabel = isOn ? FoundryAdapter.localize("PE.TurnOff") : FoundryAdapter.localize("PE.TurnOn");
        const buttonIcon = isOn ? "fa-solid fa-lightbulb" : "fa-regular fa-lightbulb";

        const toggleButton = $(`
            <div class="card-buttons" style="margin-top: 5px;">
                <button data-action="toggle-light">
                    <i class="${buttonIcon}"></i> ${buttonLabel}
                </button>
            </div>
        `);

        toggleButton.find('button').on('click', async (ev) => {
            ev.preventDefault();
            await IlluminationController.toggleIllumination(item.actor.id, item.id);
        });

        container.append(toggleButton);
    }

    static _addBatteryControls(container, item) {
        const batteryButtons = $(`
            <div class="card-buttons" style="margin-top: 5px; display: flex; gap: 5px;">
                <button data-action="check-battery" style="flex: 1;">
                    <i class="fa-solid fa-battery-half"></i> ${FoundryAdapter.localize("PE.CheckBattery")}
                </button>
                <button data-action="recharge-battery" style="flex: 1;">
                    <i class="fa-solid fa-bolt"></i> ${FoundryAdapter.localize("PE.Recharge")}
                </button>
            </div>
        `);

        batteryButtons.find('button[data-action="check-battery"]').on('click', (ev) => {
            ev.preventDefault();
            BatteryController.checkBattery(item);
        });

        batteryButtons.find('button[data-action="recharge-battery"]').on('click', (ev) => {
            ev.preventDefault();
            BatteryController.rechargeBattery(item);
        });

        container.append(batteryButtons);
    }

    /**
     * Handles UI modifications for Armament items.
     * @param {jQuery} html 
     * @param {Item} item 
     * @param {ChatMessage} chatMessage
     */
    static _handleArmamentItem(html, item, chatMessage) {
        const isRangedWeapon = item.system.types?.rangeType?.name === "ranged";
        if (!isRangedWeapon) return;
        
        const ammoData = item.getFlag("paranormal-enhancements", "ammo");
        if (ammoData) {
            ChatService._addAmmoUI(html, item, ammoData);
        }

        const isAutomatic = item.system.conditions?.automatic === true;
        if (isAutomatic) {
            ChatService._addBurstFireUI(html, item, chatMessage);
        }
    }

    static _addAmmoUI(html, item, ammoData) {
        if (html.find(".ammo-info-container").length > 0) return;

        const cardButtons = html.find(".card-buttons");
        const cardFooter = html.find(".card-footer");

        const ammoInfoContainer = $(`
            <div class="ammo-info-container" style="text-align: center; font-size: 14px; margin-top: 10px; font-weight: bold;">
                ${FoundryAdapter.localize("PE.AmmoCurrent")}: ${ammoData.current}/${ammoData.max}
            </div>
        `);
        cardFooter.before(ammoInfoContainer);
        
        const ammunitionType = item.system.types?.ammunitionType;
        if (cardButtons.length && ammunitionType) {
            const reloadButtonContainer = $(`<div class="card-buttons reload-container" style="margin-top: 5px;"></div>`);

            const reloadButton = $(`
                <button data-action="reload" style="flex-grow: 1;">
                    <i class="fa-solid fa-sync"></i> ${FoundryAdapter.localize("PE.Reload")}
                </button>
            `);

            reloadButton.on('click', (ev) => {
                ev.preventDefault();
                ArmamentController.reloadWeapon(item);
            });
            
            reloadButtonContainer.append(reloadButton);
            cardButtons.first().after(reloadButtonContainer);
        }
    }

    static _addBurstFireUI(html, item, chatMessage) {
        if (html.find(".burst-button-container").length > 0) return;

        const cardButtons = html.find(".card-buttons");
        if (!cardButtons.length) return;

        const burstButtonContainer = $(`<div class="card-buttons burst-button-container" style="margin-top: 5px;"></div>`);
        
        const burstAttackButton = $(`
            <button data-action="burst-attack">
                <i class="fas fa-bolt"></i> ${FoundryAdapter.localize("PE.BurstAttack")}
            </button>
        `);
        const burstDamageButton = $(`
            <button data-action="burst-damage">
                <i class="fas fa-fire"></i> ${FoundryAdapter.localize("PE.BurstDamage")}
            </button>
        `);

        burstAttackButton.on('click', (ev) => {
            ev.preventDefault();
            ArmamentController.rollBurstAttack(item);
        });

        burstDamageButton.on('click', (ev) => {
            ev.preventDefault();
            ArmamentController.rollBurstDamage(item, chatMessage, ev);
        });

        burstButtonContainer.append(burstAttackButton).append(burstDamageButton);
        cardButtons.last().after(burstButtonContainer);
    }

    /**
     * Intercepts chat message creation to handle Ritual Pre-Create logic.
     */
    static handleRitualPreCreate(message, data, options, userId) {
        if (userId !== game.user.id) return true;

        if (message.getFlag("paranormal-enhancements", "isAuthorized")) return true;

        const content = message.content || "";
        const itemIdMatch = content.match(/data-item-id="([^"]+)"/);
        if (!itemIdMatch) return true;

        const itemId = itemIdMatch[1];
        const actorId = message.speaker.actor;
        const actor = FoundryAdapter.getActor(actorId);
        
        if (!actor) return true;

        const item = actor.items.get(itemId);

        if (item?.type === "ritual") {
            ChatService._triggerRitualDialog(item, message);
            return false;
        }

        return true; 
    }

    static async _triggerRitualDialog(item, message) {
        // Dynamic import to avoid circular dependencies if Rituals are refactored later
        const { getRitualClass } = await import("../../../features/ritual-handler.js");
        const slug = item.name.slugify();
        const ritualClass = await getRitualClass(slug);

        if (!ritualClass) {
            const messageData = message.toObject();
            foundry.utils.setProperty(messageData, "flags.paranormal-enhancements.isAuthorized", true);
            
            return FoundryAdapter.createChatMessage(messageData);
        }

        const { showPreRollDialog } = await import("../../../features/rituals/ritual-ui.js");
        showPreRollDialog(item, message, ritualClass);
    }
}
