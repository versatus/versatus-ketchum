import {
  Address,
  AddressOrNamespace,
  addTokenApprovals,
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistribution,
  buildTokenUpdateField,
  buildTransferInstruction,
  buildUpdateInstruction,
  ETH_PROGRAM_ADDRESS,
  IComputeInputs,
  Outputs,
  parseAmountToBigInt,
  parseAvailableTokenIds,
  parseProgramAccountData,
  parseProgramTokenInfo,
  parseTxInputs,
  Program,
  ProgramUpdate,
  THIS,
  TokenOrProgramUpdate,
  TokenUpdate,
  TokenUpdateBuilder,
  updateProgramData,
  updateProgramMetadata,
  updateTokenData,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'
import { IEvYield } from '../lib/types'

const VERSE_PROGRAM_ADDRESS = '0x9f85fb953179fb2418faf4e5560c1ac3717e8c0f'
class PokemonBattleProgram extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      acceptBattle: this.acceptBattle.bind(this),
      cancelBattle: this.cancelBattle.bind(this),
      declineBattle: this.declineBattle.bind(this),
      attack: this.attack.bind(this),
      initializeBattle: this.initializeBattle.bind(this),
      registerTrainer: this.registerTrainer.bind(this),
    })
  }

  create(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs',
      )

      // metadata
      const totalSupply = txInputs?.totalSupply
      const initializedSupply = txInputs?.initializedSupply
      const symbol = txInputs?.symbol
      const name = txInputs?.name

      // data
      const imgUrl = txInputs?.imgUrl

      validate(
        parseInt(initializedSupply) <= parseInt(totalSupply),
        'invalid supply',
      )

      const addProgramMetadata = updateProgramMetadata({
        programAddress: THIS,
        metadata: {
          symbol,
          name,
          totalSupply,
          initializedSupply,
        },
      })

      const addProgramData = updateProgramData({
        programAddress: THIS,
        data: {
          type: 'non-fungible',
          imgUrl,
          methods: 'approve,create,update',
        },
      })

      const addDataToToken = buildTokenUpdateField({
        field: 'data',
        value: validateAndCreateJsonString({
          battles: '{}',
        }),
        action: 'extend',
      })

      const distributionInstruction = buildTokenDistribution({
        programId: THIS,
        initializedSupply,
        to: THIS,
        tokenUpdates: [addDataToToken],
        nonFungible: true,
      })

      const createInstruction = buildCreateInstruction({
        from,
        totalSupply,
        initializedSupply,
        programId: THIS,
        programOwner: from,
        programNamespace: THIS,
        distributionInstruction: distributionInstruction,
      })

      return new Outputs(computeInputs, [
        createInstruction,
        addProgramMetadata,
        addProgramData,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  acceptBattle(computeInputs: IComputeInputs) {
    try {
      const { from, programId } = computeInputs.transaction
      const txInputs = parseTxInputs(computeInputs)
      let {
        pokemon1Speed,
        trainer1Address,
        trainer2Address,
        pokemon2Address,
        pokemon2TokenId,
        pokemon2Speed,
        battleId,
        wager,
      } = txInputs

      validate(pokemon1Speed, 'missing pokemon1Speed')
      validate(trainer2Address, 'missing trainer2Address')
      validate(pokemon2Address, 'missing pokemon2Address')
      validate(pokemon2TokenId, 'missing pokemon2TokenId')
      validate(pokemon2Speed, 'missing pokemon2Speed')
      validate(battleId, 'missing battleId')

      const data = {
        [`battle-${battleId}-battleState`]: 'betting',
        [`battle-${battleId}-trainer2Address`]: trainer2Address,
        [`battle-${battleId}-pokemon2Address`]: pokemon2Address,
        [`battle-${battleId}-pokemon2TokenId`]: pokemon2TokenId,
        [`battle-${battleId}-pokemon2Speed`]: pokemon2Speed,
      }

      if (parseInt(pokemon1Speed) < parseInt(pokemon2Speed)) {
        data[`battle-${battleId}-firstMove`] =
          `${pokemon2Address}:${pokemon2TokenId}`
      }

      const updateBattleTokenData = updateTokenData({
        accountAddress: trainer1Address,
        programAddress: programId,
        data,
      })

      const amountNeededForWager = parseAmountToBigInt(wager ?? '0')
      const transferToProgram = buildTransferInstruction({
        from: from,
        to: programId,
        tokenAddress: VERSE_PROGRAM_ADDRESS,
        amount: amountNeededForWager,
      })

      const battleCostTransfer = buildTransferInstruction({
        from: from,
        to: THIS,
        tokenAddress: ETH_PROGRAM_ADDRESS,
        amount: parseAmountToBigInt('0.05'),
      })

      return new Outputs(computeInputs, [
        updateBattleTokenData,
        transferToProgram,
        battleCostTransfer,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  cancelBattle(computeInputs: IComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const { from } = computeInputs.transaction
      let { battleId } = txInputs
      const updateBattleTokenState = updateTokenData({
        accountAddress: from,
        programAddress: THIS,
        data: {
          [`battle-${battleId}-battleState`]: 'canceled',
        },
      })

      return new Outputs(computeInputs, [updateBattleTokenState]).toJson()
    } catch (e) {
      throw e
    }
  }

  declineBattle(computeInputs: IComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      let { battleId, trainer1Address } = txInputs
      validate(trainer1Address, 'missing trainer1Address')
      const updateBattleTokenState = updateTokenData({
        accountAddress: trainer1Address,
        programAddress: THIS,
        data: {
          [`battle-${battleId}-battleState`]: 'declined',
        },
      })

      return new Outputs(computeInputs, [updateBattleTokenState]).toJson()
    } catch (e) {
      throw e
    }
  }

  initializeBattle(computeInputs: IComputeInputs) {
    try {
      const { from } = computeInputs.transaction
      const txInputs = parseTxInputs(computeInputs)

      const {
        trainer1Address,
        pokemon1Address,
        pokemon1TokenId,
        pokemon1Speed,
        trainer2Address,
        pokemon2Address,
        pokemon2TokenId,
        pokemon2Speed,
        wager: battleWager,
      } = txInputs

      validate(trainer1Address, 'missing trainer1Address')
      validate(pokemon1Address, 'missing pokemon1Address')
      validate(pokemon1TokenId, 'missing pokemon1TokenId')
      validate(pokemon1Speed, 'missing pokemon1Speed')

      const wager = battleWager ?? '0'
      const battleType = trainer2Address ? 'closed' : 'open'
      const gameId = generateGameId()
      let createdAt = Date.now()
      const updateBattleTokenData = updateTokenData({
        accountAddress: from,
        programAddress: THIS,
        data: {
          [`battle-${gameId}-battleState`]: 'initialized',
          [`battle-${gameId}-wager`]: wager,
          [`battle-${gameId}-createdAt`]: createdAt.toString(),
          [`battle-${gameId}-type`]: battleType,
          [`battle-${gameId}-trainer1Address`]: trainer1Address,
          [`battle-${gameId}-pokemon1Address`]: pokemon1Address,
          [`battle-${gameId}-pokemon1TokenId`]: pokemon1TokenId,
          [`battle-${gameId}-pokemon1Speed`]: pokemon1Speed,
          [`battle-${gameId}-trainer2Address`]: trainer2Address ?? '',
          [`battle-${gameId}-pokemon2Address`]: pokemon2Address ?? '',
          [`battle-${gameId}-pokemon2TokenId`]: pokemon2TokenId ?? '',
          [`battle-${gameId}-pokemon2Speed`]: pokemon2Speed ?? '',
          [`battle-${gameId}-firstMove`]: `${pokemon1Address}:${pokemon1TokenId}`,
          [`battle-${gameId}-turns`]: JSON.stringify([]),
          [`battle-${gameId}-timeStamp`]: createdAt.toString(),
        },
      })
      const amountNeededForWager = parseAmountToBigInt(wager ?? '0')
      const transferToProgram = buildTransferInstruction({
        from: from,
        to: THIS,
        tokenAddress: VERSE_PROGRAM_ADDRESS,
        amount: amountNeededForWager,
      })

      const battleCostTransfer = buildTransferInstruction({
        from: from,
        to: THIS,
        tokenAddress: ETH_PROGRAM_ADDRESS,
        amount: parseAmountToBigInt('0.05'),
      })

      return new Outputs(computeInputs, [
        updateBattleTokenData,
        transferToProgram,
        battleCostTransfer,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  placeBet(computeInputs: IComputeInputs) {
    // Method for participants to place bets on the outcome
  }

  registerTrainer(computeInputs: IComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const { programId } = computeInputs.transaction
      const { address } = txInputs
      const tokenIds = parseAvailableTokenIds(computeInputs)
      const transferInstruction = buildTransferInstruction({
        from: programId,
        to: address,
        tokenAddress: programId,
        tokenIds: [tokenIds[0]],
      })
      return new Outputs(computeInputs, [transferInstruction]).toJson()
    } catch (e) {
      throw e
    }
  }

  startBattle(computeInputs: IComputeInputs) {
    // Method to officially start the battle after both acceptances and bet placements
  }

  attack(computeInputs: IComputeInputs) {
    try {
      const { from, programId } = computeInputs.transaction
      const txInputs = parseTxInputs(computeInputs)
      const programInfo = parseProgramTokenInfo(computeInputs)

      let {
        trainer1Address,
        battleId,
        battleState,
        attackerLevel,
        attackerAttack,
        attackerName,
        attackerEvs,
        attackerTokenId,
        attackerPokemonAddress,
        attackerExp,
        attackerHp,
        attackerCurrHp,
        defenderLevel,
        defenderExp,
        defenderTrainerAddress,
        defenderPokemonAddress,
        defenderTypes,
        defenderCurrHp,
        defenderDefense,
        defenderName,
        defenderEvYields,
        defenderTokenId,
        moveName,
        moveType,
        movePower,
        turns,
      } = txInputs

      validateAndCreateJsonString({
        battleId,
        battleState,
        attackerLevel,
        attackerAttack,
        attackerName,
        attackerEvs,
        attackerTokenId,
        attackerPokemonAddress,
        attackerExp,
        attackerHp,
        attackerCurrHp,
        defenderLevel,
        defenderExp,
        defenderTrainerAddress,
        defenderPokemonAddress,
        defenderTypes,
        defenderCurrHp,
        defenderDefense,
        defenderName,
        defenderEvYields,
        defenderTokenId,
        moveName,
        moveType,
        trainer1Address,
        movePower,
        turns,
      })

      if (battleState === 'finished') {
        throw new Error('battle has concluded')
      }

      const { damage: damageInflicted, message } = this.executeMove(
        { name: moveName, type: moveType, power: parseInt(movePower) },
        {
          name: attackerName,
          level: parseInt(attackerLevel),
          attack: parseInt(attackerAttack),
        },
        {
          name: defenderName,
          currentHp: parseInt(defenderCurrHp),
          types: JSON.parse(defenderTypes),
          defense: parseInt(defenderDefense),
        },
      )

      let newHp = String(
        parseInt(defenderCurrHp) - Math.floor(damageInflicted) > 0
          ? parseInt(defenderCurrHp) - Math.floor(damageInflicted)
          : '0',
      )

      const instructions = []

      let winningTrainerAddress = ''
      let winnerEarnedExp = ''
      if (parseInt(newHp) === 0) {
        battleState = 'finished'
        winningTrainerAddress = from
        const newEvs = addEvYields(
          JSON.parse(attackerEvs),
          JSON.parse(defenderEvYields),
        )

        let earnedExp = this.calculateExperience({
          baseExp: parseInt(defenderExp),
          levelDefeated: parseInt(defenderLevel),
          levelWinner: parseInt(attackerLevel),
          healthRemainingPercentage: Math.floor(
            parseInt(attackerCurrHp) / parseInt(attackerHp),
          ),
        })
        winnerEarnedExp = String(earnedExp)
        const newExp = String(earnedExp + parseInt(attackerExp))
        const newLevel = levelingMap['medium'](parseInt(newExp))

        const attackerUpdate = updateTokenData({
          accountAddress: from,
          programAddress: attackerPokemonAddress,
          data: {
            [`${attackerTokenId}-evs`]: JSON.stringify(newEvs),
            [`${attackerTokenId}-exp`]: newExp,
            [`${attackerTokenId}-level`]: String(newLevel),
          },
        })
        instructions.push(attackerUpdate)
      }

      const defenderUpdate = updateTokenData({
        accountAddress: defenderTrainerAddress,
        programAddress: defenderPokemonAddress,
        data: {
          [`${defenderTokenId}-currHp`]: newHp,
        },
      })

      turns.push({
        attacker: {
          name: attackerName,
          level: attackerLevel,
          attack: attackerAttack,
        },
        defender: {
          name: defenderName,
          pokemonAddress: defenderPokemonAddress,
          currHp: newHp,
          types: JSON.parse(defenderTypes),
          defense: defenderDefense,
        },
        move: {
          name: moveName,
          power: movePower,
          type: moveType,
        },
        damage: String(Math.floor(damageInflicted)),
        message,
        timeStamp: Date.now(),
      })

      const updateBattleToken = updateTokenData({
        accountAddress: trainer1Address,
        programAddress: programId,
        data: {
          [`battle-${battleId}-battleState`]: battleState,
          [`battle-${battleId}-turns`]: JSON.stringify(turns),
          [`battle-${battleId}-updatedAt`]: Date.now().toString(),
          [`battle-${battleId}-winnerAddress`]: winningTrainerAddress,
          [`battle-${battleId}-winnerEarnedExp`]: winnerEarnedExp,
        },
      })

      return new Outputs(computeInputs, [
        ...instructions,
        defenderUpdate,
        updateBattleToken,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  executeMove(
    move: { name: string; type: string; power: number },
    attacker: {
      name: string
      level: number
      attack: number
    },
    defender: {
      name: string
      currentHp: number
      types: string[]
      defense: number
    },
  ) {
    const damage = this.calculateDamage(move, attacker, defender)
    const isCritical = this.calculateCriticalHit() === 1.5

    let attackMessage = ``

    if (isCritical) {
      attackMessage += 'A critical hit!'
    }

    const effectiveness = this.getTypeEffectiveness(move.type, defender.types)

    if (effectiveness === 2) {
      attackMessage += " It's super effective!"
    } else if (effectiveness === 0.5) {
      attackMessage += " It's not very effective..."
    }

    return { damage, message: attackMessage }
  }

  calculateExperience({
    baseExp,
    levelDefeated,
    levelWinner,
    healthRemainingPercentage,
  }: {
    baseExp: number
    levelDefeated: number
    levelWinner: number
    healthRemainingPercentage: number
  }): number {
    const levelDifference = levelDefeated - levelWinner
    const levelModifier = 1 + levelDifference * 0.05
    const safeLevelModifier = Math.max(levelModifier, 0.1)

    let victoryConditionBonus = 1
    if (healthRemainingPercentage === 100) {
      victoryConditionBonus = 1.2
    } else if (healthRemainingPercentage >= 75) {
      victoryConditionBonus = 1.1
    }

    const rawExp = Math.floor(
      baseExp * safeLevelModifier * victoryConditionBonus,
    )
    return Math.max(rawExp, 1)
  }

  settleBets(winningPokemonId: number) {
    // // Calculate total amount bet on each Pokémon
    // const totalBets = this.bets.reduce(
    //   (
    //     acc: { [x: string]: any },
    //     bet: { onPokemonId: string | number; amount: any },
    //   ) => {
    //     acc[bet.onPokemonId] = (acc[bet.onPokemonId] || 0) + bet.amount
    //     return acc
    //   },
    //   {},
    // )
    //
    // // Calculate total amount bet on the winning Pokémon
    // const totalWinningBets = totalBets[winningPokemonId] || 0
    //
    // // Determine the payout ratio
    // const totalPot = Object.values(totalBets).reduce(
    //   (acc, amount) => acc + amount,
    //   0,
    // )
    // const payoutRatio = totalPot / totalWinningBets
    //
    // // Calculate winnings for each winning bet
    // const winnings = this.bets
    //   .filter(
    //     (bet: { onPokemonId: number }) => bet.onPokemonId === winningPokemonId,
    //   )
    //   .map((bet: { userId: any; amount: number }) => ({
    //     userId: bet.userId,
    //     wonAmount: bet.amount * payoutRatio,
    //   }))
    //
    // // Reset bets for the next battle
    // this.bets = []
    //
    // // Return or process the winnings as needed
    // return winnings
  }

  calculateDamage(
    move: { type: any; power: number },
    attacker: { level: number; attack: number },
    defender: { currentHp?: any; types: any; defense: number },
  ) {
    // Basic damage calculation formula
    const baseDamage =
      (((2 * attacker.level) / 5 + 2) *
        move.power *
        (attacker.attack / defender.defense)) /
        50 +
      2

    // Determine type effectiveness
    const effectiveness = this.getTypeEffectiveness(move.type, defender.types)

    // Calculate if it's a critical hit
    const criticalMultiplier = this.calculateCriticalHit()

    // Combine all factors for final damage
    return baseDamage * effectiveness * criticalMultiplier
  }

  calculateCriticalHit() {
    return Math.random() < 0.1 ? 1.5 : 1
  }

  getTypeEffectiveness(moveType: string | number, defenderTypes: any[]) {
    let effectiveness = 1
    defenderTypes.forEach(type => {
      // @ts-ignore
      if (effectivenessChart[moveType] && effectivenessChart[moveType][type]) {
        // @ts-ignore
        effectiveness *= effectivenessChart[moveType][type]
      }
    })

    return effectiveness
  }
}

function addEvYields(currentEvs: IEvYield, earnedEvs: IEvYield): IEvYield {
  return {
    hp: String(parseInt(currentEvs.hp) + parseInt(earnedEvs.hp)),
    attack: String(parseInt(currentEvs.attack) + parseInt(earnedEvs.attack)),
    defense: String(parseInt(currentEvs.defense) + parseInt(earnedEvs.defense)),
    speed: String(parseInt(currentEvs.speed) + parseInt(earnedEvs.speed)),
    spAtk: String(parseInt(currentEvs.spAtk) + parseInt(earnedEvs.spAtk)),
    spDef: String(parseInt(currentEvs.spDef) + parseInt(earnedEvs.spDef)),
  }
}

const levelingMap = {
  slow: calculateLevelSlow,
  medium: calculateLevelMedium,
  fast: calculateLevelFast,
  ['medium-slow']: calculateLevelMediumSlow,
  ['slow-then-very-fast']: calculateLevelErratic,
  ['fast-then-very-slow']: calculateLevelFluctuating,
}

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

const effectivenessChart = {
  Normal: {
    Rock: 0.5,
    Ghost: 0,
  },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 2,
    Bug: 2,
    Rock: 0.5,
    Dragon: 0.5,
  },
  Water: {
    Fire: 2,
    Water: 0.5,
    Grass: 0.5,
    Ground: 2,
    Rock: 2,
    Dragon: 0.5,
  },
  Electric: {
    Water: 2,
    Electric: 0.5,
    Grass: 0.5,
    Ground: 0,
    Flying: 2,
    Dragon: 0.5,
  },
  Grass: {
    Fire: 0.5,
    Water: 2,
    Grass: 0.5,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Bug: 0.5,
    Rock: 2,
    Dragon: 0.5,
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 0.5,
    Ground: 2,
    Flying: 2,
    Dragon: 2,
  },
  Fighting: {
    Normal: 2,
    Ice: 2,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 2,
    Ghost: 0,
  },
  Poison: {
    Grass: 2,
    Poison: 0.5,
    Ground: 0.5,
    Bug: 2,
    Rock: 0.5,
    Ghost: 0.5,
  },
  Ground: {
    Fire: 2,
    Electric: 2,
    Grass: 0.5,
    Poison: 2,
    Flying: 0,
    Bug: 0.5,
    Rock: 2,
  },
  Flying: {
    Electric: 0.5,
    Grass: 2,
    Fighting: 2,
    Bug: 2,
    Rock: 0.5,
  },
  Psychic: {
    Fighting: 2,
    Poison: 2,
    Psychic: 0.5,
  },
  Bug: {
    Fire: 0.5,
    Grass: 2,
    Fighting: 0.5,
    Poison: 2,
    Flying: 0.5,
    Psychic: 2,
    Ghost: 0.5,
  },
  Rock: {
    Fire: 2,
    Ice: 2,
    Fighting: 0.5,
    Ground: 0.5,
    Flying: 2,
    Bug: 2,
  },
  Ghost: {
    Normal: 0,
    Psychic: 0,
    Ghost: 2,
  },
  Dragon: {
    Dragon: 2,
  },
}

const generateGameId = (): string => {
  return `${Math.random().toString(36).substr(2, 9)}`
}

PokemonBattleProgram.run()
