import { log } from "../paranormal-enhancements.js";

/**
 * Main handler for item sheet rendering, delegating to specific handlers.
 */
export function renderItemSheetHandler(app, html, data) {
    if (!app.isEditable) {
        return;
    }

    log("Rendering item sheet for item:", data.item.name);

    const $html = $(html);

    if (app.item.type === "armament") {
        _renderArmamentFields(app, $html, data);
    } else if (app.item.type === "generalEquipment") {
        _renderEquipmentFields(app, $html, data);
    }
}

/**
 * Injects ammo fields into the armament item sheet.
 */
function _renderArmamentFields(app, $html, data) {
    const ammoData = app.item.getFlag("paranormal-enhancements", "ammo") || {};
    const isRangedWeapon = app.item.system.types?.rangeType?.name === "ranged";

    const ammoFields = $(`
        <div class="form-group" style="${isRangedWeapon ? '' : 'display: none;'}">
            <label class="resource-label">${game.i18n.localize("PE.AmmoCapacity")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.ammo.max" value="${ammoData.max ?? 0}" data-dtype="Number"/>
            </div>
        </div>
        <div class="form-group" style="${isRangedWeapon ? '' : 'display: none;'}">
            <label class="resource-label">${game.i18n.localize("PE.AmmoCurrent")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.ammo.current" value="${ammoData.current ?? 0}" data-dtype="Number"/>
            </div>
        </div>
    `);

    const tiposFieldset = $html.find(".tab[data-tab='armamentCombat'] fieldset.resource-type").first();
    tiposFieldset.append(ammoFields);

    const weaponTypeSelect = $html.find("select[name='system.types.rangeType.name']");
    const toggleAmmoFields = () => {
        const isRanged = weaponTypeSelect.val() === "ranged";
        ammoFields.toggle(isRanged);
    };

    toggleAmmoFields();
    weaponTypeSelect.change(toggleAmmoFields);
}

/**
 * Orchestrates the rendering of custom fields for general equipment.
 */
function _renderEquipmentFields(app, $html, data) {
    const itemType = app.item.getFlag("paranormal-enhancements", "itemType") || "none";
    const equipmentTypeSelect = $(`
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.EquipmentType")}</label>
            <div class="form-fields">
                <select name="flags.paranormal-enhancements.itemType" data-group="itemType">
                    <option value="none" ${itemType === 'none' ? 'selected' : ''}>—</option>
                    <option value="ammunition" ${itemType === 'ammunition' ? 'selected' : ''}>${game.i18n.localize("PE.Ammunition")}</option>
                    <option value="illumination" ${itemType === 'illumination' ? 'selected' : ''}>${game.i18n.localize("PE.Illumination")}</option>
                </select>
            </div>
        </div>
    `);

    const generalAttrTab = $html.find(".tab[data-tab='generalAttr']");
    // FIX: Make the entire tab scrollable, which is more robust than a fixed-height div.
    generalAttrTab.css("overflow-y", "auto");

    const existingFields = generalAttrTab.find(".resource");
    
    existingFields.first().after(equipmentTypeSelect);
    
    // This container is now just for grouping, not for styling the scrollbar.
    const injectedFieldsContainer = $(`<div class="injected-fields-container"></div>`);
    equipmentTypeSelect.after(injectedFieldsContainer);

    const updateFields = () => {
        injectedFieldsContainer.empty();
        const currentType = equipmentTypeSelect.find('select').val();

        if (currentType === "ammunition") {
            _renderAmmunitionFields(app, injectedFieldsContainer);
        } else if (currentType === "illumination") {
            _renderIlluminationFields(app, injectedFieldsContainer);
        }
    };

    updateFields();
    equipmentTypeSelect.find('select').change(updateFields);
}

/**
 * Injects ammunition-specific fields.
 */
function _renderAmmunitionFields(app, container) {
    const ammoQuantity = app.item.getFlag("paranormal-enhancements", "ammoQuantity") ?? 0;
    const ammoFields = $(`
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.AmmoQuantity")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.ammoQuantity" value="${ammoQuantity}" data-dtype="Number"/>
            </div>
        </div>
    `);
    container.append(ammoFields);
}

/**
 * Injects illumination-specific fields.
 */
function _renderIlluminationFields(app, container) {
    const lightData = app.item.getFlag("paranormal-enhancements", "light") || {};
    const lightFields = $(`
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.DimLightDistance")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.light.dim" value="${lightData.dim ?? 0}" data-dtype="Number"/>
            </div>
        </div>
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.BrightLightDistance")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.light.bright" value="${lightData.bright ?? 0}" data-dtype="Number"/>
            </div>
        </div>
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.LightColor")}</label>
            <div class="form-fields">
                <input type="text" name="flags.paranormal-enhancements.light.color" value="${lightData.color ?? ''}" data-dtype="String"/>
            </div>
        </div>
        <div class="resource grid align-items-center">
            <label class="resource-label">${game.i18n.localize("PE.LightAngle")}</label>
            <div class="form-fields">
                <input type="number" name="flags.paranormal-enhancements.light.angle" value="${lightData.angle ?? 360}" data-dtype="Number"/>
            </div>
        </div>
    `);
    container.append(lightFields);
}
