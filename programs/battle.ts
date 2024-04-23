import {
  Address,
  AddressOrNamespace,
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
  buildTokenUpdateField,
  buildUpdateInstruction,
  ComputeInputs,
  Outputs,
  parseProgramInfo,
  parseTxInputs,
  Program,
  ProgramUpdate,
  THIS,
  TokenOrProgramUpdate,
  TokenUpdate,
  TokenUpdateBuilder,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'
import { IEvYield } from '../lib/types'

class PokemonBattleProgram extends Program {
  constructor() {
    super()
    // Bind all method strategies to this instance
    Object.assign(this.methodStrategies, {
      addPokemon: this.addPokemon.bind(this),
      approveTrainer: this.approveTrainer.bind(this),
      acceptBattle: this.acceptBattle.bind(this),
      cancelBattle: this.cancelBattle.bind(this),
      declineBattle: this.declineBattle.bind(this),
      attack: this.attack.bind(this),
      placeBet: this.placeBet.bind(this),
      startBattle: this.startBattle.bind(this),
      initialize: this.initialize.bind(this),
      calculateDamage: this.calculateDamage.bind(this),
    })
  }

  approveTrainer(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, programId } = transaction
      const programAddress = new AddressOrNamespace(new Address(programId))

      const update = buildTokenUpdateField({
        field: 'approvals',
        value: JSON.parse(transactionInputs),
        action: 'extend',
      })

      const tokenUpdate = new TokenUpdate(
        new AddressOrNamespace(THIS),
        new AddressOrNamespace(THIS),
        [update],
      )
      const tokenOrProgramUpdate = new TokenOrProgramUpdate(
        'tokenUpdate',
        tokenUpdate,
      )
      const updateInstruction = new TokenUpdateBuilder()
        .addTokenAddress(programAddress)
        .addUpdateField(tokenOrProgramUpdate)
        .build()

      return new Outputs(computeInputs, [updateInstruction]).toJson()
    } catch (e) {
      throw e
    }
  }

  addPokemon(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const { pokemonAddress } = txInputs

      const addLinkedProgram = buildProgramUpdateField({
        field: 'linkedPrograms',
        value: pokemonAddress,
        action: 'insert',
      })

      const addPokemonToLinkedProgramInstruction = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [addLinkedProgram]),
        ),
      })

      return new Outputs(computeInputs, [
        addPokemonToLinkedProgramInstruction,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  create(computeInputs: ComputeInputs) {
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

      const recipientAddress = txInputs?.recipientAddress ?? transaction.to

      // data
      const imgUrl = txInputs?.imgUrl
      const collection = txInputs?.collection
      const methods = 'approve,create,burn,mint,update'

      validate(collection, 'missing collection')
      validate(
        parseInt(initializedSupply) <= parseInt(totalSupply),
        'invalid supply',
      )

      const metadataStr = validateAndCreateJsonString({
        symbol,
        name,
        totalSupply,
        initializedSupply,
      })

      const addProgramMetadata = buildProgramUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

      const programDataValues = {
        type: 'non-fungible',
        imgUrl,
        methods,
      } as Record<string, string>

      const tokenDataValues = {
        battles: '{}',
      } as Record<string, string>

      const programDataStr = validateAndCreateJsonString(programDataValues)
      const tokenDataStr = validateAndCreateJsonString(tokenDataValues)

      const addProgramData = buildProgramUpdateField({
        field: 'data',
        value: programDataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            addProgramMetadata,
            addProgramData,
          ]),
        ),
      })

      const addDataToToken = buildTokenUpdateField({
        field: 'data',
        value: tokenDataStr,
        action: 'extend',
      })

      const distributionInstruction = buildTokenDistributionInstruction({
        programId: THIS,
        initializedSupply,
        to: recipientAddress,
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
        programUpdateInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  acceptBattle(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      let {
        trainer2Address,
        pokemon2Address,
        pokemon2TokenId,
        pokemon2Speed,
        battleId,
      } = txInputs

      const programTokenInfo = parseProgramInfo(computeInputs)
      const currBattleState = JSON.parse(programTokenInfo?.data?.battles)
      const currBattle = currBattleState[battleId]
      currBattle.pokemon2Speed = pokemon2Speed

      if (parseInt(currBattle.pokemon1Speed) < parseInt(pokemon2Speed)) {
        currBattle.firstMove = `${pokemon2Address}:${pokemon2TokenId}`
      }

      if (currBattle.battleType === 'open') {
        validate(
          trainer2Address,
          'missing trainer2Address for open battle acceptance',
        )
        validate(
          pokemon2Address,
          'missing pokemon2Address for open battle acceptance',
        )
        validate(
          pokemon2TokenId,
          'missing pokemon2TokenId for open battle acceptance',
        )
      } else {
        trainer2Address = currBattle.trainer2Address
        pokemon2Address = currBattle.pokemon2Address
        pokemon2TokenId = currBattle.pokemon2TokenId
      }

      // validate(
      //   trainer2Address.toLowerCase() === from.toLowerCase(),
      //   'incorrect trainer2Address',
      // )

      const battleValues = {
        ...currBattle,
        battleState: 'betting',
        trainer2Address: trainer2Address ?? '',
        pokemon2Address: pokemon2Address ?? '',
        pokemon2TokenId: pokemon2TokenId ?? '',
      } as Record<string, any>

      const dataObj = {
        battles: JSON.stringify({
          ...currBattleState,
          [battleId]: battleValues,
        }),
      }

      const dataStr = validateAndCreateJsonString(dataObj)

      const addBattle = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [addBattle],
          ),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }

  cancelBattle(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const programInfo = parseProgramInfo(computeInputs)
      const { from } = computeInputs.transaction
      let { battleId } = txInputs

      const currBattleState = JSON.parse(programInfo?.data?.battles)
      const currBattle = currBattleState[battleId]

      validate(
        currBattle.trainer1Address.toLowerCase() === from.toLowerCase(),
        'incorrect trainer1Address',
      )

      const battleValues = {
        ...currBattle,
        battleState: 'canceled',
      } as Record<string, any>

      const dataObj = {
        battles: JSON.stringify({
          ...currBattleState,
          [battleId]: battleValues,
        }),
      }

      const dataStr = validateAndCreateJsonString(dataObj)

      const addBattle = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [addBattle],
          ),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }

  declineBattle(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const programInfo = parseProgramInfo(computeInputs)
      const { from } = computeInputs.transaction
      let { battleId } = txInputs

      const currBattleState = JSON.parse(programInfo?.data?.battles)
      const currBattle = currBattleState[battleId]

      validate(
        currBattle.trainer2Address.toLowerCase() === from.toLowerCase(),
        'incorrect trainer2Address',
      )

      const battleValues = {
        ...currBattle,
        battleState: 'declined',
      } as Record<string, any>

      const dataObj = {
        battles: JSON.stringify({
          ...currBattleState,
          [battleId]: battleValues,
        }),
      }

      const dataStr = validateAndCreateJsonString(dataObj)

      const addBattle = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [addBattle],
          ),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }

  initialize(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const programInfo = parseProgramInfo(computeInputs)

      const {
        trainer1Address,
        pokemon1Address,
        pokemon1TokenId,
        pokemon1Speed,
        trainer2Address,
        pokemon2Address,
        pokemon2TokenId,
      } = txInputs

      const currBattleState = JSON.parse(programInfo?.data?.battles)

      const currBattleKeys = Object.keys(currBattleState)

      validate(trainer1Address, 'missing trainer1Address')
      validate(pokemon1Address, 'missing pokemon1Address')
      validate(pokemon1TokenId, 'missing pokemon1TokenId')
      validate(pokemon1Speed, 'missing pokemon1Speed')

      const battleType = trainer2Address ? 'closed' : 'open'

      const battleValues = {
        battleType,
        battleState: 'initialized',
        trainer1Address: trainer1Address,
        pokemon1Address: pokemon1Address,
        pokemon1TokenId: pokemon1TokenId,
        pokemon1Speed: pokemon1Speed,
        trainer2Address: trainer2Address ?? '',
        pokemon2Address: pokemon2Address ?? '',
        pokemon2TokenId: pokemon2TokenId ?? '',
        pokemon2Speed: '',
        firstMove: `${pokemon1Address}:${pokemon1TokenId}`,
        turns: [],
        timeStamp: Date.now(),
      } as Record<string, any>

      const dataObj = {
        battles: JSON.stringify({
          ...currBattleState,
          [currBattleKeys.length.toString()]: battleValues,
        }),
      }

      const dataStr = validateAndCreateJsonString(dataObj)

      const addBattle = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [addBattle],
          ),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }

  placeBet(computeInputs: ComputeInputs) {
    // Method for participants to place bets on the outcome
  }

  startBattle(computeInputs: ComputeInputs) {
    // Method to officially start the battle after both acceptances and bet placements
  }

  attack(computeInputs: ComputeInputs) {
    try {
      const { from } = computeInputs.transaction
      const txInputs = parseTxInputs(computeInputs)
      const programInfo = parseProgramInfo(computeInputs)

      const {
        battleId,
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
      } = txInputs

      validateAndCreateJsonString({
        battleId,
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
      })

      const currBattlesState = JSON.parse(programInfo?.data?.battles)
      const currBattle = currBattlesState[battleId]
      if (currBattle.battleState === 'finished') {
        throw new Error('battle has concluded')
      }

      const currBattleTurns = currBattle.turns

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

      let battleState = 'battling'
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

        const earnedEvYieldsStr = validateAndCreateJsonString({
          [`${attackerTokenId}-evs`]: JSON.stringify(newEvs),
          [`${attackerTokenId}-exp`]: String(earnedExp + parseInt(attackerExp)),
        })

        const evUpdate = buildUpdateInstruction({
          update: new TokenOrProgramUpdate(
            'tokenUpdate',
            new TokenUpdate(
              new AddressOrNamespace(new Address(from)),
              new AddressOrNamespace(new Address(attackerPokemonAddress)),
              [
                buildTokenUpdateField({
                  field: 'data',
                  value: earnedEvYieldsStr,
                  action: 'extend',
                }),
              ],
            ),
          ),
        })
        instructions.push(evUpdate)
      }

      const dataUpdate = { [`${defenderTokenId}-currHp`]: newHp }
      const dataStr = validateAndCreateJsonString(dataUpdate)

      const pokemonUpdate = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(defenderTrainerAddress)),
            new AddressOrNamespace(new Address(defenderPokemonAddress)),
            [
              buildTokenUpdateField({
                field: 'data',
                value: dataStr,
                action: 'extend',
              }),
            ],
          ),
        ),
      })

      currBattleTurns.push({
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

      const updatedBattles = {
        ...currBattlesState,
        [battleId]: {
          ...currBattle,
          winningTrainerAddress,
          winnerEarnedExp,
          battleState,
          turns: currBattleTurns,
        },
      }

      const battleStateUpdate = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [
              buildTokenUpdateField({
                field: 'data',
                value: JSON.stringify({
                  battles: JSON.stringify(updatedBattles),
                }),
                action: 'extend',
              }),
            ],
          ),
        ),
      })

      return new Outputs(computeInputs, [
        ...instructions,
        pokemonUpdate,
        battleStateUpdate,
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

const start = (input: ComputeInputs) => {
  const contract = new PokemonBattleProgram()
  return contract.start(input)
}

process.stdin.setEncoding('utf8')

let data = ''

process.stdin.on('readable', () => {
  let chunk
  while ((chunk = process.stdin.read()) !== null) {
    data += chunk
  }
})

process.stdin.on('end', () => {
  try {
    const parsedData = JSON.parse(data)
    const result = start(parsedData)
    process.stdout.write(JSON.stringify(result))
  } catch (err) {
    console.error('Failed to parse JSON input:', err)
  }
})
