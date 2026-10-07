const API = "https://pokeapi.co/api/v2/pokemon/";
const $ = (id) => document.getElementById(id);

const form = $("search-form");
const input = $("pokemon-input");
const ball = $("ball");
const flash = $("flash");
const card = $("card");
const msg = $("msg");
const controls = [...document.querySelectorAll(".quick"), $("search-button"), input];

const TYPE_COLORS = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c",
  ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3",
  psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc",
  dark: "#705746", steel: "#b7b7ce", fairy: "#d685ad",
};
const STATS = [
  ["hp", "HP"], ["attack", "Attack"], ["defense", "Defense"],
  ["special-attack", "Sp. Atk"], ["special-defense", "Sp. Def"], ["speed", "Speed"],
];

let busy = false;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----- views: home / stage (ball) / result ----- */
function show(name) {
  ["home", "stage", "result"].forEach((v) => $(v).classList.toggle("active", v === name));
}

function setBusy(state) {
  busy = state;
  controls.forEach((el) => (el.disabled = state));
}

/* ----- events ----- */
form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value); });

document.querySelectorAll(".quick").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (btn.id === "random") return search(String(Math.ceil(Math.random() * 1025)));
    input.value = btn.textContent;
    search(btn.textContent);
  })
);

$("btn-a").addEventListener("click", () => { if (!busy && $("home").classList.contains("active")) form.requestSubmit(); });
$("btn-b").addEventListener("click", goHome);
$("back").addEventListener("click", goHome);

function goHome() {
  if (busy) return;
  show("home");
  input.focus();
}

/* ----- the main flow ----- */
async function search(raw) {
  if (busy) return;
  const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!name) { msg.textContent = "Type a Pokémon name first."; return; }

  msg.textContent = "";
  setBusy(true);

  // Start loading right away; the throw animation plays while we wait
  const request = fetch(API + name)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  show("stage");
  resetBall();
  await throwBall();
  const pokemon = await request;

  if (!pokemon) {
    await failBall();
    show("home");
    msg.textContent = "It broke free! Check the spelling or your connection.";
  } else {
    await openBall();            // lid pops + white flash
    await fill(pokemon);         // card filled while the screen is white
    show("result");
    revealCard();
  }
  setBusy(false);
}

/* ----- Poké Ball animations (Web Animations API) ----- */
function resetBall() {
  ball.getAnimations().forEach((a) => a.cancel());
  ball.classList.remove("open");
  ball.style.opacity = 0;
}

async function throwBall() {
  const stage = $("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  ball.style.opacity = 1;
  // Arc from the bottom-left corner to the centre, spinning
  await ball.animate([
    { transform: `translate(${-w / 2 - 60}px, ${h / 2}px) rotate(0deg)`, easing: "ease-out" },
    { transform: `translate(${-w / 4}px, ${-h * 0.32}px) rotate(400deg)`, offset: 0.5, easing: "ease-in" },
    { transform: "translate(0, 0) rotate(720deg)" },
  ], { duration: 950, fill: "forwards" }).finished;

  // Little bounce when it lands
  await ball.animate([
    { transform: "translateY(0)" }, { transform: "translateY(-46px)", offset: 0.45, easing: "ease-in" }, { transform: "translateY(0)" },
  ], { duration: 420, easing: "ease-out" }).finished;
}

async function shake(times = 3) {
  const frames = [];
  for (let i = 0; i < times; i++) frames.push({ transform: "rotate(-26deg)" }, { transform: "rotate(26deg)" });
  frames.push({ transform: "rotate(0deg)" });
  await ball.animate(frames, { duration: 380 * times, easing: "ease-in-out" }).finished;
}

async function failBall() {
  await shake(3);
  await ball.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 350, fill: "forwards" }).finished;
}

async function openBall() {
  await shake(1);
  ball.classList.add("open");
  await wait(250);
  await flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 900, easing: "ease-in-out" }).finished.catch(() => {});
}

/* ----- fill + reveal the card ----- */
async function fill(p) {
  const main = p.types[0].type.name;
  card.style.setProperty("--c", TYPE_COLORS[main] || "#ffcb05");

  $("pokemon-name").textContent = p.name.replace(/-/g, " ");
  $("pokemon-number").textContent = "Pokédex #" + String(p.id).padStart(3, "0");
  $("big-id").textContent = "#" + p.id;
  $("pokemon-height").textContent = p.height / 10 + " m";
  $("pokemon-weight").textContent = p.weight / 10 + " kg";

  const img = $("pokemon-image");
  img.alt = p.name;
  img.src = p.sprites.other["official-artwork"].front_default || p.sprites.front_default || "";
  await img.decode().catch(() => {});

  $("pokemon-types").innerHTML = p.types
    .map((t) => `<li style="background:${TYPE_COLORS[t.type.name] || "#ccc"}">${t.type.name}</li>`)
    .join("");
  $("pokemon-abilities").innerHTML = p.abilities
    .map((a) => `<li>${a.ability.name.replace(/-/g, " ")}</li>`)
    .join("");

  $("stats").innerHTML = STATS.map(([key, label]) => {
    const value = p.stats.find((s) => s.stat.name === key).base_stat;
    return `<div class="stat">
      <span class="stat-name">${label}</span>
      <span class="stat-number">${value}</span>
      <div class="bar"><div class="bar-fill" data-w="${(value / 255) * 100}"></div></div>
    </div>`;
  }).join("");
}

function revealCard() {
  // Restart the CSS animations, stagger the info rows, then fill the bars
  card.classList.remove("reveal");
  void card.offsetWidth;
  [...$("info").children].forEach((el, i) => (el.style.animationDelay = 250 + i * 90 + "ms"));
  card.classList.add("reveal");
  setTimeout(() => {
    document.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%"));
  }, 700);
}