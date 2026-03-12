import { _applyEffectAsGM, _removeEffectsAsGM } from "../../../features/ritual-handler.js";
import { Logger } from "../utils/Logger.js";

export class SocketProvider {
  static init() {
    const lib = game.modules.get('socketlib');
    if (!lib?.active) {
        Logger.error("SocketLib não encontrado ou inativo.");
        return;
    }
    
    globalThis.paranormalSocket = socketlib.registerModule("paranormal-enhancements");

    globalThis.paranormalSocket.register("applyEffectAsGM", _applyEffectAsGM);
    globalThis.paranormalSocket.register("removeEffectsAsGM", _removeEffectsAsGM);

    Logger.log("SocketLib registrado.");
  }
}
