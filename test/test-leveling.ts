function calculateLevelSlow(exp: number): number {
  return Math.floor(Math.pow((4 * exp) / 5, 1 / 3))
}

function calculateLevelMedium(exp: number): number {
  return Math.floor(Math.pow(exp, 1 / 3))
}

function calculateLevelFast(exp: number): number {
  return Math.floor(Math.pow((5 * exp) / 4, 1 / 3))
}

function calculateLevelMediumSlow(exp: number): number {
  for (let level = 1; ; level++) {
    let requiredExp =
      (6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140
    if (exp < requiredExp) return level - 1
  }
}

function calculateLevelErratic(exp: number): number {
  for (let level = 1; ; level++) {
    let requiredExp
    if (level <= 50) {
      requiredExp = (level ** 3 * (100 - level)) / 50
    } else if (level <= 68) {
      requiredExp = (level ** 3 * (150 - level)) / 100
    } else if (level <= 98) {
      requiredExp =
        (level ** 3 *
          (1274 +
            Math.pow(level % 3, 2) -
            9 * (level % 3) -
            20 * Math.floor(level / 3))) /
        1000
    } else {
      requiredExp = (level ** 3 * (160 - level)) / 100
    }
    if (exp < requiredExp) return level - 1
  }
}

function calculateLevelFluctuating(exp: number): number {
  for (let level = 1; ; level++) {
    let requiredExp
    if (level <= 15) {
      requiredExp = (level ** 3 * (24 + Math.floor((level + 1) / 3))) / 50
    } else if (level <= 35) {
      requiredExp = (level ** 3 * (14 + level)) / 50
    } else {
      requiredExp = (level ** 3 * (32 + Math.floor(level / 2))) / 50
    }
    if (exp < requiredExp) return level - 1
  }
}

// Example usage
console.log('Level for Slow (10000 exp):', calculateLevelSlow(10000))
console.log('Level for Medium (10000 exp):', calculateLevelMedium(10000))
console.log('Level for Fast (10000 exp):', calculateLevelFast(10000))
console.log(
  'Level for Medium Slow (10000 exp):',
  calculateLevelMediumSlow(10000),
)
console.log('Level for Erratic (10000 exp):', calculateLevelErratic(10000))
console.log(
  'Level for Fluctuating (10000 exp):',
  calculateLevelFluctuating(1460277),
)

function getExpForLevelSlow(level: number): number {
  // Slow: \frac{5x^3}{4}
  return Math.floor((5 * Math.pow(level, 3)) / 4)
}

function getExpForLevelMedium(level: number): number {
  // Medium: x^3
  return Math.floor(Math.pow(level, 3))
}

function getExpForLevelFast(level: number): number {
  // Fast: \frac{4x^3}{5}
  return Math.floor((4 * Math.pow(level, 3)) / 5)
}

function getExpForLevelMediumSlow(level: number): number {
  // Medium Slow: \frac{6x^3}{5} - 15x^2 + 100x - 140
  return Math.floor(
    (6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140,
  )
}

function getExpForLevelErratic(level: number): number {
  // Erratic
  if (level <= 50) {
    return Math.floor((level ** 3 * (100 - level)) / 50)
  } else if (level <= 68) {
    return Math.floor((level ** 3 * (150 - level)) / 100)
  } else if (level <= 98) {
    return Math.floor(
      (level ** 3 *
        (1274 +
          Math.pow(level % 3, 2) -
          9 * (level % 3) -
          20 * Math.floor(level / 3))) /
        1000,
    )
  } else {
    return Math.floor((level ** 3 * (160 - level)) / 100)
  }
}

function getExpForLevelFluctuating(level: number): number {
  // Fluctuating
  if (level <= 15) {
    return Math.floor((level ** 3 * (24 + Math.floor((level + 1) / 3))) / 50)
  } else if (level <= 35) {
    return Math.floor((level ** 3 * (14 + level)) / 50)
  } else {
    return Math.floor((level ** 3 * (32 + Math.floor(level / 2))) / 50)
  }
}

// Example usage
console.log('EXP for Level 10 (Slow):', getExpForLevelSlow(10))
console.log('EXP for Level 10 (Medium):', getExpForLevelMedium(10))
console.log('EXP for Level 10 (Fast):', getExpForLevelFast(10))
console.log('EXP for Level 10 (Medium Slow):', getExpForLevelMediumSlow(10))
console.log('EXP for Level 10 (Erratic):', getExpForLevelErratic(10))
console.log('EXP for Level 10 (Fluctuating):', getExpForLevelFluctuating(10))
