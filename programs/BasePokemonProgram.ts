import {
  Address,
  buildTransferInstruction,
  IComputeInputs,
  formatHexToAmount,
  parseProgramTokenInfo,
  parseTxInputs,
  TokenUpdate,
  ETH_PROGRAM_ADDRESS,
  parseAmountToBigInt,
} from '@versatus/versatus-javascript'

import {
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistribution,
  buildTokenUpdateField,
  buildUpdateInstruction,
} from '@versatus/versatus-javascript'
import { THIS } from '@versatus/versatus-javascript'
import { Program, ProgramUpdate } from '@versatus/versatus-javascript'
import { AddressOrNamespace } from '@versatus/versatus-javascript'
import { TokenOrProgramUpdate } from '@versatus/versatus-javascript'
import { Outputs } from '@versatus/versatus-javascript'

import {
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'

import { calculateHP, generateInitialEVs, generateIVs } from '../lib/formulae'

interface EvolutionData {
  id: number
  name: string
  symbol: string
  baseStats: string
  growthRate: string
  evYields: string
  imgUrl: string
  moves: string
  types: string
}

export class BasePokemonProgram extends Program {
  evolutionMap: Map<number, EvolutionData>

  constructor(evolutionJson: string) {
    super()
    this.evolutionMap = this.parseEvolutionJson(evolutionJson)
    this.registerContractMethod('create', this.create)
    this.registerContractMethod('catch', this.catch)
    this.registerContractMethod('heal', this.heal)
    this.registerContractMethod('consumeRareCandy', this.consumeRareCandy)
  }

  parseEvolutionJson(json: string): Map<number, EvolutionData> {
    const data = JSON.parse(json)
    const map = new Map<number, EvolutionData>()

    for (const level in data) {
      if (data.hasOwnProperty(level)) {
        map.set(parseInt(level), data[level] as EvolutionData)
      }
    }

    return map
  }

  getBaseStats(level: number): string {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData ? evolutionData.baseStats : '{}'
  }

  getBaseEvs(level: number): string {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData ? evolutionData.evYields : '{}'
  }

  getMoves(level: number): string {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData ? evolutionData.moves : '{}'
  }

  getGrowthRate(level: number): string {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData ? evolutionData.growthRate : '{}'
  }

  getTypes(level: number): string {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData ? evolutionData.types : '{}'
  }

  getEvolutionData(level: number): EvolutionData | undefined {
    // Check if the exact level exists first
    let evolutionData = this.evolutionMap.get(level)

    // If it doesn't exist, find the next lowest level
    if (!evolutionData) {
      let previousLevels = Array.from(this.evolutionMap.keys())
        .filter(lvl => lvl <= level)
        .sort((a, b) => b - a) // Sort in descending order

      // Get the closest level that does not exceed the current level
      let closestLevel = previousLevels.length > 0 ? previousLevels[0] : null
      if (closestLevel !== null) {
        evolutionData = this.evolutionMap.get(closestLevel)
      }
    }

    return evolutionData
  }

  getInitialImageUrl(): string {
    const initialData = this.evolutionMap.get(1)
    return initialData ? initialData.imgUrl : ''
  }

  create(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs',
      )

      const { totalSupply, initializedSupply, symbol, name } = txInputs

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

      const level = '1'
      const baseStats = this.getBaseStats(parseInt(level))
      const evYields = this.getBaseEvs(parseInt(level))
      const growthRate = this.getGrowthRate(parseInt(level))
      const moves = this.getMoves(parseInt(level))
      const types = this.getTypes(parseInt(level))
      const imgUrl = this.getInitialImageUrl()
      const methods = 'create,catch,train,update'

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        collection: 'pokemon',
        symbol,
        name,
        imgUrl,
        methods,
        baseStats,
        growthRate,
        evYields,
        moves,
        types,
        level,
      })

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

      const distributionInstruction = buildTokenDistribution({
        programId: THIS,
        initializedSupply,
        to: THIS,
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
  catch(computeInputs: IComputeInputs) {
    try {
      const { transaction, accountInfo } = computeInputs
      const { from } = transaction
      const programInfo = parseProgramTokenInfo(computeInputs)
      const accountInfoData = accountInfo.programAccountData
      const baseStats = JSON.parse(accountInfoData?.baseStats)
      const evYields = JSON.parse(accountInfoData?.evYields)

      const data = validate(
        accountInfo?.programAccountData,
        'token missing required data to mint...',
      )

      const availableTokenIds = validate(
        programInfo?.tokenIds,
        'missing nfts to mint...',
      )

      const tokenIds = [availableTokenIds[0]]

      const ivs = generateIVs()
      const evs = generateInitialEVs()

      const moves = validate(
        JSON.parse(data.moves),
        'unable to parse moves from token data...',
      )

      const tokenIdStr = parseInt(
        formatHexToAmount(availableTokenIds[0]),
      ).toString()

      const level = '1'

      const currHp = calculateHP(
        parseInt(baseStats.hp),
        parseInt(ivs.hp),
        parseInt(evs.hp),
        parseInt(level),
      ).toString()

      const shuffledMoves = moves.sort(() => 0.5 - Math.random())
      const selectedMoves = shuffledMoves.slice(0, 4)

      const dataStr = validateAndCreateJsonString({
        [`${tokenIdStr}-imgUrl`]: data.imgUrl,
        [`${tokenIdStr}-symbol`]: data.symbol,
        [`${tokenIdStr}-name`]: data.name,
        [`${tokenIdStr}-level`]: '1',
        [`${tokenIdStr}-exp`]: '0',
        [`${tokenIdStr}-baseStats`]: JSON.stringify(baseStats),
        [`${tokenIdStr}-evYields`]: JSON.stringify(evYields),
        [`${tokenIdStr}-currHp`]: currHp,
        [`${tokenIdStr}-ivs`]: JSON.stringify(ivs),
        [`${tokenIdStr}-evs`]: JSON.stringify(evs),
        [`${tokenIdStr}-moves`]: JSON.stringify(selectedMoves),
        [`${tokenIdStr}-types`]: data.types,
      })

      const updateCaughtPokemonTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const caughtPokemonInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(String(from))),
            new AddressOrNamespace(THIS),
            [updateCaughtPokemonTokenData],
          ),
        ),
      })

      const transferToProgram = buildTransferInstruction({
        from,
        to: THIS,
        tokenAddress: ETH_PROGRAM_ADDRESS,
        amount: parseAmountToBigInt('1'),
      })

      const transferToCaller = buildTransferInstruction({
        from: THIS,
        to: from,
        tokenAddress: transaction.to,
        tokenIds,
      })

      return new Outputs(computeInputs, [
        transferToCaller,
        caughtPokemonInstructions,
        transferToProgram,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }
  heal(computeInputs: IComputeInputs) {
    try {
      const { transaction, accountInfo } = computeInputs
      const { from } = transaction
      const txInputs = parseTxInputs(computeInputs)
      const { tokenId, baseHp, ivHp, evHp, level } = txInputs

      const currHp = calculateHP(
        parseInt(baseHp),
        parseInt(ivHp),
        parseInt(evHp),
        parseInt(level),
      )

      const dataStr = validateAndCreateJsonString({
        [`${tokenId}-currHp`]: currHp.toString(),
      })

      const healInstruction = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(from)),
            new AddressOrNamespace(new Address(THIS)),
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

      return new Outputs(computeInputs, [healInstruction]).toJson()
    } catch (e) {
      throw e
    }
  }
  consumeRareCandy(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { from } = transaction

      const txInputs = validate(
        JSON.parse(transaction.transactionInputs),
        'unable to parse transactionInputs',
      )

      const { tokenId, level } = txInputs
      validate(tokenId, 'missing tokenId in transactionInputs...')
      validate(level, 'missing level in transactionInputs...')

      const programInfo = parseProgramTokenInfo(computeInputs)

      const data = validate(
        programInfo?.data,
        'token missing required data to mint...',
      )

      const tokenIdStr = parseInt(formatHexToAmount(tokenId)).toString()
      const currentLevel = parseInt(level)
      if (currentLevel >= 100) {
        throw new Error('Pokemon is already at max level')
      }

      const nextLevel = currentLevel + 1
      const evolutionData = this.getEvolutionData(nextLevel)

      const newExp = levelingMap['medium'](nextLevel)

      if (evolutionData) {
        data[`${tokenIdStr}-level`] = nextLevel.toString()
        data[`${tokenIdStr}-imgUrl`] = evolutionData.imgUrl
        data[`${tokenIdStr}-symbol`] = evolutionData.symbol
        data[`${tokenIdStr}-name`] = evolutionData.name
        data[`${tokenIdStr}-baseStats`] = evolutionData.baseStats
        data[`${tokenIdStr}-evYields`] = evolutionData.evYields
        data[`${tokenIdStr}-exp`] = newExp
      }

      const dataUpdate = { ...data }

      const dataStr = validateAndCreateJsonString(dataUpdate)

      const updateTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(from)),
            new AddressOrNamespace(THIS),
            [updateTokenData],
          ),
        ),
      })

      // Return the new outputs as JSON
      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }
}

const levelingMap = {
  slow: getExpForLevelSlow,
  medium: getExpForLevelMedium,
  fast: getExpForLevelFast,
  ['medium-slow']: getExpForLevelMediumSlow,
  ['slow-then-very-fast']: getExpForLevelErratic,
  ['fast-then-very-slow']: getExpForLevelFluctuating,
}

function getExpForLevelSlow(level: number): number {
  return Math.floor((5 * Math.pow(level, 3)) / 4)
}

function getExpForLevelMedium(level: number): number {
  return Math.floor(Math.pow(level, 3))
}

function getExpForLevelFast(level: number): number {
  return Math.floor((4 * Math.pow(level, 3)) / 5)
}

function getExpForLevelMediumSlow(level: number): number {
  return Math.floor(
    (6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140,
  )
}

function getExpForLevelErratic(level: number): number {
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
  if (level <= 15) {
    return Math.floor((level ** 3 * (24 + Math.floor((level + 1) / 3))) / 50)
  } else if (level <= 35) {
    return Math.floor((level ** 3 * (14 + level)) / 50)
  } else {
    return Math.floor((level ** 3 * (32 + Math.floor(level / 2))) / 50)
  }
}

const constructorArguments = JSON.stringify('REPLACE_ME')

const start = (input: IComputeInputs) => {
  try {
    const contract = new BasePokemonProgram(constructorArguments)
    return contract.start(input)
  } catch (e) {
    throw e
  }
}

process.stdin.setEncoding('utf8')
let data = ''
process.stdin.on('readable', () => {
  try {
    let chunk
    while ((chunk = process.stdin.read()) !== null) {
      data += chunk
    }
  } catch (e) {
    throw e
  }
})
process.stdin.on('end', () => {
  try {
    const parsedData = JSON.parse(data)
    const result = start(parsedData)
    process.stdout.write(JSON.stringify(result))
  } catch (err) {
    // @ts-ignore
    process.stdout.write(err.message)
  }
})
