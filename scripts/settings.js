export function registerSettings() {
  game.settings.register("cinematic-reveal","defaultEffect", {
    name: "Default Effect", scope: "world", config: true, type: String, default: "scroll",
    choices: { simple:"Simple", scroll:"Scroll Unfurl", tack:"Parchment Tack", flip:"Card Flip", spotlight:"Spotlight Fade" }
  });
  game.settings.register("cinematic-reveal","defaultDuration", {
    name: "Default Duration (s)", scope: "world", config: true, type: Number, default: 1.6, range:{min:0.8,max:2.5,step:0.1}
  });
  game.settings.register("cinematic-reveal","defaultEasing", {
    name: "Default Easing", scope: "world", config: true, type: String, default: "cubic-bezier(0.16,1,0.3,1)"
  });
  game.settings.register("cinematic-reveal","defaultMode", {
    name: "Default Mode", scope: "world", config: true, type: String, default: "overlay",
    choices: { overlay:"Over Scene", "in-sheet":"In-Sheet" }
  });
  game.settings.register("cinematic-reveal","audienceDefault", {
    name: "Default Audience", scope: "world", config: true, type: String, default: "gm",
    choices: { gm:"Only GM", everyone:"Everyone" }
  });
  game.settings.register("cinematic-reveal","duckAmbient", {
    name: "Duck Ambient Audio", scope: "client", config: true, type: Boolean, default: false
  });
  game.settings.register("cinematic-reveal","respectReduced", {
    name: "Respect Reduced Motion", scope: "client", config: true, type: Boolean, default: true
  });
}
