import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";

export class ItemSheetService {
    /**
     * Main handler for item sheet rendering, delegating to specific handlers.
     */
    static renderItemSheetHandler(app, html, data) {
        if (!app["isEditable"]) {
            return;
        }

        const $html = $(html);

        ItemSheetService._renderCurseEffectFields(app, $html, data).then();

        if (app.item.type === "armament") {
            ItemSheetService._renderArmamentFields(app, $html);
        } else if (app.item.type === "generalEquipment") {
            ItemSheetService._renderEquipmentFields(app, $html, data);
        }
    }

    /**
     * Orchestrates the rendering of custom fields for armament items.
     * This function acts as a dispatcher, calling specific handlers for each feature.
     * @param {Application} app The application instance.
     * @param {jQuery} $html The jQuery object for the sheet's HTML.
     */
    static _renderArmamentFields(app, $html) {
        ItemSheetService._injectAmmoFields(app, $html);
        ItemSheetService._injectAdaptableGripField(app, $html);
    }

    /**
     * Injects ammo capacity and current ammo fields for ranged weapons.
     * @param {Application} app The application instance.
     * @param {jQuery} $html The jQuery object for the sheet's HTML.
     */
    static _injectAmmoFields(app, $html) {
        const ammoData = app.item.getFlag("paranormal-enhancements", "ammo") || {};
        const isRangedWeapon = app.item.system.types?.rangeType === "ranged";

        const ammoFields = $(`
            <div class="form-group" style="${(!isRangedWeapon ? 'display: none;' : '')}">
                <label class="resource-label">${FoundryAdapter.localize("PE.AmmoCapacity")}</label>
                <div class="form-fields">
                    <input type="number" name="flags.paranormal-enhancements.ammo.max" value="${ammoData.max ?? 0}" data-dtype="Number"/>
                </div>
            </div>
            <div class="form-group" style="${(!isRangedWeapon ? 'display: none;' : '')}">
                <label class="resource-label">${FoundryAdapter.localize("PE.AmmoCurrent")}</label>
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
     * Injects the "Two-Handed Damage" field, which is dynamically shown
     * when the "Adaptable Grip" checkbox is checked.
     * @param {Application} app The application instance.
     * @param {jQuery} $html The jQuery object for the sheet's HTML.
     */
    static _injectAdaptableGripField(app, $html) {
        const adaptableGripCheckbox = $html.find('input[name="system.conditions.adaptableGrip"]');
        if (adaptableGripCheckbox.length === 0) return;

        const targetContainer = adaptableGripCheckbox.closest('.resource');

        const twoHandedDamage = app.item.getFlag("paranormal-enhancements", "adaptableGrip.twoHandedDamage") || "";
        const newFieldHTML = `
            <div class="resource grid grid-2col adaptable-grip-damage-field">
                <label class="resource-label">${FoundryAdapter.localize("PE.AdaptableGrip.TwoHandedDamageLabel")}</label>
                <div class="form-fields">
                    <input type="text" name="flags.paranormal-enhancements.adaptableGrip.twoHandedDamage" value="${twoHandedDamage}" />
                </div>
            </div>
        `;
        const $newField = $(newFieldHTML);

        targetContainer.after($newField);

        const toggleTwoHandedField = () => {
            const isChecked = adaptableGripCheckbox.is(':checked');
            $newField.toggle(isChecked);
        };

        toggleTwoHandedField();
        adaptableGripCheckbox.on('change', toggleTwoHandedField);
    }

    /**
     * Orchestrates the rendering of custom fields for general equipment.
     */
    static _renderEquipmentFields(app, $html) {
        const generalAttrTab = $html.find(".tab[data-tab='generalAttr']");
        generalAttrTab.css("overflow-y", "auto");
        const existingFields = generalAttrTab.find(".resource");

        // --- Battery Fields ---
        const batteryData = app.item.getFlag("paranormal-enhancements", "battery") || {};
        const usesBattery = batteryData.uses ?? false;
        const isPotent = batteryData.isPotent ?? false;

        const batteryFieldsHTML = `
            <div class="resource">
                <div class="form-fields" style="display: flex; align-items: center; gap: 1rem;">
                    <label class="resource-label" for="uses-battery-checkbox">${FoundryAdapter.localize("PE.UsesBattery")}</label>
                    <input id="uses-battery-checkbox" type="checkbox" name="flags.paranormal-enhancements.battery.uses" ${usesBattery ? 'checked' : ''} style="margin: 0; flex: 0;"/>
                    
                    <div class="form-fields potent-battery-field" style="display: ${usesBattery ? 'flex' : 'none'}; align-items: center; gap: 0.5rem;">
                        <label class="resource-label" for="potent-battery-checkbox">${FoundryAdapter.localize("PE.PotentBattery")}</label>
                        <input id="potent-battery-checkbox" type="checkbox" name="flags.paranormal-enhancements.battery.isPotent" ${isPotent ? 'checked' : ''} style="margin: 0; flex: 0;"/>
                    </div>
                </div>
            </div>
        `;
        const $batteryFields = $(batteryFieldsHTML);
        existingFields.first().before($batteryFields);

        // --- Item Type Fields ---
        const itemType = app.item.getFlag("paranormal-enhancements", "itemType") || "none";
        const equipmentTypeSelect = $(`
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.EquipmentType")}</label>
                <div class="form-fields">
                    <select name="flags.paranormal-enhancements.itemType" data-group="itemType">
                        <option value="none" ${itemType === 'none' ? 'selected' : ''}>—</option>
                        <option value="ammunition" ${itemType === 'ammunition' ? 'selected' : ''}>${FoundryAdapter.localize("PE.Ammunition")}</option>
                        <option value="illumination" ${itemType === 'illumination' ? 'selected' : ''}>${FoundryAdapter.localize("PE.Illumination")}</option>
                    </select>
                </div>
            </div>
        `);
        
        $batteryFields.last().after(equipmentTypeSelect);
        
        // --- Dynamic Fields for Item Type ---
        const injectedFieldsContainer = $(`<div class="injected-fields-container"></div>`);
        equipmentTypeSelect.after(injectedFieldsContainer);

        const updateFields = () => {
            injectedFieldsContainer.empty();
            const currentType = equipmentTypeSelect.find('select').val();

            if (currentType === "ammunition") {
                ItemSheetService._renderAmmunitionFields(app, injectedFieldsContainer);
            } else if (currentType === "illumination") {
                ItemSheetService._renderIlluminationFields(app, injectedFieldsContainer);
            }
        };

        updateFields();
        equipmentTypeSelect.find('select').change(updateFields);

        // --- Event Listener for Battery Checkbox ---
        const usesBatteryCheckbox = generalAttrTab.find('input[name="flags.paranormal-enhancements.battery.uses"]');
        const potentBatteryField = generalAttrTab.find('.potent-battery-field');

        usesBatteryCheckbox.on('change', (event) => {
            potentBatteryField.toggle(event.currentTarget.checked);
        });
    }

    /**
     * Injects ammunition-specific fields.
     */
    static _renderAmmunitionFields(app, container) {
        const ammoQuantity = app.item.getFlag("paranormal-enhancements", "ammoQuantity") ?? 0;
        const ammoFields = $(`
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.AmmoQuantity")}</label>
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
    static _renderIlluminationFields(app, container) {
        const lightData = app.item.getFlag("paranormal-enhancements", "light") || {};
        const lightFields = $(`
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.DimLightDistance")}</label>
                <div class="form-fields">
                    <input type="number" name="flags.paranormal-enhancements.light.dim" value="${lightData.dim ?? 0}" data-dtype="Number"/>
                </div>
            </div>
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.BrightLightDistance")}</label>
                <div class="form-fields">
                    <input type="number" name="flags.paranormal-enhancements.light.bright" value="${lightData.bright ?? 0}" data-dtype="Number"/>
                </div>
            </div>
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.LightColor")}</label>
                <div class="form-fields" style="display: flex; align-items: center; gap: 5px;">
                    <input class="color" type="text" name="flags.paranormal-enhancements.light.color" value="${lightData.color ?? '#ffffff'}"/>
                    <input type="color" value="${lightData.color ?? '#ffffff'}" style="min-width: 30px; min-height: 24px; padding: 0;">
                </div>
            </div>
            <div class="resource grid align-items-center">
                <label class="resource-label">${FoundryAdapter.localize("PE.LightAngle")}</label>
                <div class="form-fields">
                    <input type="number" name="flags.paranormal-enhancements.light.angle" value="${lightData.angle ?? 360}" data-dtype="Number"/>
                </div>
            </div>
        `);
        container.append(lightFields);

        const colorTextInput = container.find('input[type="text"][name="flags.paranormal-enhancements.light.color"]');
        const colorPickerInput = colorTextInput.next('input[type="color"]');
        
        if (colorPickerInput.length) {
            colorPickerInput.on('input', (event) => {
                colorTextInput.val(event.currentTarget.value);
            });
        }
    }

    static async _renderCurseEffectFields(app, $html) {
        const effectsTab = $html.find(".tab[data-tab='effects']");
        if (effectsTab.length === 0) return;

        effectsTab.css("overflow-y", "auto");
        
        const curseData = app.item.getFlag("paranormal-enhancements", "curse") || {};
        const curseElement = curseData.element ?? "";
        const isCurseActive = curseData.active ?? false;
        
        const curseFieldsHTML = `
            <fieldset class="resource-type curse-fields-wrapper">
                <legend>${FoundryAdapter.localize("PE.CurseTabTitle")}</legend>

                <div class="resource">
                    <div class="form-fields" style="display: flex; align-items: center; gap: 1rem;">
                        <label class="resource-label" for="curse-in-use-checkbox">${FoundryAdapter.localize("PE.CurseInUse")}</label>
                        <input id="curse-in-use-checkbox" type="checkbox" name="flags.paranormal-enhancements.curse.active" ${isCurseActive ? 'checked' : ''} style="margin: 0; flex: 0;"/>
                    </div>
                </div>

                <div class="resource curse-element-field">
                    <div class="form-fields" style="display: flex; align-items: center; gap: 1rem;">
                        <label class="resource-label" for="curse-element-select">${FoundryAdapter.localize("PE.CurseElement.Label")}</label>
                        <select id="curse-element-select" name="flags.paranormal-enhancements.curse.element">
                            <option value="" ${curseElement === '' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.None")}</option>
                            <option value="Blood" ${curseElement === 'Blood' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.Blood")}</option>
                            <option value="Death" ${curseElement === 'Death' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.Death")}</option>
                            <option value="Knowledge" ${curseElement === 'Knowledge' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.Knowledge")}</option>
                            <option value="Energy" ${curseElement === 'Energy' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.Energy")}</option>
                            <option value="Fear" ${curseElement === 'Fear' ? 'selected' : ''}>${FoundryAdapter.localize("PE.CurseElement.Fear")}</option>
                        </select>
                    </div>
                </div>
            </fieldset>
        `;

        effectsTab.append(curseFieldsHTML);

        const curseFieldsWrapper = effectsTab.find('.curse-fields-wrapper');
        const targetContainer = effectsTab.find('.content-item');

        if (curseFieldsWrapper.length > 0 && targetContainer.length > 0) {
            targetContainer.append(curseFieldsWrapper);
        }
    }
}
