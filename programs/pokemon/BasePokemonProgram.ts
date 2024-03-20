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
import { generateInitialEVs, generateIVs } from '../../lib/formulae'

export class BasePokemonProgram extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      create: this.create.bind(this),
      catch: this.catch.bind(this),
      train: this.train.bind(this),
    })
  }

  getBaseStats() {
    return '{}'
  }

  getInitialImageUrl() {
    return ''
  }

  getEvolutionData(level: number) {
    return {
      imgUrl: '',
      symbol: '',
      name: '',
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
      const baseStats = this.getBaseStats()
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

      const updateCaughtPokemonTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const caughtPokemonInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(String(transaction.from))),
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
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const tokenMetadata = validate(
        currProgramInfo?.metadata,
        'token missing required metadata to train...',
      )

      const tokenData = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const metadataUpdate = {
        ...tokenMetadata,
      }

      const parsedLevel = parseInt(tokenData.level)

      const level = (parsedLevel + 1).toString()
      const dataUpdate: { level: string; imgUrl?: string } = {
        level,
      }

      if (parsedLevel === 16) {
        dataUpdate.imgUrl = this.getEvolutionData(parsedLevel).imgUrl
        metadataUpdate.symbol = this.getEvolutionData(parsedLevel).symbol
        metadataUpdate.name = this.getEvolutionData(parsedLevel).name
      } else if (parseInt(level) === 36) {
        dataUpdate.imgUrl = this.getEvolutionData(parsedLevel).imgUrl
        metadataUpdate.symbol = this.getEvolutionData(parsedLevel).symbol
        metadataUpdate.name = this.getEvolutionData(parsedLevel).name
      }

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
            new AddressOrNamespace(new Address(transaction.from)),
            new AddressOrNamespace(THIS),
            [updateMetadata, updateTokenData],
          ),
        ),
      })

      return new Outputs(computeInputs, [programUpdateInstructions]).toJson()
    } catch (e) {
      throw e
    }
  }
}
