import {
  Address,
  buildTransferInstruction,
  ComputeInputs,
  formatHexToAmount,
  parseProgramInfo,
  parseTxInputs,
  TokenUpdate,
} from '@versatus/versatus-javascript'

import {
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
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
  imgUrl: string
  moves: string
  types: string
}

export class BasePokemonProgram extends Program {
  evolutionMap: Map<number, EvolutionData>

  constructor(evolutionJson: string) {
    super()
    this.evolutionMap = this.parseEvolutionJson(evolutionJson)

    Object.assign(this.methodStrategies, {
      create: this.create.bind(this),
      catch: this.catch.bind(this),
      heal: this.heal.bind(this),
      train: this.train.bind(this),
    })
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

  create(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs',
      )

      const {
        totalSupply,
        initializedSupply,
        symbol,
        name,
        paymentProgramAddress,
        price,
      } = txInputs

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
      const moves = this.getMoves(parseInt(level))
      const types = this.getTypes(parseInt(level))
      const imgUrl = this.getInitialImageUrl()
      const methods = 'create,catch,train,update'

      validate(parseFloat(price), 'invalid price')

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        collection: 'pokemon',
        imgUrl,
        paymentProgramAddress,
        price,
        methods,
        baseStats,
        moves,
        types,
        level,
        tokenMap: '{}',
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

      const distributionInstruction = buildTokenDistributionInstruction({
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

  catch(computeInputs: ComputeInputs) {
    try {
      const { transaction, accountInfo } = computeInputs
      const { from } = transaction
      const programInfo = parseProgramInfo(computeInputs)
      const accountInfoData = accountInfo.programAccountData
      const baseStats = JSON.parse(accountInfoData?.baseStats)

      const data = validate(
        accountInfo?.programAccountData,
        'token missing required data to mint...',
      )

      const availableTokenIds = validate(
        programInfo?.tokenIds,
        'missing nfts to mint...',
      )

      const tokenIds = [availableTokenIds[0]]

      const tokenMap = validate(
        JSON.parse(data.tokenMap),
        'tokenMap is not valid',
      )

      const ivs = generateIVs()
      const evs = generateInitialEVs()

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

      tokenMap[tokenIdStr] = {
        ownerAddress: transaction.from,
        imgUrl: data.imgUrl,
        level: '1',
        exp: '0',
        baseStats: baseStats,
        currHp: currHp,
        ivs,
        evs,
        moves: JSON.parse(data.moves),
        types: JSON.parse(data.types),
      }

      const dataStr = validateAndCreateJsonString({
        tokenMap: JSON.stringify(tokenMap),
        currHp,
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

      const transferToCaller = buildTransferInstruction({
        from: THIS,
        to: from,
        tokenAddress: transaction.to,
        tokenIds,
      })

      return new Outputs(computeInputs, [
        // transferToProgram,
        transferToCaller,
        caughtPokemonInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }
  heal(computeInputs: ComputeInputs) {
    try {
      const { transaction, accountInfo } = computeInputs
      const { from } = transaction
      const txInputs = parseTxInputs(computeInputs)
      const { baseHp, ivHp, evHp, level } = txInputs

      const currHp = calculateHP(
        parseInt(baseHp),
        parseInt(ivHp),
        parseInt(evHp),
        parseInt(level),
      )

      const dataStr = validateAndCreateJsonString({
        currHp: currHp.toString(),
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

  train(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { from } = transaction

      const txInputs = validate(
        JSON.parse(transaction.transactionInputs),
        'unable to parse transactionInputs',
      )

      const { tokenId, tokenMap: tokenMapStr } = txInputs
      validate(tokenId, 'missing tokenId in transactionInputs...')

      const programInfo = parseProgramInfo(computeInputs)

      const metadata = validate(
        programInfo?.metadata,
        'token missing required data to mint...',
      )

      const data = validate(
        programInfo?.data,
        'token missing required data to mint...',
      )

      const tokenMap = validate(
        JSON.parse(tokenMapStr),
        'tokenMap is not valid',
      )

      const tokenIdStr = parseInt(formatHexToAmount(tokenId)).toString()
      const pokemon = tokenMap[tokenIdStr]
      const currentLevel = parseInt(pokemon?.level)
      const nextLevel = currentLevel + 1
      const evolutionData = this.getEvolutionData(nextLevel)

      const metadataUpdate = { ...metadata }
      if (evolutionData) {
        tokenMap[tokenIdStr].imgUrl = evolutionData.imgUrl
        metadataUpdate.symbol = evolutionData.symbol
        metadataUpdate.name = evolutionData.name
      }

      tokenMap[tokenIdStr].level = nextLevel.toString()
      const dataUpdate = { ...data, tokenMap: JSON.stringify(tokenMap) }

      const dataStr = validateAndCreateJsonString(dataUpdate)
      const metadataStr = validateAndCreateJsonString(metadataUpdate)

      const updateMetadata = buildTokenUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

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
            [updateMetadata, updateTokenData],
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

const constructorArguments = JSON.stringify('REPLACE_ME')

const start = (input: ComputeInputs) => {
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
