import { ComputeInputs } from '@versatus/versatus-javascript'

import { BasePokemonProgram } from './BasePokemonProgram'

class Squirtle extends BasePokemonProgram {
  getBaseStats() {
    return '{"hp":44,"attack":48,"defense":65,"spAtk":50,"spDef":64,"speed":43}'
  }

  getInitialImageUrl() {
    return 'https://img.pokemondb.net/artwork/avif/squirtle.avif'
  }

  getEvolutionData(level: number) {
    if (level === 16) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/wartortle.avif',
        symbol: 'WARTORTLE',
        name: 'Wartortle',
      }
    } else if (level === 36) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/blastoise.avif',
        symbol: 'BLASTOISE',
        name: 'Blastoise',
      }
    }
    return super.getEvolutionData(level)
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
