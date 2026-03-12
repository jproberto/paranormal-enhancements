import { FoundryAdapter } from "../../infrastructure/adapter/FoundryAdapter.js";

export class ArmamentService {
  
  static calculateReloadAmount(current, max, availableInItem) {
    const needed = max - current;
    if (needed <= 0) return 0;
    return Math.min(needed, availableInItem);
  }

  static getBurstDamageFormula(baseFormula) {
    const simpleMatch = baseFormula.match(/^(\d*)d(\d+)/);
    if (simpleMatch) {
        const originalDiceCount = parseInt(simpleMatch[1], 10) || 1;
        const diceFace = simpleMatch[2];
        const burstDiceCount = originalDiceCount + 2;
        const burstDiceTerm = `${burstDiceCount}d${diceFace}`;
        const remainingFormula = baseFormula.replace(simpleMatch[0], "").trim();
        return [burstDiceTerm, remainingFormula].filter(part => part).join(' ');
    }
    const diceTerms = baseFormula.match(/(\d*d\d+)/g) || [];
    if (diceTerms.length > 0) {
        let highestFace = 0;
        diceTerms.forEach(term => {
            const face = parseInt(term.split('d')[1], 10);
            if (face > highestFace) highestFace = face;
        });
        const burstBonusTerm = `2d${highestFace}[${FoundryAdapter.localize("PE.Burst")}]`;
        return `${baseFormula} + ${burstBonusTerm}`;
    }
    return baseFormula;
  }

  static async calculateCriticalDice(baseFormula, multiplier) {
    const formulaParts = [];
    
    // Maximize base roll
    const maxRoll = FoundryAdapter.createRoll(baseFormula);
    await maxRoll.evaluate({ maximize: true, async: true });
    formulaParts.push(maxRoll.total);
    
    const remainingMultiplier = multiplier - 1;
    
    if (remainingMultiplier > 0) {
        const [diceCountStr, diceFace] = baseFormula.split('d');
        const diceCount = parseInt(diceCountStr) || 1;
        if (diceFace) { 
            const criticalDiceFormula = `${diceCount * remainingMultiplier}d${diceFace}`;
            formulaParts.push(criticalDiceFormula);
        }
    }
    
    return formulaParts;
  }

  /**
   * Gets other bonus damage parts from attributes and the item's damage parts array.
   * @param {Item} item
   * @returns {Array} An array of strings/numbers for the formula.
   */
  static getBonusDamageParts(item) {
    const bonusParts = [];
    const damage = item.system.formulas.damage;
    const actor = item.parent;

    if (damage.attr && actor.system.attributes[damage.attr]) {
        bonusParts.push(actor.system.attributes[damage.attr].value);
    }
    damage.parts.forEach(part => bonusParts.push(`(${part[0] || 0})`));
    
    return bonusParts;
  }
}
