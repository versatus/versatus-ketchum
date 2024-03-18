import {
  Address,
  ComputeInputs,
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

class Squirtle extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      create: this.create.bind(this),
      catch: this.catch.bind(this),
      train: this.train.bind(this),
    })
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
      const baseStats =
        '{"hp":44,"attack":48,"defense":65,"spAtk":50,"spDef":64,"speed":43}'

      const imgUrl = 'https://img.pokemondb.net/artwork/avif/squirtle.avif'

      validate(parseFloat(price), 'invalid price')

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        imgUrl,
        paymentProgramAddress,
        price,
        level,
        baseStats,
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

      const updateCharmanderTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const caughtInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(String(transaction.to))),
            new AddressOrNamespace(THIS),
            [updateCharmanderTokenData],
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
        caughtInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  train(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs

      const currProgramInfo = validate(
        computeInputs.accountInfo,
        'token missing from self...',
      )

      const tokenMetadata = validate(
        currProgramInfo?.programAccountMetadata,
        'token missing required metadata to train...',
      )

      const tokenData = validate(
        currProgramInfo?.programAccountData,
        'token missing required data to train...',
      )

      const metadataUpdate = {
        ...tokenMetadata,
      }

      const level = (parseInt(tokenData.level) + 1).toString()

      const dataUpdate: { level: string; imgUrl?: string } = {
        level,
      }

      if (parseInt(level) === 16) {
        dataUpdate.imgUrl =
          'https://img.pokemondb.net/artwork/avif/wartortle.avif'
        metadataUpdate.symbol = 'WARTORTLE'
        metadataUpdate.name = 'Wartortle'
      } else if (parseInt(level) === 36) {
        dataUpdate.imgUrl =
          'https://img.pokemondb.net/artwork/avif/blastoise.avif'
        metadataUpdate.symbol = 'BLASTOISE'
        metadataUpdate.name = 'Blastoise'
      }

      const dataStr = validateAndCreateJsonString(dataUpdate)

      const metadataStr = validateAndCreateJsonString(metadataUpdate)

      const addProgramMetadata = buildProgramUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

      const updatePokemonTokenData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            addProgramMetadata,
            updatePokemonTokenData,
          ]),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }
}

const start = (input: ComputeInputs) => {
  try {
    const contract = new Squirtle()
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
