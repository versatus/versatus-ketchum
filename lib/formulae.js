"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInitialEVs = exports.generateIVs = exports.calculateHP = exports.calculateStat = void 0;
/**
 * Calculates a Pokémon's non-HP stat for the first-generation games.
 *
 * @param {number} baseStat - The base stat of the Pokémon.
 * @param {number} iv - The individual value of the stat (0-15).
 * @param {number} ev - The effort value of the stat (0-65535).
 * @param {number} level - The level of the Pokémon (1-100).
 * @returns {number} The calculated stat value.
 */
function calculateStat(baseStat, iv, ev, level) {
    return Math.floor(((baseStat + iv) * 2 + Math.sqrt(ev) / 4) * level / 100 + 5);
}
exports.calculateStat = calculateStat;
/**
 * Calculates a Pokémon's HP for the first-generation games.
 *
 * @param {number} baseHP - The base HP of the Pokémon.
 * @param {number} iv - The individual value of the HP (0-15).
 * @param {number} ev - The effort value of the HP (0-65535).
 * @param {number} level - The level of the Pokémon (1-100).
 * @returns {number} The calculated HP value.
 */
function calculateHP(baseHP, iv, ev, level) {
    return Math.floor(((baseHP + iv) * 2 + Math.sqrt(ev) / 4) * level / 100 + level + 10);
}
exports.calculateHP = calculateHP;
/**
 * Generates random IVs for a Pokémon's stats in Pokémon Red and Blue.
 * Each IV can range from 0 to 15.
 *
 * @returns { { hp: number, attack: number, defense: number, speed: number, special: number } }
 * An object containing the generated IVs for each stat.
 */
function generateIVs() {
    return {
        hp: Math.floor(Math.random() * 16),
        attack: Math.floor(Math.random() * 16),
        defense: Math.floor(Math.random() * 16),
        speed: Math.floor(Math.random() * 16),
        special: Math.floor(Math.random() * 16)
    };
}
exports.generateIVs = generateIVs;
/**
 * Generates initial EVs for a level 1 Pokémon in Pokémon Red and Blue.
 * Since the Pokémon has not battled, all EVs start at 0.
 *
 * @returns { { hp: number, attack: number, defense: number, speed: number, special: number } }
 * An object containing the initial EVs (0) for each stat.
 */
function generateInitialEVs() {
    return {
        hp: 0, // Initial EVs for a level 1 Pokémon that hasn't battled
        attack: 0,
        defense: 0,
        speed: 0,
        special: 0
    };
}
exports.generateInitialEVs = generateInitialEVs;
