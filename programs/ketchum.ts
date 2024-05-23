import {
  Address,
  AddressOrNamespace,
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistribution,
  buildTokenUpdateField,
  buildUpdateInstruction,
  IComputeInputs,
  formatAmountToHex,
  formatHexToAmount,
  Outputs,
  parseTxInputs,
  ProgramUpdate,
  THIS,
  TokenOrProgramUpdate,
  TokenUpdate,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'
import { Program } from '@versatus/versatus-javascript'

class Ketchum extends Program {
  constructor() {
    super()
    this.registerContractMethod('addPokemon', this.addPokemon)
    this.registerContractMethod('addTrainer', this.addTrainer)
    this.registerContractMethod('create', this.create)
  }

  addPokemon(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = JSON.parse(transactionInputs)
      const { symbol, programAddress } = txInputs
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const tokenData = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const currentPokemon = validate(
        JSON.parse(tokenData.pokemon),
        'no pokemon found...',
      )

      const updatedPokemon = {
        ...currentPokemon,
        [symbol]: programAddress,
      }

      const dataStr = validateAndCreateJsonString({
        ...tokenData,
        pokemon: JSON.stringify(updatedPokemon),
      })

      const updatePokemonListTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const addPokemonToMapInstruction = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [updatePokemonListTokenData],
          ),
        ),
      })

      return new Outputs(computeInputs, [addPokemonToMapInstruction]).toJson()
    } catch (e) {
      throw e
    }
  }

  addTrainer(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const txInputs = parseTxInputs(computeInputs)
      const { address, data } = txInputs
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...',
      )

      const tokenData = validate(
        currProgramInfo?.data,
        'token missing required data to mint...',
      )

      const currentTrainers = validate(
        JSON.parse(tokenData.trainers),
        'no pokemon found...',
      )

      const updatedTrainers = {
        ...currentTrainers,
        [address]: data,
      }

      const dataStr = validateAndCreateJsonString({
        ...tokenData,
        trainers: JSON.stringify(updatedTrainers),
      })

      const updatePokemonListTokenData = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const addPokemonToMapInstruction = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(THIS),
            new AddressOrNamespace(THIS),
            [updatePokemonListTokenData],
          ),
        ),
      })

      return new Outputs(computeInputs, [addPokemonToMapInstruction]).toJson()
    } catch (e) {
      throw e
    }
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

      const recipientAddress = txInputs?.recipientAddress ?? transaction.to

      // data
      const imgUrl = txInputs?.imgUrl
      const methods = 'addPokemon,create,update'
      const trainers = '{}'
      const pokemon = '{}'

      validate(
        parseInt(initializedSupply) <= parseInt(totalSupply),
        'invalid supply',
      )

      validate(
        parseInt(formatHexToAmount(formatAmountToHex(initializedSupply))) <= 16,
        'woah partner, too many tokens for beta. 16 max.',
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

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        imgUrl,
        methods,
        trainers,
        pokemon,
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

      const distributionInstruction = buildTokenDistribution({
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
}

Ketchum.run()
