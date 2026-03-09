import { rollBurstAttack, rollBurstDamage, reloadWeapon } from "../armament-handler.js";

export const armamentStrategy = {
    render: _handleArmamentItem,
    listeners: _attachArmamentListeners
};

/**
 * Gerencia as modificações de UI para itens de Armamento.
 * @param {jQuery} html O objeto jQuery do HTML da mensagem.
 * @param {Item} item O documento do item.
 * @private
 */
function _handleArmamentItem(html, item) {
    // Verifica se é uma arma de fogo/distância
    const isRangedWeapon = item.system.types?.rangeType?.name === "ranged";
    if (!isRangedWeapon) return;
    
    // Lida com interface de munição
    const ammoData = item.getFlag("paranormal-enhancements", "ammo");
    if (ammoData) {
        _addAmmoUI(html, item, ammoData);
    }

    // Lida com interface de fogo automático (Rajada)
    const isAutomatic = item.system.conditions?.automatic === true;
    if (isAutomatic) {
        _addBurstFireUI(html, item);
    }
}

/**
 * Injeta a contagem de munição e o botão de recarga.
 * @private
 */
function _addAmmoUI(html, item, ammoData) {
    if (html.find(".ammo-info-container").length > 0) return;

    const cardButtons = html.find(".card-buttons");
    const cardFooter = html.find(".card-footer");

    const ammoInfoContainer = $(`
        <div class="ammo-info-container" style="text-align: center; font-size: 14px; margin-top: 10px; font-weight: bold;">
            ${game.i18n.localize("PE.AmmoCurrent")}: ${ammoData.current}/${ammoData.max}
        </div>
    `);
    cardFooter.before(ammoInfoContainer);
    
    const ammunitionType = item.system.types?.ammunitionType;
    if (cardButtons.length && ammunitionType) {
        const reloadButtonContainer = $(`<div class="card-buttons reload-container" style="margin-top: 5px;"></div>`);
        const reloadButton = $(`
            <button data-action="reload" style="flex-grow: 1;">
                <i class="fa-solid fa-sync"></i> ${game.i18n.localize("PE.Reload")}
            </button>
        `);
        
        reloadButtonContainer.append(reloadButton);
        cardButtons.first().after(reloadButtonContainer);
    }
}

/**
 * Injeta os botões de Ataque de Rajada e Dano de Rajada.
 * @private
 */
function _addBurstFireUI(html, item) {
    if (html.find(".burst-button-container").length > 0) return;

    const cardButtons = html.find(".card-buttons");
    if (!cardButtons.length) return;

    const burstButtonContainer = $(`<div class="card-buttons burst-button-container" style="margin-top: 5px;"></div>`);
    
    const burstAttackButton = $(`
        <button data-action="burst-attack">
            <i class="fas fa-bolt"></i> ${game.i18n.localize("PE.BurstAttack")}
        </button>
    `);
    const burstDamageButton = $(`
        <button data-action="burst-damage">
            <i class="fas fa-fire"></i> ${game.i18n.localize("PE.BurstDamage")}
        </button>
    `);

    burstButtonContainer.append(burstAttackButton).append(burstDamageButton);
    cardButtons.last().after(burstButtonContainer);
}

/**
 * Anexa os listeners de evento aos botões de armamento.
 * @private
 */
function _attachArmamentListeners(html, item, chatMessage) {
    // Clique em Ataque de Rajada
    html.find('button[data-action="burst-attack"]').on('click', (ev) => {
        ev.preventDefault();
        rollBurstAttack(item, chatMessage);
    });

    // Clique em Dano de Rajada
    html.find('button[data-action="burst-damage"]').on('click', (ev) => {
        ev.preventDefault();
        rollBurstDamage(item, chatMessage, ev);
    });

    // Clique em Recarregar
    html.find('button[data-action="reload"]').on('click', (ev) => {
        ev.preventDefault();
        reloadWeapon(item);
    });
}