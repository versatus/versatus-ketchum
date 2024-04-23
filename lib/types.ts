export type IMoveResponse = {
  move: {
    name: string
    url: string
  }
  version_group_details: Array<{
    level_learned_at: number
    move_learn_method: {
      name: string
      url: string
    }
    version_group: {
      name: string
      url: string
    }
  }>
}

export interface IMove {
  name: string
  pp: string
  power: string
  type: string
}

export interface IEvYield {
  hp: string
  attack: string
  defense: string
  speed: string
  spAtk: string
  spDef: string
}
