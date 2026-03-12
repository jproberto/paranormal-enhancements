import { ArmamentWrapperService } from "../services/ArmamentWrapperService.js";
import { Logger } from "../utils/Logger.js";

export class LibWrapperRegistry {
  static register() {
    if (!game.modules.get('lib-wrapper')?.active) {
        if (game.user.isGM) {
            Logger.warn("The 'lib-wrapper' module is not active. Some features may not work correctly.");
        }
        return;
    }

    Logger.log("Registering libWrapper mixins...");

    libWrapper.register(
        "paranormal-enhancements", 
        "CONFIG.Item.documentClass.prototype.rollAttack", 
        ArmamentWrapperService.wrapRollAttack, 
        "MIXED"
    );

    libWrapper.register(
        "paranormal-enhancements", 
        "CONFIG.Item.documentClass.prototype.rollDamage", 
        ArmamentWrapperService.wrapRollDamage, 
        "MIXED"
    );
  }
}
