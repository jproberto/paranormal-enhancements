
import { toggleIllumination } from "../illumination-handler.js";
import { checkBattery, rechargeBattery } from "../battery-handler.js";

export const equipmentStrategy = {
    render: _handleGeneralEquipmentItem
};

/**
 * Gerencia as modificações de UI para itens de Equipamento Geral.
 * @param {jQuery} html O objeto jQuery do HTML da mensagem.
 * @param {Item} item O documento do item.
 * @private
 */
function _handleGeneralEquipmentItem(html, item) {
    // Evita duplicidade se o card for re-renderizado
    if (html.find(".custom-buttons-container").length > 0) return;

    const customButtonsContainer = $('<div class="custom-buttons-container"></div>');

    // Lida com controles de iluminação
    const itemType = item.getFlag("paranormal-enhancements", "itemType");
    if (itemType === "illumination") {
        _addIlluminationControls(customButtonsContainer, item);
    }

    // Lida com controles de bateria
    const batteryData = item.getFlag("paranormal-enhancements", "battery") || {};
    if (batteryData.uses) {
        _addBatteryControls(customButtonsContainer, item);
    }

    // Se adicionamos algum botão, insere o container antes do footer do card
    if (customButtonsContainer.children().length > 0) {
        html.find(".card-footer").before(customButtonsContainer);
    }
}

/**
 * Adiciona o botão de alternar iluminação.
 * @param {jQuery} container O container onde o botão será inserido.
 * @param {Item} item O documento do item.
 * @private
 */
function _addIlluminationControls(container, item) {
    const lightData = item.getFlag("paranormal-enhancements", "light") || {};
    const isOn = lightData.isOn;
    
    const buttonLabel = isOn ? game.i18n.localize("PE.TurnOff") : game.i18n.localize("PE.TurnOn");
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
        // Chama a função lógica (certifique-se de que ela esteja acessível globalmente ou importada)
        if (typeof toggleIllumination === "function") {
            await toggleIllumination(item.actor.id, item.id);
        } else {
            console.warn("Paranormal | Função toggleIllumination não encontrada.");
        }
    });

    container.append(toggleButton);
}

/**
 * Adiciona os botões de controle de bateria (Checar e Recarregar).
 * @param {jQuery} container O container onde os botões serão inseridos.
 * @param {Item} item O documento do item.
 * @private
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
        if (typeof checkBattery === "function") {
            checkBattery(item);
        }
    });

    batteryButtons.find('button[data-action="recharge-battery"]').on('click', (ev) => {
        ev.preventDefault();
        if (typeof rechargeBattery === "function") {
            rechargeBattery(item);
        }
    });

    container.append(batteryButtons);
}