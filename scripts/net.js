import { EFFECTS } from "./effects.js";

/**
 * Send a reveal payload to the appropriate audience via the module socket.
 * Resolves the audience into user IDs and emits over the socket channel.
 * Also plays the reveal locally if this client is in the target audience.
 *
 * @param {Object} payload The reveal payload built by api.js
 */
export function sendRevealToAudience(payload) {
  const audience = payload.options?.audience ?? payload.audience;
  const targetIds = resolveAudience(audience);
  // Emit the payload along with target IDs
  game.socket.emit("module.cinematic-reveal", { ...payload, targetIds });
  // Play locally if we are among the targets
  if (targetIds.includes(game.user.id)) playReveal(payload);
}

/**
 * Hook into the socket once the game is ready. Listen for incoming
 * reveal messages and run the effect locally if targeted.
 */
Hooks.once("ready", () => {
  game.socket.on("module.cinematic-reveal", async data => {
    if (!data.targetIds?.includes(game.user.id)) return;
    await playReveal(data);
  });
});

/**
 * Resolve an audience descriptor into a list of user IDs.
 * @param {string|Array<string>} audience
 */
function resolveAudience(audience) {
  if (!audience) return [];
  if (audience === "gm") return game.users.filter(u => u.isGM).map(u => u.id);
  if (audience === "everyone") return game.users.map(u => u.id);
  if (Array.isArray(audience)) return audience;
  return [audience];
}

/**
 * Play a reveal on this client by running the specified effect.
 * Looks up the document and uses the effect implementation to animate it.
 * @param {Object} payload
 */
async function playReveal(payload) {
  const { docUUID, options, renderPayload } = payload;
  let doc = null;
  if (docUUID) {
    try {
      doc = await fromUuid(docUUID);
    } catch (e) {
      console.warn("Cinematic Reveal: failed to resolve document UUID", docUUID, e);
    }
  }
  const effectId = options?.effect ?? "simple";
  const impl = EFFECTS[effectId] ?? EFFECTS["simple"];
  if (!impl) return;
  await impl.run({ doc, options, payload: renderPayload });
}
