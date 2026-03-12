export class ArmamentDialogs {
  static async promptAdaptableGrip(defaultFormula, twoHandedFormula) {
    return new Promise(resolve => {
        new Dialog({
            title: game.i18n.localize("PE.AdaptableGrip.DialogTitle"),
            content: `<p>${game.i18n.localize("PE.AdaptableGrip.DialogContent")}</p>`,
            buttons: {
                oneHand: {
                    label: game.i18n.localize("PE.AdaptableGrip.Button1Hand"),
                    callback: () => resolve(defaultFormula)
                },
                twoHands: {
                    label: game.i18n.localize("PE.AdaptableGrip.Button2Hands"),
                    callback: () => resolve(twoHandedFormula)
                }
            },
            default: "oneHand",
            close: () => resolve(null)
        }).render(true);
    });
  }
}
