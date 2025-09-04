# JP's Paranormal Enhancements – Features Details

This document provides **technical details** of each feature for contributors and advanced users.

---

## 🔫 Ammo Tracking

**Functions:**
- `reloadWeapon(weapon)` – Reload a ranged weapon from inventory.
- `wrapRollAttack(wrapped, ...args)` – Wraps the attack roll, consuming ammo.

**Flags Overview:**

| Flag | Property | Type | Description |
|------|----------|------|-------------|
| `ammo` | `current` | number | Current ammo loaded in the weapon |
| `ammo` | `max` | number | Maximum ammo capacity for the weapon |
| `itemType` | `ammunition` | string | Identifies items as ammunition for reloading |

**Limitations:**
- Ammunition item must have the **same name** as the ammo type expected by the weapon.

**Future Improvements:**
- Flexible ammo matching (ignore exact name, match by type or category).

---

## 💥 Critical Damage Enhancement

**Functions:**
- `wrapRollDamage(wrapped, options)` – Wraps the original damage roll to implement custom critical damage.

**Behavior:**
- Maximizes base damage dice on critical hits.  
- Adds additional critical dice according to the multiplier.  
- Includes other formula parts such as attributes or bonuses.  
- Sends the roll to chat with a custom flavor text.

**Notes:**
- Applied only when `options.critical.isCritical` is `true`.  
- Multiplier defaults to x2 if not specified.

---

## 🔦 Flashlights / Illumination

**Functions:**
- `toggleIllumination(actorId, itemId)` – Toggles light state and updates token light.

**Flags Overview:**

| Flag | Property | Type | Description |
|------|----------|------|-------------|
| `light` | `isOn` | boolean | Whether the light is currently on |
| `light` | `dim` | number | Dim radius of the light |
| `light` | `bright` | number | Bright radius of the light |
| `light` | `color` | string | Light color (hex) |
| `light` | `angle` | number | Light angle (degrees) |
| `light` | `animation` | object | Animation configuration (`type`, `speed`, `intensity`) |

**Notes:**
- Defaults are applied if dim/bright are not configured.  
- System prioritizes controlled token, then any token of the actor.

---

## 🔋 Battery Management

**Functions:**
- `checkBattery(item)` – Roll progressive dice to check battery status.  
- `rechargeBattery(item)` – Reset battery to full power (d20).

**Flags Overview:**

| Flag | Property | Type | Description |
|------|----------|------|-------------|
| `battery` | `dieIndex` | number | Current index in dice sequence `[20,12,10,8,6,4]` |
| `battery` | `usesOnDie` | number | Number of uses on the current die |
| `battery` | `hasPower` | boolean | Whether the battery is active |
| `battery` | `isPotent` | boolean | Optional; requires 2 uses per die increment |

**Notes:**
- Notifications inform players of battery success/failure.  
- Progressive dice simulate battery degradation.  

**Future Improvements:**
- Automatic battery depletion over time or usage.  
- Advanced effects when battery fails (e.g., item malfunction).

---

## Contribution Guidelines

- Follow **Foundry VTT module structure** for new features.  
- Use `game.i18n.localize()` for all user-facing text.  
- Add or update **flags** consistently under `paranormal-enhancements`.  
- Document new features here in `FEATURES.md`.

---

## Changelog

- **v1.0.0** – Initial release with Ammo Tracking, Critical Damage Enhancement, Flashlights, and Battery Management.
