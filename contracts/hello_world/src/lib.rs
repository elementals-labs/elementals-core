#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, vec,
    xdr::{FromXdr, ToXdr},
    Address, Bytes, Env, Map, String, Vec, U256,
};

#[contract]
pub struct ElementalsFight;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Games,
    System,
}

#[derive(Clone)]
#[contracttype]
struct Games {
    pub games: Map<U256, GameData>,
}

#[derive(Clone)]
#[contracttype]
struct GameData {
    pub players: (PlayerInfo, PlayerInfo),
    pub turn: u32,
    pub game_status: GameStatus,
}

#[derive(Clone)]
#[contracttype]
enum GameStatus {
    Winner(Address),
    Playing(i32),
    Staled,
}

#[derive(Clone)]
#[contracttype]
struct PlayerInfo {
    addr: Address,
    commits: Vec<Bytes>,
    hands: Vec<Hands>,
}

impl PlayerInfo {
    pub fn commit(&mut self, _env: &Env, commit: Bytes /* XDR */) {
        self.commits.push_back(commit);
    }

    pub fn reveal(&mut self, env: &Env, hand: Hands, hand_plus_nonce: String, turn: u32) {
        let commit = self.commits.get(turn).unwrap().to_xdr(env); // TODO: handle error

        let hash = env.crypto().keccak256(&hand_plus_nonce.to_xdr(env));

        let hash_str = hash.to_xdr(env);

        if hash_str != commit {
            panic!("Invalid commit");
        }

        self.hands.push_back(hand);
    }

    pub fn new(env: &Env, addr: Address) -> Self {
        PlayerInfo {
            addr,
            commits: Vec::new(env),
            hands: Vec::new(env),
        }
    }
}

#[derive(Clone)]
#[contracttype]
struct SystemData {
    pub owner: Address,
    pub last_id: U256,
}

impl SystemData {
    pub fn next_id(&mut self, env: &Env) -> U256 {
        let id = self.last_id.clone();
        self.last_id.add(&U256::from_u32(env, 1));
        id
    }
}

#[contractimpl]
impl ElementalsFight {
    /// Create the system information
    pub fn init(env: Env, owner: Address) {
        let system = SystemData {
            owner,
            last_id: U256::from_u32(&env, 0),
        };
        env.storage().persistent().set(&DataKey::System, &system);

        let m: Map<U256, GameData> = Map::new(&env);
        env.storage().persistent().set(&DataKey::Games, &m);
    }

    /// Create a new game
    pub fn create_new_game(env: Env, player1: Address, player2: Address) -> U256 {
        // Get the owner that can create a new game
        let mut sys: SystemData = env.storage().persistent().get(&DataKey::System).unwrap();
        sys.owner.require_auth();

        // Create the game
        let game: GameData = GameData {
            players: (
                PlayerInfo::new(&env, player1),
                PlayerInfo::new(&env, player2),
            ),
            turn: 0,
            game_status: GameStatus::Playing(0),
        };

        // Get the storage of the games
        let mut games: Map<U256, GameData> =
            env.storage().persistent().get(&DataKey::Games).unwrap();

        // Get the next id
        let id = sys.next_id(&env);
        let res = id.clone();
        // Save the game in the game storage
        games.set(id, game);

        // Save the game storage and the system storage with the new last_id
        env.storage().persistent().set(&DataKey::Games, &games);
        env.storage().persistent().set(&DataKey::System, &sys);

        // Game ID is returned
        res
    }

    pub fn commit(env: Env, game_id: U256, player: Address, commit: Bytes /* XDR */) {
        player.require_auth();

        let mut games: Map<U256, GameData> =
            env.storage().persistent().get(&DataKey::Games).unwrap();

        let mut game = games.get(game_id.clone()).unwrap();

        let player1 = game.clone().players.0.addr;

        if player == player1 {
            game.players.0.commit(&env, commit);
        } else {
            game.players.1.commit(&env, commit);
        }

        games.set(game_id, game);

        env.storage().persistent().set(&DataKey::Games, &games);
    }

    pub fn reveal(env: Env, game_id: U256, player: Address, hand: Hands, hand_plus_nonce: String) {
        player.require_auth();

        let mut games: Map<U256, GameData> =
            env.storage().persistent().get(&DataKey::Games).unwrap();

        let mut game = games.get(game_id.clone()).unwrap();

        let player1 = game.clone().players.0.addr;

        let players = game.players.clone();

        if players.0.commits.len() < game.turn {
            panic!("You need to commit before revealing");
        }

        if players.0.commits.len() != players.1.commits.len() {
            panic!("Both players must commit to reveal");
        }

        if player == player1 {
            game.players
                .0
                .reveal(&env, hand, hand_plus_nonce, game.turn);
        } else {
            game.players
                .1
                .reveal(&env, hand, hand_plus_nonce, game.turn);
        }

        game.turn += 1;

        match game.game_status {
            GameStatus::Playing(points) => {
                game.game_status =
                    GameStatus::Playing(points + Self::solve_play(&game.players, game.turn));
            }
            _ => {}
        }

        games.set(game_id, game);

        env.storage().persistent().set(&DataKey::Games, &games);
    }

    pub fn resolve_game(env: Env, game_id: U256) -> i32 {
        let sys: SystemData = env.storage().persistent().get(&DataKey::System).unwrap();

        sys.owner.require_auth();

        let games: Map<U256, GameData> = env.storage().persistent().get(&DataKey::Games).unwrap();

        let game = games.get(game_id.clone()).unwrap();

        let players = game.players.clone();

        let winner: i32;

        match game.game_status {
            GameStatus::Playing(turn) => {
                winner = turn;
            }
            _ => {
                panic!("Game is already resolved")
            }
        };

        Self::pay_to_winner(&env, winner.signum(), players);

        winner.signum()
    }

    fn pay_to_winner(env: &Env, winner: i32, players: (PlayerInfo, PlayerInfo)) -> Vec<String> {
        let winner_string: String;

        let player_winner = match winner {
            1 => {
                winner_string = String::from_xdr(env, &players.0.addr.to_xdr(env)).unwrap();
                String::from_str(env, "1")
            }
            #[allow(unused_parens)]
            (-1) => {
                winner_string = String::from_xdr(env, &players.1.addr.to_xdr(env)).unwrap();
                String::from_str(env, "2")
            }
            _ => return vec![env, String::from_str(env, "Tie")],
        };

        vec![
            env,
            String::from_str(&env, "Winner: "),
            player_winner,
            String::from_str(&env, "Address: "),
            winner_string,
        ]
    }

    fn solve_play(players: &(PlayerInfo, PlayerInfo), turn: u32) -> i32 {
        let hand1 = players.0.hands.get(turn).unwrap();
        let hand2 = players.1.hands.get(turn).unwrap();

        hand1.fight(&hand2)
    }
}

#[derive(Clone)]
#[contracttype]
pub enum Hands {
    Rock,
    Paper,
    Scissors,
}

impl Hands {
    pub fn fight(&self, other: &Hands) -> i32 {
        match (self, other) {
            (Hands::Rock, Hands::Rock) => 0,
            (Hands::Rock, Hands::Paper) => -1,
            (Hands::Rock, Hands::Scissors) => 1,
            (Hands::Paper, Hands::Rock) => 1,
            (Hands::Paper, Hands::Paper) => 0,
            (Hands::Paper, Hands::Scissors) => -1,
            (Hands::Scissors, Hands::Rock) => -1,
            (Hands::Scissors, Hands::Paper) => 1,
            (Hands::Scissors, Hands::Scissors) => 0,
        }
    }
}

mod test;
