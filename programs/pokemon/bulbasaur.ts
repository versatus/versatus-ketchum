import { ComputeInputs } from '@versatus/versatus-javascript'

import { BasePokemonProgram } from './BasePokemonProgram'

class Bulbasaur extends BasePokemonProgram {
  getBaseStats() {
    return '{"hp":45,"attack":49,"defense":49,"spAtk":65,"spDef":65,"speed":45}'
  }

  getInitialImageUrl() {
    return 'https://img.pokemondb.net/artwork/avif/bulbasaur.avif'
  }

  getEvolutionData(level: number) {
    if (level === 16) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/ivysaur.avif',
        symbol: 'IVYSAUR',
        name: 'Ivysaur',
      }
    } else if (level === 36) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/venusaur.avif',
        symbol: 'VENUSAUR',
        name: 'Venusaur',
      }
    }
    return super.getEvolutionData(level)
  }
}

const start = (input: ComputeInputs) => {
  try {
    const contract = new Bulbasaur()
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
