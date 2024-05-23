import axios from 'axios'
import { runCommand } from '../lib/shell'
import {
  KETCHUM_BATTLE_ADDRESS,
  KETCHUM_POKEBALL_ADDRESS,
  KETCHUM_PROGRAM_ADDRESS,
} from '../lib/consts'
import { IMove, IMoveResponse } from '../lib/types'

type Stat = {
  base_stat: number
  effort: number
  stat: {
    name: string
    url: string
  }
}

interface Move {
  name: string
  type: string
  url: string
  level_learned_at: number
  power: number
  pp: number
}

type ConvertedStats = {
  hp: string
  attack: string
  defense: string
  spAtk: string
  spDef: string
  speed: string
}

interface EvolutionData {
  id: number
  name: string
  symbol: string
  baseStats: string
  growthRate: string
  evYields: string
  baseExp: string
  imgUrl: string
  moves: string
  types: string
}

const getPokemon = async (pokemonNameOrId: string | number) => {
  try {
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`,
    )
    const pokemon = response.data
    const {
      id,
      name,
      stats,
      sprites,
      moves,
      types,
      base_experience: baseExp,
    } = pokemon

    const specie = await fetchPokemonSpecies(id)
    const { growth_rate: growthRate } = specie

    const convertedStats = convertStats(stats)
    const convertedEvYield = convertEvYield(stats)

    const baseStats = JSON.stringify(convertedStats)
    const evYields = JSON.stringify(convertedEvYield)
    const imgUrl =
      sprites?.['versions']?.['generation-v']?.['black-white']?.['animated']
        .front_default

    // @ts-ignore
    const movesData: Move[] = await buildMoves(moves)
    const typesData = types.map(
      (type: { type: { name: string } }) => type.type.name,
    )

    return {
      id,
      name,
      symbol: name.toUpperCase(),
      baseStats,
      evYields,
      imgUrl,
      growthRate: growthRate.name,
      baseExp: String(baseExp),
      types: JSON.stringify(typesData),
      moves: JSON.stringify(movesData),
    } as EvolutionData
  } catch (error) {
    console.log(error)
  }
}

const buildMoves = async (moves: IMoveResponse[]) => {
  const movesWithDetailsPromises = moves.map(async move => {
    const isInRedBlue = move.version_group_details.some(
      (group: any) => group.version_group?.name === 'red-blue',
    )
    if (!isInRedBlue) return null

    const { pp, power, type, name } = await fetchPokeApiData(move.move.url)
    if (pp && power) {
      return { name: move.move.name, pp, power, type: type.name } as IMove
    }
    return null
  })
  const movesWithDetails = (await Promise.all(movesWithDetailsPromises)).filter(
    move => move?.power,
  )
  const shuffledMoves = movesWithDetails.sort(() => 0.5 - Math.random())
  return shuffledMoves.map(move => ({
    name: move?.name,
    pp: move?.pp.toString(),
    power: move?.power.toString(),
    type: move?.type,
  }))
}

const buildPokemonWithEvolutions = async (pokemonNameOrId: string | number) => {
  try {
    const pokemon = await getPokemon(pokemonNameOrId)
    if (!pokemon) throw new Error(`couldn't find ${pokemonNameOrId}`)
    const {
      id,
      name,
      baseStats,
      baseExp,
      evYields,
      symbol,
      growthRate,
      imgUrl,
      moves,
      types,
    } = pokemon

    const specie = await fetchPokemonSpecies(id)
    const { evolution_chain: evoChain } = specie
    const { chain } = await fetchPokeApiData(evoChain.url)

    const builtPokemon = {
      '1': {
        id,
        name,
        symbol,
        baseStats,
        evYields,
        baseExp,
        growthRate,
        imgUrl,
        level: '1',
        moves,
        types,
      },
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
        convertedStats.hp = value.toString()
        break
      case 'attack':
        convertedStats.attack = value.toString()
        break
      case 'defense':
        convertedStats.defense = value.toString()
        break
      case 'special-attack':
        convertedStats.spAtk = value.toString()
        break
      case 'special-defense':
        convertedStats.spDef = value.toString()
        break
      case 'speed':
        convertedStats.speed = value.toString()
        break
      default:
        // Handle any unexpected stats here
        break
    }
  })

  return convertedStats as ConvertedStats
}

function convertEvYield(stats: Stat[]): ConvertedStats {
  const convertedStats: Partial<ConvertedStats> = {}

  stats.forEach(stat => {
    const value = stat.effort

    switch (stat.stat.name) {
      case 'hp':
        convertedStats.hp = value.toString()
        break
      case 'attack':
        convertedStats.attack = value.toString()
        break
      case 'defense':
        convertedStats.defense = value.toString()
        break
      case 'special-attack':
        convertedStats.spAtk = value.toString()
        break
      case 'special-defense':
        convertedStats.spDef = value.toString()
        break
      case 'speed':
        convertedStats.speed = value.toString()
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
  const results: any[] = []

  for (let i = 0; i < pokemonToInitialize.length; i++) {
    try {
      const pokemon = await buildPokemonWithEvolutions(pokemonToInitialize[i])
      results.push(JSON.stringify(pokemon))
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for 1 second between fetches
      console.log(`doing ${i}...`)
    } catch (error) {
      console.error(
        `Error fetching Pokemon data for ${pokemonToInitialize[i]}: ${error}`,
      )
    }
  }

  return results
}

async function buildPokemonClass(pokemonName: string) {
  const buildCommand = `lasrctl build programs/${pokemonName}.ts`
  try {
    await runCommand(buildCommand)
    console.log(`Build successful for ${pokemonName}`)
  } catch (error) {
    console.error(`Build failed for ${pokemonName}: `, error)
  }
}

async function deployPokemon(pokemonName: string) {
  const buildCommand = `lasrctl deploy -b ${pokemonName} -a hath2 -n ${pokemonName} -p ${pokemonName} -s ${pokemonName.toUpperCase()} --initializedSupply 20 -t 20 --txInputs '{}'`
  console.log(`running command: ${buildCommand}`)
  try {
    const result = await runCommand(buildCommand)
    console.log(`Deploy successful for ${pokemonName}`)
    console.log('result', result)

    return result
  } catch (error) {
    console.error(`Deploy failed for ${pokemonName}: `, error)
    return deployPokemon(pokemonName)
    // return null // or throw the error
  }
}

async function registerPokemon(pokemonName: string, programAddress: string) {
  const buildCommand = `lasrctl call --txInputs '{"symbol":"${pokemonName.toUpperCase()}","programAddress":"${programAddress}"}' --programAddress ${KETCHUM_PROGRAM_ADDRESS} --op addPokemon`
  try {
    const result = await runCommand(buildCommand)
    console.log(`Build successful for ${pokemonName}: `, result)
  } catch (error) {
    console.error(`Build failed for ${pokemonName}: `, error)
  }
}

async function registerPokemonWithBattleContract(programAddress: string) {
  const buildCommand = `lasrctl call --txInputs '{"pokemonAddress":"${programAddress}"}' --programAddress ${KETCHUM_BATTLE_ADDRESS} --op addPokemon`
  try {
    await runCommand(buildCommand)
    console.log('program added battle program linked')
  } catch (error) {}
}

async function initializePokemons(pokemonToInitialize: string[]) {
  try {
    console.log(
      `Fetching desired pokemons: ${pokemonToInitialize.map(v => `${v}`)}`,
    )

    const pokemonDataList = await fetchMultiplePokemons(pokemonToInitialize)
    console.log('Pokemons fetched')
    for (const pokemonDataString of pokemonDataList) {
      const pokemonData = JSON.parse(pokemonDataString)
      const pokemonName = pokemonData[Object.keys(pokemonData)[0]].name

      try {
        await runCommand(`rm -rf ./programs/${pokemonName}.ts`)
        await runCommand(`./build/lib/${pokemonName}.js`)
        await runCommand(`./build/programs/${pokemonName}.js`)
      } catch (e) {
        console.log('no files found to delete')
      }

      const createCommand = `./scripts/createPokemonClass.sh programs/BasePokemonProgram.ts '${JSON.stringify(pokemonData)}' ${pokemonName}`
      try {
        console.log(`Creating ${pokemonName} class...`)
        await runCommand(createCommand)
        console.log(`Class creation successful for ${pokemonName}`)
      } catch (error) {
        console.error(`Class creation failed for ${pokemonName}: `, error)
        continue
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

      if (!programAddress) {
        throw new Error('NO PROGRAM ADDRESS')
      }

      console.log(
        `Registering ${pokemonName} with program address: ${programAddress}...`,
      )

      await registerPokemon(pokemonName, programAddress)
      // await registerPokemonWithBattleContract(programAddress)
      console.log('pokemon registered! doing next pokemon')
    }
  } catch (error) {
    console.error(`Error initializing Pokemon: ${error}`)
  }
}

initializePokemons([
  // 'bulbasaur',
  'charmander',
  'squirtle',
  // 'beartic',
  // 'caterpie',
  // 'weedle',
  // 'pidgey',
  // 'pichu',
  // 'rattata',
  // 'spearow',
  // 'ekans',
  // 'sandshrew',
  // 'nidoran',
  // 'clefairy',
  // 'vulpix',
  // 'jigglypuff',
  // 'zubat',
  // 'oddish',
  // 'paras',
  // 'venonat',
  // 'diglett',
  // 'meowth',
  // 'psyduck',
  // 'mankey',
  // 'growlithe',
  // 'poliwag',
  // 'abra',
  // 'machop',
  // 'bellsprout',
  // 'tentacool',
  // 'geodude',
  // 'ponyta',
  // 'slowpoke',
  // 'magnemite',
  // 'farfetch’d',
  // 'doduo',
  // 'seel',
  // 'grimer',
  // 'shellder',
  // 'gastly',
  // 'onix',
  // 'drowzee',
  // 'krabby',
  // 'voltorb',
  // 'exeggcute',
  // 'cubone',
  // 'lickitung',
  // 'koffing',
  // 'rhyhorn',
  // 'chansey',
  // 'tangela',
  // 'kangaskhan',
  // 'horsea',
  // 'goldeen',
  // 'staryu',
  // 'mr. mime',
  // 'scyther',
  // 'jynx',
  // 'electabuzz',
  // 'magmar',
  // 'pinsir',
  // 'tauros',
  // 'magikarp',
  // 'lapras',
  // 'ditto',
  // 'eevee',
  // 'porygon',
  // 'omanyte',
  // 'kabuto',
  // 'aerodactyl',
  // 'snorlax',
  // 'dratini',
  // 'articuno',
  // 'zapdos',
  // 'moltres',
  // 'mewtwo',
  // 'mew',
  // 'ivysaur',
  // 'venusaur',
  // 'charmeleon',
  // 'charizard',
  // 'wartortle',
  // 'blastoise',
  // 'metapod',
  // 'butterfree',
  // 'kakuna',
  // 'beedrill',
  // 'pidgeotto',
  // 'pidgeot',
  // 'raticate',
  // 'fearow',
  // 'arbok',
  // 'raichu',
  // 'sandslash',
  // 'nidorina',
  // 'nidoqueen',
  // 'nidorino',
  // 'nidoking',
  // 'clefable',
  // 'ninetales',
  // 'wigglytuff',
  // 'golbat',
  // 'gloom',
  // 'vileplume',
  // 'parasect',
  // 'venomoth',
  // 'dugtrio',
  // 'persian',
  // 'golduck',
  // 'primeape',
  // 'arcanine',
  // 'poliwhirl',
  // 'poliwrath',
  // 'kadabra',
  // 'alakazam',
  // 'machoke',
  // 'machamp',
  // 'weepinbell',
  // 'victreebel',
  // 'tentacruel',
  // 'graveler',
  // 'golem',
  // 'rapidash',
  // 'slowbro',
  // 'magneton',
  // 'dodrio',
  // 'dewgong',
  // 'muk',
  // 'cloyster',
  // 'haunter',
  // 'gengar',
  // 'hypno',
  // 'kingler',
  // 'electrode',
  // 'exeggutor',
  // 'marowak',
  // 'hitmonlee',
  // 'hitmonchan',
  // 'weezing',
  // 'rhydon',
  // 'seadra',
  // 'seaking',
  // 'starmie',
  // 'jolteon',
  // 'flareon',
  // 'vaporeon',
  // 'omastar',
  // 'kabutops',
  // 'dragonair',
  // 'dragonite',
])
