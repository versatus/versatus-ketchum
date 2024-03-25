import { ComputeInputs } from '@versatus/versatus-javascript'

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

import { generateInitialEVs, generateIVs } from '../../lib/formulae'

interface EvolutionData {
  id: number
  name: string
  symbol: string
  baseStats: string
  imgUrl: string
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

  getEvolutionData(level: number): EvolutionData | undefined {
    return this.evolutionMap.get(level)
  }

  getInitialImageUrl(): string {
    const initialData = this.evolutionMap.get(0)
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
      const imgUrl = this.getInitialImageUrl()
      const methods = 'create,catch,train,update'
      const holders = '{}'

      validate(parseFloat(price), 'invalid price')

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        imgUrl,
        paymentProgramAddress,
        price,
        level,
        baseStats,
        methods,
        holders,
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

      const addDataToToken = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const distributionInstruction = buildTokenDistributionInstruction({
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
      const { transaction, from } = computeInputs
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const tokenData = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const price = parseInt(tokenData.price)
      const paymentProgramAddress = tokenData.paymentProgramAddress

      const availableTokenIds = validate(
        currProgramInfo?.tokenIds,
        'missing nfts to mint...',
      )

      const tokenIds = []

      tokenIds.push(availableTokenIds[0])
      const amountNeededToMint = parseAmountToBigInt(price.toString())

      const ivs = JSON.stringify(generateIVs())
      const evs = JSON.stringify(generateInitialEVs())
      const dataStr = validateAndCreateJsonString({
        ivs,
        evs,
      })

      const updateCaughtPokemonTokenData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const caughtPokemonInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            updateCaughtPokemonTokenData,
          ]),
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
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const tokenData = validate(
        computeInputs.accountInfo.programAccountData,
        'token missing required data to train...',
      )

      const currentLevel = parseInt(tokenData.level)
      const nextLevel = currentLevel + 1
      const evolutionData = this.getEvolutionData(nextLevel)

      const metadataUpdate = { ...currProgramInfo.metadata }
      const dataUpdate = { ...tokenData, level: nextLevel.toString() }

      if (evolutionData) {
        dataUpdate.imgUrl = evolutionData.imgUrl
        metadataUpdate.symbol = evolutionData.symbol
        metadataUpdate.name = evolutionData.name
      }

      const dataStr = validateAndCreateJsonString(dataUpdate)
      const metadataStr = validateAndCreateJsonString(metadataUpdate)

      const updateMetadata = buildProgramUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

      const updateTokenData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            updateMetadata,
            updateTokenData,
          ]),
        ),
      })

      // Return the new outputs as JSON
      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }
}

const constructorArguments = JSON.stringify({"0":{"id":60,"name":"poliwag","symbol":"POLIWAG","baseStats":"{\"hp\":40,\"attack\":50,\"defense\":40,\"spAtk\":40,\"spDef\":40,\"speed\":90}","imgUrl":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/60.gif"},"25":{"id":61,"name":"poliwhirl","symbol":"POLIWHIRL","baseStats":"{\"hp\":65,\"attack\":65,\"defense\":65,\"spAtk\":50,\"spDef\":50,\"speed\":90}","imgUrl":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/61.gif"},"32":{"id":62,"name":"poliwrath","symbol":"POLIWRATH","baseStats":"{\"hp\":90,\"attack\":95,\"defense\":95,\"spAtk\":70,\"spDef\":90,\"speed\":70}","imgUrl":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/62.gif"}})

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
