import {
  Address,
  ComputeInputs,
  formatHexToAmount,
  TokenUpdate,
} from '@versatus/versatus-javascript'

import {
  buildCreateInstruction,
  buildMintInstructions,
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
  parseAmountToBigInt,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'

import { generateInitialEVs, generateIVs } from '../lib/formulae'

interface EvolutionData {
  id: number
  name: string
  symbol: string
  baseStats: string
  imgUrl: string
  moves: string
}

export class BasePokemonProgram extends Program {
  evolutionMap: Map<number, EvolutionData>

  constructor(evolutionJson: string) {
    super()
    this.evolutionMap = this.parseEvolutionJson(evolutionJson)

    Object.assign(this.methodStrategies, {
      create: this.create.bind(this),
      catch: this.catch.bind(this),
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

  getEvolutionData(level: number): EvolutionData | undefined {
    return this.evolutionMap.get(level)
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
      const { transaction } = computeInputs
      const { to, from } = transaction
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[to],
        'token missing from self...',
      )

      const data = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const price = parseInt(data.price)
      const paymentProgramAddress = data.paymentProgramAddress

      const availableTokenIds = validate(
        currProgramInfo?.tokenIds,
        'missing nfts to mint...',
      )

      const tokenIds = []

      tokenIds.push(availableTokenIds[0])
      const amountNeededToMint = parseAmountToBigInt(price.toString())

      const tokenMap = validate(
        JSON.parse(data.tokenMap),
        'tokenMap is not valid',
      )

      const ivs = JSON.stringify(generateIVs())
      const evs = JSON.stringify(generateInitialEVs())

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdStr = parseInt(formatHexToAmount(tokenIds[i])).toString()
        const token = tokenMap[tokenIdStr]
        tokenMap[tokenIdStr] = {
          ownerAddress: transaction.from,
          imgUrl: token.imgUrl,
          level: '1',
          ivs,
          evs,
        }
      }

      const dataStr = validateAndCreateJsonString({
        tokenMap: JSON.stringify(tokenMap),
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

      const mintInstructions = buildMintInstructions({
        from: transaction.from,
        programId: transaction.programId,
        paymentTokenAddress: paymentProgramAddress,
        inputValue: amountNeededToMint,
        returnedTokenIds: tokenIds,
      })

      return new Outputs(computeInputs, [
        ...mintInstructions,
        caughtPokemonInstructions,
      ]).toJson()
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

      const tokenId = validate(
        txInputs?.tokenId,
        'missing tokenId in transactionInputs...',
      )

      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const metadata = validate(
        currProgramInfo?.metadata,
        'token missing required data to mint...',
      )

      const data = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const tokenMap = validate(
        JSON.parse(data.tokenMap),
        'tokenMap is not valid',
      )

      const tokenIdStr = parseInt(formatHexToAmount(tokenId)).toString()
      const pokemon = tokenMap[tokenIdStr]
      const currentLevel = parseInt(pokemon?.level)
      const nextLevel = currentLevel + 1
      console.log(nextLevel)
      const evolutionData = this.getEvolutionData(nextLevel)

      const metadataUpdate = { ...metadata }
      if (evolutionData) {
        tokenMap[tokenIdStr].level = nextLevel.toString()
        tokenMap[tokenIdStr].imgUrl = evolutionData.imgUrl
        metadataUpdate.symbol = evolutionData.symbol
        metadataUpdate.name = evolutionData.name
      }

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
