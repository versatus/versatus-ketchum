import { IComputeInputs } from '@versatus/versatus-javascript'

import {
  buildCreateInstruction,
  buildProgramUpdateField,
  buildTokenDistribution,
  buildTokenUpdateField,
  buildTransferInstruction,
  buildUpdateInstruction,
} from '@versatus/versatus-javascript'
import { THIS } from '@versatus/versatus-javascript'
import { Program, ProgramUpdate } from '@versatus/versatus-javascript'
import { Address, AddressOrNamespace } from '@versatus/versatus-javascript'
import { TokenOrProgramUpdate } from '@versatus/versatus-javascript'
import { Outputs } from '@versatus/versatus-javascript'
import {
  formatAmountToHex,
  formatHexToAmount,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript'

class NonFungibleTokenProgram extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      create: this.create.bind(this),
      sell: this.sell.bind(this),
    })
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

      // data
      const imgUrl = txInputs?.imgUrl
      const methods = 'approve,create,buy,sell,update'
      const forSale = JSON.stringify({})

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
        forSale,
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

  sell(computeInputs: IComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = JSON.parse(transactionInputs)
      const { pokemonAddress, tokenId, price } = txInputs

      const transferToMarketplace = buildTransferInstruction({
        from: from,
        to: 'this',
        tokenAddress: pokemonAddress,
        tokenIds: [tokenId],
      })

      const updateMarketplaceData = buildProgramUpdateField({
        field: 'data',
        value: JSON.stringify({
          forSale: {
            [pokemonAddress]: {
              [tokenId]: price,
            },
          },
        }),
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            updateMarketplaceData,
          ]),
        ),
      })

      return new Outputs(computeInputs, [
        transferToMarketplace,
        programUpdateInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }
}

const start = (input: IComputeInputs) => {
  try {
    const contract = new NonFungibleTokenProgram()
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
