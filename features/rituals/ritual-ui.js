import { executeRitual, getRitualClass, terminateRitual } from "../ritual-handler.js";

export async function showPreRollDialog(item) {
    const slug = item.name.slugify();
    const ritualClass = await getRitualClass(slug);
    
    if (!ritualClass) return;

    new Dialog({
        title: item.name,
        content: _getDialogContent(item),
        buttons: {},
        render: (html) => _onRender(html, item, ritualClass) 
    }).render(true);
}

function _getDialogContent(item) {
    const { studentForm, trueForm } = item.system;

    return `
        <form class="pe-dialog">
            <div class="pe-selectors">
                <div class="form-group">
                    <label>Versão</label>
                    <select id="ritual-version">
                        <option value="base">Básica</option>
                        ${studentForm ? `<option value="student">Discente</option>` : ""}
                        ${trueForm ? `<option value="true">Verdadeira</option>` : ""}
                    </select>
                </div>
                <div class="form-group pe-checkbox-group">
                    <label><input type="checkbox" id="is-full-cast"> Conjuração Completa</label>
                </div>
            </div>

            <div class="pe-preview-container">
                <div class="pe-header">
                    <span id="pe-element">---</span>
                    <span id="pe-circle">---</span>
                    <span>Custo: <strong id="pe-cost">0</strong> PE</span>
                </div>
                
                <div class="pe-stats-grid">
                    <div><strong>Execução:</strong> <span id="pe-execution">---</span></div>
                    <div><strong>Alcance:</strong> <span id="pe-range">---</span></div>
                    <div><strong>Alvo:</strong> <span id="pe-target">---</span></div>
                    <div><strong>Duração:</strong> <span id="pe-duration">---</span></div>
                    <div class="pe-full-row" id="pe-requirements-row">
                        <strong>Requisitos:</strong> <span id="pe-requirements">---</span>
                    </div>
                </div>

                <div class="pe-description-box">
                    <p id="pe-description-text">Carregando...</p>
                </div>

                <div class="pe-footer">
                    
                </div>
            </div>

            <div class="pe-button-grid">
                <button type="button" class="pe-btn" data-action="spendPe">
                    <i class="fas fa-coins"></i> ${game.i18n.localize("PE.Ritual.Button.SpendPE")}
                </button>
                <button type="button" class="pe-btn" data-action="roll">
                    <i class="fas fa-dice-d20"></i> ${game.i18n.localize("PE.Ritual.Button.Roll")}
                </button>
                <button type="button" class="pe-btn" data-action="chat">
                    <i class="fas fa-comment"></i> ${game.i18n.localize("PE.Ritual.Button.Chat")}
                </button>
                <button type="button" class="pe-btn" data-action="cast">
                    <i class="fas fa-hand-sparkles"></i> ${game.i18n.localize("PE.Ritual.Button.Cast")}
                </button>
            </div>
        </form>
    `;
}

function _onRender(html, item, ritualClass) {
    _updatePreview(html, item, ritualClass);

    html.find('#ritual-version, #is-full-cast').on('change', () => {
        _updatePreview(html, item, ritualClass);
    });

    html.find('.pe-btn').on('click', (ev) => {
        const action = ev.currentTarget.dataset.action;
        _process(item, {}, action, html); 
    });
}

function _updatePreview(html, item, ritualClass) {
    const version = html.find('#ritual-version').val();
    const isFull = html.find('#is-full-cast').is(':checked');
    const slug = item.name.slugify();

    const mechanics = ritualClass.getMechanics(version, isFull);
    const description = _getRitualDescription(slug, version, isFull);

    const targetData = mechanics.target;
    const formattedTarget = (typeof targetData === "object") 
        ? game.i18n.format(targetData.key, { number: targetData.number })
        : game.i18n.localize(targetData);

    const reqText = _getRequirementsText(mechanics.requirements);

    html.find('#pe-element').text(game.i18n.localize(`PE.Elements.${item.system.element}`));
    html.find('#pe-circle').text(`${item.system.circle}º Círculo`);
    html.find('#pe-requirements').html(reqText);
    html.find('#pe-execution').text(game.i18n.localize(mechanics.execution));
    html.find('#pe-range').text(game.i18n.localize(mechanics.range));
    html.find('#pe-target').text(formattedTarget);
    html.find('#pe-duration').text(game.i18n.localize(mechanics.duration));
    html.find('#pe-cost').text(mechanics.cost);
    html.find('#pe-description-text').html(description);
}

async function _process(item, originalMessage, action, html) {
    const version = html.find('#ritual-version').val();
    const isFull = html.find('#is-full-cast').is(':checked');
    
    const ritualClass = await getRitualClass(item.name.slugify());
    const mechanics = ritualClass.getMechanics(version, isFull);

    const context = { item, originalMessage, mechanics, version, isFull };

    switch (action) {
        case "spendPe":
            _handleSpendPe(context);
            break;
        case "roll":
            _handleOccultismRoll(context);
            break;
        case "chat":
            _handleSendChat(context);
            break;
        case "cast":
            _handleCast(context);
            break;
    }
}

async function _handleSpendPe(context) {
    const { item, mechanics } = context;
    const initialCost = mechanics.cost;

    const content = `
        <form>
            <div class="form-group">
                <label>${game.i18n.localize("PE.Ritual.Spend.Label")}</label>
                <input type="number" id="final-pe-cost" value="${initialCost}">
            </div>
        </form>
    `;

    new Dialog({
        title: `${game.i18n.localize("PE.Ritual.Spend.Title")}: ${item.name}`,
        content: content,
        buttons: {
            confirm: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("PE.Ritual.Spend.Confirm"),
                callback: async (html) => {
                    const finalCost = Number.parseInt(html.find('#final-pe-cost').val());
                    const actor = item.actor;

                    if (!actor) return;

                    const currentPe = actor.system.PE?.value ?? 0;

                    if (currentPe < finalCost) {
                        return ui.notifications.warn(
                            game.i18n.format("PE.Ritual.Spend.ErrorInsufficient", {
                                current: currentPe,
                                required: finalCost
                            })
                        );
                    }

                    const newPe = currentPe - finalCost;
                    await actor.update({ "system.PE.value": newPe });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancelar"
            }
        },
        default: "confirm"
    }).render(true);
}

async function _handleSendChat(context) {
    const { item, mechanics, version, isFull } = context;
    const slug = item.name.slugify();
    
    const localizedElement = game.i18n.localize(`PE.Elements.${item.system.element}`);
    const versionLabel = game.i18n.localize(`PE.Ritual.Version.${version.capitalize()}`);
    const castLabel = isFull 
        ? game.i18n.localize("PE.Ritual.Execution.Complete") 
        : game.i18n.localize("PE.Ritual.Execution.Standard");

    const reqText = _getRequirementsText(mechanics.requirements);

    const targetData = mechanics.target;
    const formattedTarget = (typeof targetData === "object") 
        ? game.i18n.format(targetData.key, { number: targetData.number })
        : game.i18n.localize(targetData);

    const description = _getRitualDescription(slug, version, isFull);

    const chatContent = `
        <div class="pe-chat-card">
            <h3 class="pe-chat-title">${item.name}</h3>
            <div class="pe-chat-header">
                <div><strong>${localizedElement}</strong> | <span>${item.system.circle}º Círculo</span> | <span class="pe-tag">${versionLabel}</span> | <span class="pe-tag">${castLabel}</span></div>
                <div><span class="pe-tag" id="pe-requirements-row">Requisitos: ${reqText}</span></div>
            </div>
            
            <div class="pe-chat-stats">
                <p><strong>Custo:</strong> ${mechanics.cost} PE</p>
                <p><strong>Execução:</strong> ${game.i18n.localize(mechanics.execution)}</p>
                <p><strong>Alcance:</strong> ${game.i18n.localize(mechanics.range)}</p>
                <p><strong>Alvo:</strong> ${formattedTarget}</p>
                <p><strong>Duração:</strong> ${game.i18n.localize(mechanics.duration)}</p>
            </div>
            <div class="pe-chat-description">${description}</div>
            <div class="pe-chat-footer">
               
            </div>
        </div>
    `;

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        content: chatContent,
        flags: { "paranormal-enhancements": { isAuthorized: true } }
    });
}

function _getRequirementsText(requirements) {
    if (!requirements) return "-";

    const parts = [];

    if (requirements.circle) {
        parts.push(game.i18n.format("PE.Ritual.Requirement.Circle", { circle: requirements.circle }));
    }

    if (requirements.affinity) {
        parts.push(game.i18n.localize("PE.Ritual.Requirement.Affinity"));
    }

    if (parts.length === 0) return "-";

    const list = parts.join(` ${game.i18n.localize("PE.And")} `);
    return `${list}`;
}

async function _handleCast(context) {
    executeRitual(context);
}

async function _handleOccultismRoll(context) {
    const { item, mechanics } = context;
    const dt = 20 + mechanics.cost;
    const actor = item.actor;

    const rolls = await actor.rollSkill({ skill: "occultism" });

    if (!rolls || rolls.length === 0) {
        return ui.notifications.info(game.i18n.localize("PE.Ritual.Roll.Canceled"));
    }

    const total = rolls[0].total;
    let sanLoss = 0;
    let resultKey;

    if (total >= dt) {
        resultKey = "PE.Ritual.Roll.Success";
        ui.notifications.info(game.i18n.localize(resultKey));
    } else {
        const diff = dt - total;
        sanLoss = mechanics.cost;

        if (diff > 11) {
            sanLoss += Math.floor(mechanics.cost / 2);
            resultKey = "PE.Ritual.Roll.Fumble";
        } else {
            resultKey = "PE.Ritual.Roll.Failure";
        }

        const currentSan = actor.system.SAN?.value ?? 0;
        const newSan = Math.max(0, currentSan - sanLoss);
        
        await actor.update({ "system.SAN.value": newSan });
        
        ui.notifications.warn(game.i18n.format(resultKey, { damage: sanLoss }));
    }

    const flavor = game.i18n.format("PE.Ritual.Roll.Title", { dt });
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
            <div class="pe-chat-card">
                <div class="pe-roll-summary">
                    <span>${game.i18n.format(resultKey, { damage: sanLoss })}</span>
                </div>
            </div>`,
        flavor: flavor
    });
}

function _getRitualDescription(slug, version, isFull) {
    const mode = isFull ? "Complete" : "Standard";
    
    const i18nKey = `PE.Ritual.Description.${slug}.${mode}.${version}`;
    const localized = game.i18n.localize(i18nKey);

    return localized === i18nKey ? game.i18n.localize("PE.Ritual.NoDescription") : localized;
}

export async function selectTargetWeapon(actor, options) {
    options = options || { rangeType: "melee" };
    const weapons = _getFilteredWeapons(actor, options);

    if (weapons.length === 0) {
        const typeLabel = options.rangeType === "melee" ? "corpo a corpo" : "à distância";
        ui.notifications.warn(`O alvo não possui armas ${typeLabel}.`);
        return null;
    }

    if (weapons.length === 1) return weapons[0];

    return new Promise((resolve) => {
        new Dialog({
            title: "Selecione a Arma",
            content: `<p>Escolha a arma que receberá o ritual:</p>`,
            buttons: _buildWeaponButtons(weapons, resolve),
            default: weapons[0].id,
            render: (html) => html.closest('.app').addClass('pe-weapon-selection-dialog'),
            close: () => resolve(null)
        }).render(true);
    });
}

function _getFilteredWeapons(actor, options) {
    return actor.items.filter(i => 
        i.type === "armament" && 
        (!options.rangeType || i.system.types?.rangeType?.name === options.rangeType)
    );
}

function _buildWeaponButtons(weapons, resolve) {
    const MAX_CHAR = 15;

    return weapons.reduce((buttons, weapon) => {
        const displayName = weapon.name.length > MAX_CHAR 
            ? weapon.name.substring(0, MAX_CHAR) + "..." 
            : weapon.name;

        buttons[weapon.id] = {
            label: `
                <div class="pe-weapon-button-content" title="${weapon.name}">
                    <img src="${weapon.img}" width="32" height="32" alt="${weapon.name}">
                    <span>${displayName}</span>
                </div>`,
            callback: () => resolve(weapon)
        };
        return buttons;
    }, {});
}

export class ActiveRitualsApp extends Application {
    constructor(options = {}) {
        super(options);
        this.actor = game.user.character || canvas.tokens.controlled[0]?.actor;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "pe-active-rituals-app",
            title: "Rituais Ativos",
            template: "modules/paranormal-enhancements/templates/active-rituals.hbs",
            width: 350,
            height: "auto",
            resizable: true,
            submitOnChange: true,
            closeOnLogOut: true
        });
    }

    getData() {
        if (!this.actor) {
            return { rituals: [], actorName: "Nenhum ator selecionado" };
        }

        const activeRituals = this.actor.getFlag("paranormal-enhancements", "active-rituals") || {};
        
        return {
            rituals: Object.values(activeRituals),
            actorName: this.actor.name
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.pe-btn-terminate').on('click', async (ev) => {
            ev.preventDefault();
            const btn = ev.currentTarget;
            const instanceId = btn.closest(".pe-ritual-item").dataset.instanceId;
            
            if (this.actor && instanceId) {
                btn.disabled = true;
                await terminateRitual(instanceId, this.actor);
            }
        });
        
        this._updateHandler = (actor, data) => this._onActorUpdate(actor, data);
        Hooks.on('updateActor', this._updateHandler);
    }

    async close(options = {}) {
        Hooks.off('updateActor', this._updateHandler);
        return super.close(options);
    }

    _onActorUpdate(actor, changed) {
        if (!this.actor) return;

        const flagChanged = foundry.utils.hasProperty(changed, "flags.paranormal-enhancements.active-rituals");
        
        if (actor.id === this.actor.id && flagChanged) {
            this.render(false);
        }
    }
}
