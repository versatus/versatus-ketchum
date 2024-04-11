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

      const transferToCaller = buildTransferInstruction({
        from: THIS,
        to: from,
        tokenAddress: transaction.to,
        tokenIds,
      })

      return new Outputs(computeInputs, [
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

  train(computeInputs: ComputeInputs) {
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

      const programInfo = parseProgramInfo(computeInputs)

      const data = validate(
        programInfo?.data,
        'token missing required data to mint...',
      )

      const tokenIdStr = parseInt(formatHexToAmount(tokenId)).toString()
      const currentLevel = parseInt(level)
      const nextLevel = currentLevel + 1
      const evolutionData = this.getEvolutionData(nextLevel)

      if (evolutionData) {
        data[`${tokenIdStr}-level`] = nextLevel.toString()
        data[`${tokenIdStr}-imgUrl`] = evolutionData.imgUrl
        data[`${tokenIdStr}-symbol`] = evolutionData.symbol
        data[`${tokenIdStr}-name`] = evolutionData.name
        data[`${tokenIdStr}-baseStats`] = evolutionData.baseStats
        data[`${tokenIdStr}-evYields`] = evolutionData.evYields
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

const constructorArguments = JSON.stringify({"1":{"id":19,"name":"rattata","symbol":"RATTATA","baseStats":"{\"hp\":\"30\",\"attack\":\"56\",\"defense\":\"35\",\"spAtk\":\"25\",\"spDef\":\"35\",\"speed\":\"72\"}","evYields":"{\"hp\":\"0\",\"attack\":\"0\",\"defense\":\"0\",\"spAtk\":\"0\",\"spDef\":\"0\",\"speed\":\"1\"}","imgUrl":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/19.gif","level":"1","moves":"[{\"name\":\"bubble-beam\",\"pp\":\"20\",\"power\":\"65\",\"type\":\"water\"},{\"name\":\"thunderbolt\",\"pp\":\"15\",\"power\":\"90\",\"type\":\"electric\"},{\"name\":\"dig\",\"pp\":\"10\",\"power\":\"80\",\"type\":\"ground\"},{\"name\":\"tackle\",\"pp\":\"35\",\"power\":\"40\",\"type\":\"normal\"},{\"name\":\"swift\",\"pp\":\"20\",\"power\":\"60\",\"type\":\"normal\"},{\"name\":\"double-edge\",\"pp\":\"15\",\"power\":\"120\",\"type\":\"normal\"},{\"name\":\"water-gun\",\"pp\":\"25\",\"power\":\"40\",\"type\":\"water\"},{\"name\":\"body-slam\",\"pp\":\"15\",\"power\":\"85\",\"type\":\"normal\"},{\"name\":\"hyper-fang\",\"pp\":\"15\",\"power\":\"80\",\"type\":\"normal\"},{\"name\":\"thunder\",\"pp\":\"10\",\"power\":\"110\",\"type\":\"electric\"},{\"name\":\"blizzard\",\"pp\":\"5\",\"power\":\"110\",\"type\":\"ice\"},{\"name\":\"take-down\",\"pp\":\"20\",\"power\":\"90\",\"type\":\"normal\"},{\"name\":\"rage\",\"pp\":\"20\",\"power\":\"20\",\"type\":\"normal\"},{\"name\":\"skull-bash\",\"pp\":\"10\",\"power\":\"130\",\"type\":\"normal\"},{\"name\":\"quick-attack\",\"pp\":\"30\",\"power\":\"40\",\"type\":\"normal\"}]","types":"[\"normal\"]"},"20":{"id":20,"name":"raticate","symbol":"RATICATE","baseStats":"{\"hp\":\"55\",\"attack\":\"81\",\"defense\":\"60\",\"spAtk\":\"50\",\"spDef\":\"70\",\"speed\":\"97\"}","evYields":"{\"hp\":\"0\",\"attack\":\"0\",\"defense\":\"0\",\"spAtk\":\"0\",\"spDef\":\"0\",\"speed\":\"2\"}","imgUrl":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/20.gif","types":"[\"normal\"]","moves":"[{\"name\":\"skull-bash\",\"pp\":\"10\",\"power\":\"130\",\"type\":\"normal\"},{\"name\":\"take-down\",\"pp\":\"20\",\"power\":\"90\",\"type\":\"normal\"},{\"name\":\"body-slam\",\"pp\":\"15\",\"power\":\"85\",\"type\":\"normal\"},{\"name\":\"ice-beam\",\"pp\":\"10\",\"power\":\"90\",\"type\":\"ice\"},{\"name\":\"blizzard\",\"pp\":\"5\",\"power\":\"110\",\"type\":\"ice\"},{\"name\":\"hyper-fang\",\"pp\":\"15\",\"power\":\"80\",\"type\":\"normal\"},{\"name\":\"hyper-beam\",\"pp\":\"5\",\"power\":\"150\",\"type\":\"normal\"},{\"name\":\"tackle\",\"pp\":\"35\",\"power\":\"40\",\"type\":\"normal\"},{\"name\":\"bubble-beam\",\"pp\":\"20\",\"power\":\"65\",\"type\":\"water\"},{\"name\":\"dig\",\"pp\":\"10\",\"power\":\"80\",\"type\":\"ground\"},{\"name\":\"double-edge\",\"pp\":\"15\",\"power\":\"120\",\"type\":\"normal\"},{\"name\":\"water-gun\",\"pp\":\"25\",\"power\":\"40\",\"type\":\"water\"},{\"name\":\"swift\",\"pp\":\"20\",\"power\":\"60\",\"type\":\"normal\"},{\"name\":\"thunderbolt\",\"pp\":\"15\",\"power\":\"90\",\"type\":\"electric\"},{\"name\":\"thunder\",\"pp\":\"10\",\"power\":\"110\",\"type\":\"electric\"},{\"name\":\"quick-attack\",\"pp\":\"30\",\"power\":\"40\",\"type\":\"normal\"},{\"name\":\"rage\",\"pp\":\"20\",\"power\":\"20\",\"type\":\"normal\"}]"}})

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
