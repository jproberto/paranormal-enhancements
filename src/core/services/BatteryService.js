const DICE_SEQUENCE = [20, 12, 10, 8, 6, 4];

export class BatteryService {
    
    static getDieFace(index) {
        if (index < 0 || index >= DICE_SEQUENCE.length) return DICE_SEQUENCE[0];
        return DICE_SEQUENCE[index];
    }

    static calculateNextState(currentDieIndex, currentUses, isPotent, rollResult) {
        if (rollResult === 1) {
            return { isDepleted: true };
        }

        let nextDieIndex = currentDieIndex;
        let nextUses = currentUses + 1;
        const usesNeeded = isPotent ? 2 : 1;

        if (nextUses >= usesNeeded && currentDieIndex < DICE_SEQUENCE.length - 1) {
            nextDieIndex++;
            nextUses = 0;
        }

        return {
            isDepleted: false,
            nextDieIndex,
            nextUses
        };
    }
}
