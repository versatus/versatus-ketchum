import {
  Address,
  AddressOrNamespace,
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
  buildTokenUpdateField,
  buildUpdateInstruction,
  ComputeInputs,
  formatAmountToHex,
  formatHexToAmount,
  Outputs,
  ProgramUpdate,
  THIS,
  TokenOrProgramUpdate,
  TokenUpdate,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'
import { Program } from '@versatus/versatus-javascript'

class KetchumMainProgram extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      addPokemon: this.addPokemon.bind(this),
      create: this.create.bind(this),
    })
  }

  addPokemon(computeInputs: ComputeInputs) {
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

      const currentPokemon = JSON.parse(tokenData.pokemon)

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
      const methods = 'addPokemon,create,update'
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

const start = (input: ComputeInputs) => {
  try {
    const contract = new KetchumMainProgram()
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
