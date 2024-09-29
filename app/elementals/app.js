// Elemental Data
const elementals = {
  Torchy: {
    name: "Torchy",
    health: 70,
    image: "img/torchy.png",
    attacks: [
      { name: "Body Slam", damage: 12, missRate: 1 / 18 },
      { name: "Fire Breath", damage: 20, missRate: 1 / 8 },
      { name: "Annihilate", damage: 24, missRate: 1 / 4 },
      { name: "Flamethrower", damage: 29, missRate: 1 / 2 },
    ],
  },
  Aqualord: {
    name: "Aqualord",
    health: 70,
    image: "img/aqualord.png",
    attacks: [
      { name: "Water Splash", damage: 12, missRate: 1 / 18 },
      { name: "Aqua Jet", damage: 20, missRate: 1 / 8 },
      { name: "Hydro Pump", damage: 24, missRate: 1 / 4 },
      { name: "Tsunami", damage: 29, missRate: 1 / 2 },
    ],
  },
  Sparky: {
    name: "Sparky",
    health: 70,
    image: "img/sparky.png",
    attacks: [
      { name: "Thunder Shock", damage: 12, missRate: 1 / 18 },
      { name: "Electro Ball", damage: 20, missRate: 1 / 8 },
      { name: "Volt Tackle", damage: 24, missRate: 1 / 4 },
      { name: "Lightning Strike", damage: 29, missRate: 1 / 2 },
    ],
  },
};

let playerElemental;
let opponentElemental;
let playerOneHealth;
let playerTwoHealth;

const elementalOptions = document.querySelectorAll(".elemental");
const playerTwoHealthBar = document.querySelector(".p2-health");
const playerTwoHealthCount = document.querySelector(".health-count-p2");
const playerOneHealthBar = document.querySelector(".p1-health");
const playerOneHealthCount = document.querySelector(".health-count-p1");
const gameStateText = document.querySelector(".game-state");
const attackContainer = document.querySelector(".attack-container");
const restartBtn = document.querySelector(".restart-game");
const attackButtons = document.querySelectorAll(".attack-container .attack");
const p1NameElement = document.querySelector(".p1-name");
const p2NameElement = document.querySelector(".p2-name");

// Event listener for elemental selection
elementalOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const selectedElementalName = option.dataset.elemental;
    playerElemental = elementals[selectedElementalName];

    // Choose opponent elemental randomly
    const opponentNames = Object.keys(elementals).filter(
      (name) => name !== selectedElementalName
    );
    const randomOpponentName =
      opponentNames[Math.floor(Math.random() * opponentNames.length)];
    opponentElemental = elementals[randomOpponentName];

    // Initialize the battle
    initBattle();

    // Hide selection screen, show battle screen
    document.querySelector(".selection-screen").style.display = "none";
    document.querySelector(".canvas").style.display = "block";
  });
});

// Initialize Battle Function
function initBattle() {
  // Set Health Values
  playerOneHealth = playerElemental.health;
  playerTwoHealth = opponentElemental.health;

  // Update Player Info
  p1NameElement.textContent = playerElemental.name;
  document.querySelector("#player-one-image").src = playerElemental.image;
  playerOneHealthBar.style.width = "100%";
  playerOneHealthBar.style.backgroundColor = "green";
  playerOneHealthCount.innerText = `${playerOneHealth} / ${playerElemental.health} HP`;

  // Update Opponent Info
  p2NameElement.textContent = opponentElemental.name;
  document.querySelector("#player-two-image").src = opponentElemental.image;
  playerTwoHealthBar.style.width = "100%";
  playerTwoHealthBar.style.backgroundColor = "green";
  playerTwoHealthCount.innerText = `${playerTwoHealth} / ${opponentElemental.health} HP`;

  // Update Attack Buttons
  attackButtons.forEach((button, index) => {
    const attack = playerElemental.attacks[index];
    button.innerText = attack.name;
    button.onclick = () => playerOneAttack(index);
  });

  // Reset Game State
  gameStateText.innerText = "";
  gameStateText.style.display = "none";
  attackContainer.style.display = "grid";
  restartBtn.style.display = "none";
}

// Health Bar Color Function
const healthColor = (playerHealth, maxHealth, playerBar) => {
  const healthPercentage = (playerHealth / maxHealth) * 100;
  if (healthPercentage <= 20) {
    playerBar.style.backgroundColor = "red";
  } else if (healthPercentage <= 40) {
    playerBar.style.backgroundColor = "#cee809";
  } else {
    playerBar.style.backgroundColor = "green";
  }
};

// Update Health Bar Function
function updateHealthBar(barElement, countElement, currentHealth, maxHealth) {
  const healthPercentage = (currentHealth / maxHealth) * 100;
  barElement.style.width = `${healthPercentage}%`;
  countElement.innerText = `${currentHealth} / ${maxHealth} HP`;
}

// Check Winner Function
const checkWinner = (name, playerBar, playerCount) => {
  gameStateText.innerText = `${name} wins! Press restart to play again!`;
  playerBar.style.width = "0%";
  gameStateText.style.display = "block";
  attackContainer.style.display = "none";
  playerCount.innerText = `0 / ${playerElemental.health} HP`;
  restartBtn.style.display = "block";
};

// Player One Attack Function
function playerOneAttack(attackIndex) {
  const attack = playerElemental.attacks[attackIndex];
  const missChance = attack.missRate;
  const randomNumber = Math.random();

  // Trigger player attack animation
  const playerImage = document.querySelector("#player-one-image");
  playerImage.classList.add("player-attack-animation");

  // Remove animation class after animation ends
  playerImage.addEventListener("animationend", () => {
    playerImage.classList.remove("player-attack-animation");
  }, { once: true });

  setTimeout(() => {
    if (randomNumber >= missChance) {
      // Hit
      playerTwoHealth -= attack.damage;
      if (playerTwoHealth <= 0) {
        playerTwoHealth = 0;
        updateHealthBar(
          playerTwoHealthBar,
          playerTwoHealthCount,
          playerTwoHealth,
          opponentElemental.health
        );
        healthColor(playerTwoHealth, opponentElemental.health, playerTwoHealthBar);
        checkWinner(playerElemental.name, playerTwoHealthBar, playerTwoHealthCount);
      } else {
        // Trigger opponent hit animation
        const opponentImage = document.querySelector("#player-two-image");
        opponentImage.classList.add("hit-animation");

        opponentImage.addEventListener("animationend", () => {
          opponentImage.classList.remove("hit-animation");
        }, { once: true });

        updateHealthBar(
          playerTwoHealthBar,
          playerTwoHealthCount,
          playerTwoHealth,
          opponentElemental.health
        );
        healthColor(playerTwoHealth, opponentElemental.health, playerTwoHealthBar);

        gameStateText.innerText = `${playerElemental.name} used ${attack.name}! It dealt ${attack.damage} damage!`;
        attackContainer.style.display = "none";
        gameStateText.style.display = "block";

        setTimeout(() => {
          playerTwoAttack();
        }, 2000);
      }
    } else {
      // Missed
      // Trigger miss animation on opponent
      const opponentImage = document.querySelector("#player-two-image");
      opponentImage.classList.add("miss-animation");

      opponentImage.addEventListener("animationend", () => {
        opponentImage.classList.remove("miss-animation");
      }, { once: true });

      gameStateText.innerText = `${playerElemental.name} used ${attack.name}... But it missed!`;
      attackContainer.style.display = "none";
      gameStateText.style.display = "block";

      setTimeout(() => {
        playerTwoAttack();
      }, 2000);
    }
  }, 500); // Delay to match the attack animation
}


// Player Two Attack Function
function playerTwoAttack() {
  const attacks = opponentElemental.attacks;
  const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
  const missChance = randomAttack.missRate;
  const randomNumber = Math.random();

  // Trigger opponent attack animation
  const opponentImage = document.querySelector("#player-two-image");
  opponentImage.classList.add("opponent-attack-animation");

  opponentImage.addEventListener("animationend", () => {
    opponentImage.classList.remove("opponent-attack-animation");
  }, { once: true });

  setTimeout(() => {
    if (randomNumber >= missChance) {
      // Hit
      playerOneHealth -= randomAttack.damage;
      if (playerOneHealth <= 0) {
        playerOneHealth = 0;
        updateHealthBar(
          playerOneHealthBar,
          playerOneHealthCount,
          playerOneHealth,
          playerElemental.health
        );
        healthColor(playerOneHealth, playerElemental.health, playerOneHealthBar);
        checkWinner(opponentElemental.name, playerOneHealthBar, playerOneHealthCount);
      } else {
        // Trigger player hit animation
        const playerImage = document.querySelector("#player-one-image");
        playerImage.classList.add("hit-animation");

        playerImage.addEventListener("animationend", () => {
          playerImage.classList.remove("hit-animation");
        }, { once: true });

        updateHealthBar(
          playerOneHealthBar,
          playerOneHealthCount,
          playerOneHealth,
          playerElemental.health
        );
        healthColor(playerOneHealth, playerElemental.health, playerOneHealthBar);

        gameStateText.innerText = `${opponentElemental.name} used ${randomAttack.name}! It dealt ${randomAttack.damage} damage!`;

        setTimeout(() => {
          gameStateText.style.display = "none";
          attackContainer.style.display = "grid";
        }, 2000);
      }
    } else {
      // Missed
      // Trigger miss animation on player
      const playerImage = document.querySelector("#player-one-image");
      playerImage.classList.add("miss-animation");

      playerImage.addEventListener("animationend", () => {
        playerImage.classList.remove("miss-animation");
      }, { once: true });

      gameStateText.innerText = `${opponentElemental.name} used ${randomAttack.name}... But it missed!`;

      setTimeout(() => {
        gameStateText.style.display = "none";
        attackContainer.style.display = "grid";
      }, 2000);
    }
  }, 500); // Delay to match the attack animation
}


// Restart Game Function
function restartGame() {
  // Reset to Selection Screen
  document.querySelector(".canvas").style.display = "none";
  document.querySelector(".selection-screen").style.display = "block";

  // Reset Health Bars and Colors
  playerOneHealthBar.style.width = "100%";
  playerTwoHealthBar.style.width = "100%";
  playerOneHealthBar.style.backgroundColor = "green";
  playerTwoHealthBar.style.backgroundColor = "green";
}

// Restart Button Event Listener
restartBtn.addEventListener("click", restartGame);
