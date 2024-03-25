import axios from 'axios'
import { runCommand } from '../lib/shell'
import { KETCHUM_PROGRAM_ADDRESS, VERSE_PROGRAM_ADDRESS } from '../lib/consts'

type Stat = {
  base_stat: number
  effort: number
  stat: {
    name: string
    url: string
  }
}

type ConvertedStats = {
  hp: number
  attack: number
  defense: number
  spAtk: number
  spDef: number
  speed: number
}

const getPokemon = async (pokemonNameOrId: string | number) => {
  try {
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`,
    )
    const pokemon = response.data
    const { id, name, stats, sprites } = pokemon
    const baseStats = JSON.stringify(convertStats(stats))
    const imgUrl =
      sprites?.['versions']?.['generation-v']?.['black-white']?.['animated']
        .front_default

    return {
      id,
      name,
      symbol: name.toUpperCase(),
      baseStats,
      imgUrl,
    }
  } catch (error) {
    console.log(error)
  }
}

const buildPokemonWithEvolutions = async (pokemonNameOrId: string | number) => {
  try {
    const pokemon = await getPokemon(pokemonNameOrId)
    if (!pokemon) throw new Error(`couldn't find ${pokemonNameOrId}`)
    const { id, name, baseStats, symbol, imgUrl } = pokemon
    const specie = await fetchPokemonSpecies(id)
    const { evolution_chain: evoChain } = specie
    const { chain } = await fetchPokeApiData(evoChain.url)

    const builtPokemon = {
      '0': { id, name, symbol, baseStats, imgUrl },
    }

    if (chain.evolves_to.length > 0) {
      // @ts-ignore
      builtPokemon[chain.evolves_to[0].evolution_details[0].min_level ?? '16'] =
        await getPokemon(chain.evolves_to[0].species.name)
    }

    if (chain.evolves_to[0].evolves_to.length > 0) {
      // @ts-ignore
      builtPokemon[
        chain.evolves_to[0].evolves_to[0].evolution_details[0].min_level ?? '32'
      ] = await getPokemon(chain.evolves_to[0].evolves_to[0].species.name)
    }

    return builtPokemon
  } catch (e) {
    console.log(pokemonNameOrId)
    console.log(e)
  }
}

function convertStats(stats: Stat[]): ConvertedStats {
  const convertedStats: Partial<ConvertedStats> = {}

  stats.forEach(stat => {
    const value = stat.base_stat

    switch (stat.stat.name) {
      case 'hp':
        convertedStats.hp = value
        break
      case 'attack':
        convertedStats.attack = value
        break
      case 'defense':
        convertedStats.defense = value
        break
      case 'special-attack':
        convertedStats.spAtk = value
        break
      case 'special-defense':
        convertedStats.spDef = value
        break
      case 'speed':
        convertedStats.speed = value
        break
      default:
        // Handle any unexpected stats here
        break
    }
  })

  return convertedStats as ConvertedStats
}

// https://pokeapi.co/api/v2/pokemon-species/3/
const fetchPokemonSpecies = async (id: number) => {
  try {
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon-species/${id}`,
    )
    return response.data
  } catch (error) {
    console.error(error)
  }
}

const fetchPokeApiData = async (url: string) => {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    console.error(error)
  }
}

async function fetchMultiplePokemons(
  pokemonToInitialize: string[],
): Promise<any> {
  const promises: Promise<any>[] = []

  for (let i = 0; i < pokemonToInitialize.length; i++) {
    promises.push(buildPokemonWithEvolutions(pokemonToInitialize[i]))
  }

  try {
    const pokemons = await Promise.all(promises)
    return pokemons.map(pokemon => {
      return JSON.stringify(pokemon)
    })
  } catch (error) {
    console.error(`Error fetching Pokemon data: ${error}`)
  }
}

// fetchMultiplePokemons(['eevee'])

async function buildPokemonClass(pokemonName: string) {
  const buildCommand = `lasrctl build programs/pokemon/${pokemonName}.ts`
  try {
    const result = await runCommand(buildCommand)
    console.log(`Build successful for ${pokemonName}: `, result)
  } catch (error) {
    console.error(`Build failed for ${pokemonName}: `, error)
  }
}

async function testPokemonClass(pokemonName: string) {
  const buildCommand = `lasrctl test -p ${pokemonName} -i inputs`
  try {
    const result = await runCommand(buildCommand)
    console.log(`Build successful for ${pokemonName}: `, result)
  } catch (error) {
    console.error(`Build failed for ${pokemonName}: `, error)
  }
}

async function deployPokemon(pokemonName: string) {
  const buildCommand = `lasrctl deploy -b ${pokemonName} -a hath -n ${pokemonName} -p ${pokemonName} -s ${pokemonName.toUpperCase()} --initializedSupply 1 -t 1 -i '{"price":"1","paymentProgramAddress":"${VERSE_PROGRAM_ADDRESS}"}'`
  try {
    const result = await runCommand(buildCommand)
    console.log(`Deploy successful for ${pokemonName}: `, result)

    // Adjusted regular expression
    const programAddressMatch = result.match(
      /programAddress:\s*(0x[a-fA-F0-9]+)/,
    )

    console.log({ programAddressMatch })

    return result
  } catch (error) {
    console.error(`Deploy failed for ${pokemonName}: `, error)
    return deployPokemon(pokemonName)
    // return null // or throw the error
  }
}

async function registerPokemon(pokemonName: string, programAddress: string) {
  const buildCommand = `lasrctl call --inputs '{"symbol":"${pokemonName.toUpperCase()}","programAddress":"${programAddress}"}' --programAddress ${KETCHUM_PROGRAM_ADDRESS} --op addPokemon`
  try {
    const result = await runCommand(buildCommand)
    console.log(`Build successful for ${pokemonName}: `, result)
  } catch (error) {
    console.error(`Build failed for ${pokemonName}: `, error)
  }
}

async function initializePokemons(pokemonToInitialize: string[]) {
  try {
    console.log(`deploying ${pokemonToInitialize.map(v => `${v}`)}`)
    const pokemonDataList = await fetchMultiplePokemons(pokemonToInitialize)
    console.log('pokemons fetched')
    for (const pokemonDataString of pokemonDataList) {
      // Parse the JSON data to access the name property
      const pokemonData = JSON.parse(pokemonDataString)
      const pokemonName = pokemonData[Object.keys(pokemonData)[0]].name // Assuming '0' is always the first key

      // Run the createPokemonClass.sh script
      const createCommand = `./scripts/createPokemonClass.sh programs/pokemon/BasePokemonProgram.ts '${JSON.stringify(pokemonData)}' ${pokemonName}`
      try {
        await runCommand(createCommand)
        console.log(`Class creation successful for ${pokemonName}`)
      } catch (error) {
        console.error(`Class creation failed for ${pokemonName}: `, error)
        continue // Skip building if class creation fails
      }

      console.log('Building Pokemon Class with lasrctl...')
      await buildPokemonClass(pokemonName)
      console.log(`Deploying ${pokemonName} with lasrctl...`)
      const result = await deployPokemon(pokemonName)
      console.log(`${pokemonName} deployed!`)

      if (!result) {
        throw new Error('Failed to deploy the program.')
      }

      const start = result.indexOf('==> programAddress: ') + 27

      const programAddress = result.slice(start, start + 42)

      console.log({
        programAddress,
      })

      // return programAddress

      if (!programAddress) {
        throw new Error('NO PROGRAM ADDRESS')
      }
      console.log(
        `Registering ${pokemonName} with program address: ${programAddress}...`,
      )
      await registerPokemon(pokemonName, programAddress)
      console.log('pokemon registered! doing next pokemon')
    }
  } catch (error) {
    console.error(`Error initializing Pokemon: ${error}`)
  }
}

initializePokemons([
  // 'weedle',
  // 'pidgey',
  // 'rattata',
  // 'spearow',
  // 'jigglypuff',
  // 'zubat',
  // 'oddish',
  // 'paras',
  // 'venonat',
  // 'diglett',
  // 'meowth',
  'psyduck',
  'mankey',
  'growlithe',
  'poliwag',
  'abra',
  'machop',
  'bellsprout',
  'geodude',
  'ponyta',
  'slowpoke',
  'magnemite',
  'doduo',
  'seel',
  'grimer',
])
