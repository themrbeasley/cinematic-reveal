import { api } from "./api.js";
import { registerSettings } from "./settings.js";
import "./ui.js";
import "./effects.js";
import "./net.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  const mod = game.modules.get("cinematic-reveal");
  mod.api = api;
  console.log("Cinematic Reveal ready");
});
