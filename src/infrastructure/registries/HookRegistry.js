import { Logger } from "../utils/Logger.js";
import { FoundryAdapter } from "../adapter/FoundryAdapter.js";

// --- Legacy Imports (To be removed after full migration) ---


// --- New Architecture Imports ---
import { IlluminationController } from "../../application/controllers/IlluminationController.js";
import { ItemSheetService } from "../../application/services/ItemSheetService.js";
import { ChatService } from "../../application/services/ChatService.js";
import { CurseController } from "../../application/controllers/CurseController.js";

export class HookRegistry {
  static register() {
    Logger.log("Registering hooks...");

    this._registerSheetHooks();
    this._registerChatHooks();
    this._registerRollHooks();
    this._registerEventsHooks();
    this._registerCurseHooks();
  }

  static _registerSheetHooks() {
      FoundryAdapter.registerHook("renderOrdemItemSheet", ItemSheetService.renderItemSheetHandler);
  }

  static _registerChatHooks() {
      FoundryAdapter.registerHook("renderChatMessage", ChatService.renderChatCardHandler);
      FoundryAdapter.registerHook("preCreateChatMessage", (message, data, options, userId) => {
          return ChatService.handleRitualPreCreate(message, data, options, userId);
      });
  }

  static _registerRollHooks() {
      FoundryAdapter.registerHook("ordemparanormal.rollFormula", async (item) => {
          if (item?.getFlag("itemacro", "macro") && item.executeMacro) {
              await item.executeMacro();
          }
      });
  }

  static _registerEventsHooks() {
      FoundryAdapter.registerHook("paranormal-enhancements.batteryDepleted", (item) => {
          const itemType = item.getFlag("paranormal-enhancements", "itemType");
          if (itemType === "illumination") {
              IlluminationController.turnOffLight(item);
          }
      });
  }

  static _registerCurseHooks() {
      FoundryAdapter.registerHook("op.postAttributeCheckRollConfiguration", (roll, result) => {
          CurseController.applyCurseEffects(result.subject, result.attributeId);
      });

      FoundryAdapter.registerHook("op.postSkillRollConfiguration", (roll, result) => {
          const actor = result.subject;
          const skill = actor.system.skills[result.skill];
          if (skill) CurseController.applyCurseEffects(actor, skill.attr[0]);
      });

      FoundryAdapter.registerHook("ordemparanormal.rollFormula", (rollData) => {
          const attribute = rollData.system.formulas.attack.attr;
          if (attribute) CurseController.applyCurseEffects(rollData.actor, attribute);
      });
  }
}
