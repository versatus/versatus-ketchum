/**
 * Calculates a Pokémon's non-HP stat for the first-generation games.
 *
 * @param {number} baseStat - The base stat of the Pokémon.
 * @param {number} iv - The individual value of the stat (0-15).
 * @param {number} ev - The effort value of the stat (0-65535).
 * @param {number} level - The level of the Pokémon (1-100).
 * @returns {number} The calculated stat value.
 */
export function calculateStat(
  baseStat: number,
  iv: number,
  ev: number,
  level: number,
): number {
  return Math.floor(
    (((baseStat + iv) * 2 + Math.sqrt(ev) / 4) * level) / 100 + 5,
  )
}

/**
 * Calculates a Pokémon's HP for the first-generation games.
 *
 * @param {number} baseHP - The base HP of the Pokémon.
 * @param {number} iv - The individual value of the HP (0-15).
 * @param {number} ev - The effort value of the HP (0-65535).
 * @param {number} level - The level of the Pokémon (1-100).
 * @returns {number} The calculated HP value.
 */
export function calculateHP(
  baseHP: number,
  iv: number,
  ev: number,
  level: number,
): number {
  return Math.floor(
    (((baseHP + iv) * 2 + Math.sqrt(ev) / 4) * level) / 100 + level + 10,
  )
}

/**
 * Generates random IVs for a Pokémon's stats in Pokémon Red and Blue.
 * Each IV can range from 0 to 15.
 *
 * @returns { { hp: number, attack: number, defense: number, speed: number, special: number } }
 * An object containing the generated IVs for each stat.
 */
export function generateIVs(): {
  hp: number
  attack: number
  defense: number
  speed: number
  special: number
} {
  return {
    hp: Math.floor(Math.random() * 16),
    attack: Math.floor(Math.random() * 16),
    defense: Math.floor(Math.random() * 16),
    speed: Math.floor(Math.random() * 16),
    special: Math.floor(Math.random() * 16),
  }
}

/**
 * Generates initial EVs for a level 1 Pokémon in Pokémon Red and Blue.
 * Since the Pokémon has not battled, all EVs start at 0.
 *
 * @returns { { hp: number, attack: number, defense: number, speed: number, special: number } }
 * An object containing the initial EVs (0) for each stat.
 */
export function generateInitialEVs(): {
  hp: number
  attack: number
  defense: number
  speed: number
  special: number
} {
  return {
    hp: 0, // Initial EVs for a level 1 Pokémon that hasn't battled
    attack: 0,
    defense: 0,
    speed: 0,
    special: 0,
  }
}

type EVs = {
  hp: number
  attack: number
  defense: number
  speed: number
  special: number
  [key: string]: number // Adding an index signature
}
/**
 * Updates the EVs of a Pokémon after a training session.
 * In the original Pokémon Red/Blue, EVs are gained through battling.
 * This function simulates gaining EVs through a simulated training session,
 * with each session providing a random increase to one or more stats.
 * There are caps for each stat to prevent over-inflation, aligning with
 * the mechanics from the original games where the total EVs cannot exceed certain limits.
 *
 * @param {Object} currentEVs - The current EVs of the Pokémon.
 * @returns {Object} The updated EVs after the training session.
 */
const updateEVs = (
  currentEVs: EVs,
): {
  hp: number
  attack: number
  defense: number
  speed: number
  special: number
} => {
  // The maximum EVs a single stat can have
  const maxEV = 65535
  // The total EV gain from a training session can be a small random value, for simplicity
  const evGain = Math.floor(Math.random() * 10) + 1 // Gain between 1 and 10 EV points

  // Choose a stat to increase at random. Alternatively, you could increase all stats or select based on the training type.
  const stats = ['hp', 'attack', 'defense', 'speed', 'special']
  const statToIncrease = stats[Math.floor(Math.random() * stats.length)]

  // Update the chosen stat with EV gain, ensuring it does not exceed the maxEV limit
  currentEVs[statToIncrease] = Math.min(
    currentEVs[statToIncrease] + evGain,
    maxEV,
  )

  return currentEVs
}
