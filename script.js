// ----- 1. Find the parts of the page -----
const form = document.getElementById("search-form");
const input = document.getElementById("pokemon-input");
const quickButtons = document.querySelectorAll(".quick");

const startMessage = document.getElementById("start-message");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const card = document.getElementById("result");

// ----- 2. Hide everything, then show only what we need -----
function hideAll() {
  startMessage.style.display = "none";
  loading.style.display = "none";
  errorBox.style.display = "none";
  card.style.display = "none";
}

function showError(text) {
  hideAll();
  errorBox.textContent = text;
  errorBox.style.display = "block";
}

// ----- 3. When the user searches -----
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading
  searchPokemon(input.value);
});

quickButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    input.value = button.textContent;
    searchPokemon(input.value);
  });
});

// ----- 4. Ask the API for the Pokémon -----
async function searchPokemon(name) {
  name = name.trim().toLowerCase();

  if (name === "") {
    showError("Please type a Pokémon name.");
    return;
  }

  hideAll();
  loading.style.display = "block";

  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + name);

    if (!response.ok) {
      showError("Pokémon not found. Check the spelling and try again.");
      return;
    }

    const pokemon = await response.json();
    showPokemon(pokemon);
  } catch (error) {
    showError("Could not connect. Check your internet and try again.");
  }
}

// ----- 5. Put the Pokémon's data into the card -----
function showPokemon(pokemon) {
  // Name, number and picture
  document.getElementById("pokemon-name").textContent = pokemon.name;
  document.getElementById("pokemon-number").textContent = "Pokedex #" + pokemon.id;
 

  const image = document.getElementById("pokemon-image");
  image.src =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default;
  image.alt = pokemon.name;

  // Height and weight (the API gives them x10, so divide by 10)
  document.getElementById("pokemon-height").textContent = pokemon.height / 10 + " m";
  document.getElementById("pokemon-weight").textContent = pokemon.weight / 10 + " kg";

  // Types: make one <li> for each type
  let types = "";
  pokemon.types.forEach(function (item) {
    types += "<li>" + item.type.name + "</li>";
  });
  document.getElementById("pokemon-types").innerHTML = types;

  // Abilities: make one <li> for each ability
  let abilities = "";
  pokemon.abilities.forEach(function (item) {
    abilities += "<li>" + item.ability.name + "</li>";
  });
  document.getElementById("pokemon-abilities").innerHTML = abilities;

  // Stats: fill the number and the bar for each of the six stats
  pokemon.stats.forEach(function (item) {
    const name = item.stat.name; // "hp", "attack", "special-attack", ...
    const value = item.base_stat;

    document.getElementById("number-" + name).textContent = value;
    document.getElementById("bar-" + name).style.width = (value / 255) * 100 + "%";
  });

  // Show the card
  hideAll();
  card.style.display = "flex";
}