import { ComputeInputs } from '@versatus/versatus-javascript'

import { BasePokemonProgram } from './BasePokemonProgram'

class Charmander extends BasePokemonProgram {
  getBaseStats() {
    return '{"hp":39,"attack":52,"defense":43,"spAtk":60,"spDef":50,"speed":65}'
  }

  getInitialImageUrl() {
    return 'https://img.pokemondb.net/artwork/avif/charmander.avif'
  }

  getEvolutionData(level: number) {
    if (level >= 36) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/charizard.avif',
        symbol: 'CHARIZARD',
        name: 'Charizard',
      }
    } else if (level >= 16) {
      return {
        imgUrl: 'https://img.pokemondb.net/artwork/avif/charmeleon.avif',
        symbol: 'CHARMELEON',
        name: 'Charmeleon',
      }
    }
    return super.getEvolutionData(level)
  }
}

const start = (input: ComputeInputs) => {
  try {
    const contract = new Charmander()
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
