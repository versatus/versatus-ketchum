interface Pokemon {
  name: string
  baseStats: number
  ivs: number
  evs: number
  level: number
}

interface Bet {
  party: string
  pokemonName: string
  amount: number
}

class BettingSystem {
  private pokemonA: Pokemon
  private pokemonB: Pokemon
  private bets: Bet[]
  private betPool: { [pokemonName: string]: number }

  constructor(pokemonA: Pokemon, pokemonB: Pokemon) {
    this.pokemonA = pokemonA
    this.pokemonB = pokemonB
    this.bets = []
    this.betPool = { [pokemonA.name]: 0, [pokemonB.name]: 0 }
  }

  placeBet(bet: Bet) {
    this.bets.push(bet)
    if (this.betPool.hasOwnProperty(bet.pokemonName)) {
      this.betPool[bet.pokemonName] += bet.amount
    } else {
      console.error(`No such pokemon to bet on: ${bet.pokemonName}`)
    }
    this.logCurrentOdds() // Log odds after each bet
  }

  calculateBP(pokemon: Pokemon): number {
    return (
      (pokemon.baseStats + pokemon.ivs) * (1 + pokemon.level / 100) +
      pokemon.evs
    )
  }

  logCurrentOdds() {
    const odds = this.calculateOdds()
    console.log(`Current odds: ${JSON.stringify(odds, null, 2)}`)
  }

  calculateOdds() {
    const totalBetPool = Object.values(this.betPool).reduce(
      (acc, cur) => acc + cur,
      0,
    )
    const odds = {}
    for (const [pokemon, amount] of Object.entries(this.betPool)) {
      // @ts-ignore
      odds[pokemon] = totalBetPool / amount
    }
    return odds
  }

  determineWinner(): string {
    const bpA = this.calculateBP(this.pokemonA)
    const bpB = this.calculateBP(this.pokemonB)
    return bpA > bpB ? this.pokemonA.name : this.pokemonB.name
  }

  calculatePayouts(winner: string) {
    const odds = this.calculateOdds()
    this.bets.forEach(bet => {
      if (bet.pokemonName === winner) {
        // @ts-ignore
        const payout = bet.amount * odds[winner]
        console.log(
          `${bet.party} bet on ${winner} and won ${payout}, net gain: ${payout - bet.amount}`,
        )
      } else {
        console.log(
          `${bet.party} bet on ${bet.pokemonName} and lost ${bet.amount}`,
        )
      }
    })
  }

  simulateBettingAndOutcome() {
    // Calculate winner
    const winner = this.determineWinner()

    // Calculate and log payouts
    this.calculatePayouts(winner)
  }
}

// Simulating with example Pokémon and bets
const pokemonA: Pokemon = {
  name: 'Squirtle',
  baseStats: 300,
  ivs: 31,
  evs: 100,
  level: 50,
}
const pokemonB: Pokemon = {
  name: 'Charmander',
  baseStats: 250,
  ivs: 31,
  evs: 120,
  level: 50,
}

const bettingSystem = new BettingSystem(pokemonA, pokemonB)

// Parties placing bets
bettingSystem.placeBet({ party: 'Alice', pokemonName: 'Squirtle', amount: 100 })
bettingSystem.placeBet({ party: 'Bob', pokemonName: 'Charmander', amount: 150 })
bettingSystem.placeBet({
  party: 'Charlie',
  pokemonName: 'Squirtle',
  amount: 200,
})

// Simulate outcome
bettingSystem.simulateBettingAndOutcome()
