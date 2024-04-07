import {
  Address,
  AddressOrNamespace,
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
  buildTokenUpdateField,
  buildUpdateInstruction,
  ComputeInputs,
  formatHexToAmount,
  Outputs,
  parseProgramInfo,
  parseTxInputs,
  Program,
  ProgramUpdate,
  THIS,
  TokenOrProgramUpdate,
  TokenUpdate,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'

class PokemonBattleProgram extends Program {
  constructor() {
    super()
    // Bind all method strategies to this instance
    Object.assign(this.methodStrategies, {
      acceptBattleInvitation: this.acceptBattleInvitation.bind(this),
      attack: this.attack.bind(this),
      placeBet: this.placeBet.bind(this),
      startBattle: this.startBattle.bind(this),
      initialize: this.initialize.bind(this),
      calculateDamage: this.calculateDamage.bind(this),
      determineWinner: this.determineWinner.bind(this),
    })
  }

  acceptBattleInvitation(computeInputs: ComputeInputs) {
    // Method to accept battle invitations by both Pokémon
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
      const recipientAddress = txInputs?.to ?? transaction.to

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

      const dataValues = {
        type: 'non-fungible',
        imgUrl,
        methods,
      } as Record<string, string>

      const dataStr = validateAndCreateJsonString(dataValues)

      const addProgramData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
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

      const distributionInstruction = buildTokenDistributionInstruction({
        programId: THIS,
        initializedSupply,
        to: recipientAddress,
        nonFungible: true,
      })

      const createInstruction = buildCreateInstruction({
        from,
        totalSupply,
        initializedSupply,
        programId: THIS,
        programOwner: from,
        programNamespace: THIS,
        distributionInstruction,
      })

      return new Outputs(computeInputs, [
        createInstruction,
        programUpdateInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  damageTest(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const { trainerAddress, pokemonAddress, damage, currHp } = txInputs

      let newHp = String(
        parseInt(currHp) - parseInt(damage) > 0
          ? parseInt(currHp) - parseInt(damage)
          : '0',
      )
      const dataUpdate = { currHp: newHp }

      const dataStr = validateAndCreateJsonString(dataUpdate)

      const pokemon1Update = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(trainerAddress)),
            new AddressOrNamespace(new Address(pokemonAddress)),
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
      return new Outputs(computeInputs, [pokemon1Update]).toJson()
    } catch (e) {
      throw e
    }
  }

  initialize(computeInputs: ComputeInputs) {
    try {
      const txInputs = parseTxInputs(computeInputs)
      const { pokemon1, pokemon2 } = txInputs

      const dataValues = {
        type: 'non-fungible',
        pokemon1: JSON.stringify(pokemon1),
        pokemon2: JSON.stringify(pokemon2),
      } as Record<string, string>

      const dataStr = validateAndCreateJsonString(dataValues)

      const addProgramData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [addProgramData]),
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
      const txInputs = parseTxInputs(computeInputs)
      const {
        attackerLevel,
        attackerAttack,
        defenderTrainerAddress,
        defenderPokemonAddress,
        defenderTypes,
        defenderCurrHp,
        defenderDefense,
        moveType,
        movePower,
      } = txInputs

      const damageInflicted = this.executeMove(
        { type: moveType, power: parseInt(movePower) },
        { level: parseInt(attackerLevel), attack: parseInt(attackerAttack) },
        {
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

      const dataUpdate = { currHp: newHp }
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

      return new Outputs(computeInputs, [pokemonUpdate]).toJson()
    } catch (e) {
      throw e
    }
  }

  executeMove(
    move: { type: string; power: number },
    attacker: {
      level: number
      attack: number
    },
    defender: { currentHp: number; types: string[]; defense: number },
  ) {
    const damage = this.calculateDamage(move, attacker, defender)
    const isCritical = this.calculateCriticalHit() === 1.5

    // TODO: pass these strings back to store in the battle NFT
    // let attackMessage = `${attacker.name} uses ${move.name}!`

    // if (isCritical) {
    //   attackMessage += ' A critical hit!'
    // }
    //
    // // Check for effectiveness
    // const effectiveness = this.getTypeEffectiveness(move.type, defender.types)
    //
    // if (effectiveness === 2) {
    //   attackMessage += " It's super effective!"
    // } else if (effectiveness === 0.5) {
    //   attackMessage += " It's not very effective..."
    // }
    //
    // // Log the attack details
    // console.log(attackMessage)

    // Return the damage inflicted for further processing if necessary
    return damage
  }

  checkFaint(pokemon: { currentHp: number; name: any }) {
    // Check if the Pokémon has fainted
    if (pokemon.currentHp <= 0) {
      console.log(`${pokemon.name} has fainted!`)
      return true
    }
    return false
  }

  // simulateTurn() {
  //   // Determine which Pokémon should act based on their Speed stats
  //   let firstMover, secondMover
  //   if (this.pokemon1.speed >= this.pokemon2.speed) {
  //     firstMover = 'pokemon1'
  //     secondMover = 'pokemon2'
  //   } else {
  //     firstMover = 'pokemon2'
  //     secondMover = 'pokemon1'
  //   }
  //
  //   // Execute moves based on the determined turn order
  //   if (!this.executeTurn(firstMover, secondMover)) {
  //     // If the first move doesn't end the battle, execute the second move
  //     this.executeTurn(secondMover, firstMover)
  //   }
  // }
  //
  // executeTurn(attackerKey, defenderKey) {
  //   const attacker = this[attackerKey]
  //   const defender = this[defenderKey]
  //
  //   const move = this.chooseMove(attacker)
  //   this.executeMove(move, attacker, defender)
  //
  //   if (this.checkFaint(defender)) {
  //     this.endBattle(attacker)
  //     return true // Indicate the battle has ended
  //   }
  //   return false // Indicate the battle continues
  // }
  //
  determineWinner(computeInputs: ComputeInputs) {
    // Method to check if a Pokémon has fainted and determine the winner
  }

  // settleBets(winningPokemonId: number) {
  //   // Calculate total amount bet on each Pokémon
  //   const totalBets = this.bets.reduce(
  //     (
  //       acc: { [x: string]: any },
  //       bet: { onPokemonId: string | number; amount: any },
  //     ) => {
  //       acc[bet.onPokemonId] = (acc[bet.onPokemonId] || 0) + bet.amount
  //       return acc
  //     },
  //     {},
  //   )
  //
  //   // Calculate total amount bet on the winning Pokémon
  //   const totalWinningBets = totalBets[winningPokemonId] || 0
  //
  //   // Determine the payout ratio
  //   const totalPot = Object.values(totalBets).reduce(
  //     (acc, amount) => acc + amount,
  //     0,
  //   )
  //   const payoutRatio = totalPot / totalWinningBets
  //
  //   // Calculate winnings for each winning bet
  //   const winnings = this.bets
  //     .filter(
  //       (bet: { onPokemonId: number }) => bet.onPokemonId === winningPokemonId,
  //     )
  //     .map((bet: { userId: any; amount: number }) => ({
  //       userId: bet.userId,
  //       wonAmount: bet.amount * payoutRatio,
  //     }))
  //
  //   // Reset bets for the next battle
  //   this.bets = []
  //
  //   // Return or process the winnings as needed
  //   return winnings
  // }

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
