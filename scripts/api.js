import { openRevealDialog } from "./ui.js";
import { sendRevealToAudience } from "./net.js";
import { EFFECTS, registerEffect } from "./effects.js";

const state = {
  last: null
};

export const api = {
  /**
   * Reveal a document with a cinematic animation.
   * @param {Document|string} docOrUUID The document or UUID to reveal
   * @param {Object} opts Options controlling the reveal
   */
  reveal: async (docOrUUID, opts = {}) => {
    const doc = typeof docOrUUID === "string" ? await fromUuid(docOrUUID) : docOrUUID;
    const options = applyDefaults(opts);
    const payload = await buildPayload(doc, options);
    sendRevealToAudience(payload);
    state.last = { docUUID: doc.uuid, options };
    return true;
  },
  /**
   * Open the audience/effect picker dialog for a given document UUID.
   * @param {Object} args
   */
  openRevealDialog: async ({ uuid }) => openRevealDialog(uuid),

  /**
   * Replay the last reveal using the stored options and document.
   */
  replayLast: async () => {
    if (!state.last) return ui.notifications.info("No previous reveal.");
    const doc = await fromUuid(state.last.docUUID);
    return api.reveal(doc, state.last.options);
  },

  /**
   * Register a new reveal effect implementation.
   * @param {string} name
   * @param {Object} impl
   */
  registerEffect: (name, impl) => registerEffect(name, impl),

  /**
   * Expose the effects registry for convenience.
   */
  EFFECTS
};

/**
 * Apply default settings values to an options object.
 * @param {Object} opts
 */
function applyDefaults(opts) {
  const gs = game.settings;
  return {
    effect: opts.effect ?? gs.get("cinematic-reveal", "defaultEffect"),
    duration: opts.duration ?? gs.get("cinematic-reveal", "defaultDuration"),
    easing: opts.easing ?? gs.get("cinematic-reveal", "defaultEasing"),
    mode: opts.mode ?? gs.get("cinematic-reveal", "defaultMode"),
    pin: opts.pin ?? false,
    sound: opts.sound ?? defaultSoundFromSettings(),
    audience: opts.audience ?? defaultAudienceFromSettings(),
    duck: opts.duck ?? gs.get("cinematic-reveal", "duckAmbient"),
    reduced: gs.get("cinematic-reveal", "respectReduced")
  };
}

/**
 * Build the payload sent over the socket to target clients.
 * Includes a read-only render payload if the user lacks permission.
 * @param {Document} doc The document to reveal
 * @param {Object} options The reveal options
 */
async function buildPayload(doc, options) {
  const canView = doc.testUserPermission(game.user, "OBSERVER");
  let renderPayload = null;
  if (!canView) {
    renderPayload = await docToReadonlyHTML(doc);
  }
  return { docUUID: doc.uuid, options, renderPayload };
}

/**
 * Render a document to a read-only HTML snapshot for clients without permission.
 * @param {Document} doc
 */
async function docToReadonlyHTML(doc) {
  if (doc.documentName === "JournalEntry" || doc.documentName === "JournalEntryPage") {
    const sheetClass = doc.getSheetClass();
    const sheet = await sheetClass.create(doc, { editable: false });
    const html = await sheet._render(true);
    return { html };
  }
  if (doc.documentName === "Actor" || doc.documentName === "Item") {
    const sheet = await doc.sheet;
    const html = await sheet.render(true, { editable: false });
    return { html };
  }
  if (doc.documentName === "Scene" || doc.documentName === "Image") {
    return { src: doc.img ?? doc.prototypeToken?.texture?.src ?? null };
  }
  // Fallback: just include the name
  return { html: `<div class="cr-fallback">${doc.name}</div>` };
}

/**
 * Return the default sound configuration from settings.
 */
function defaultSoundFromSettings() {
  // TODO: implement retrieving default sound from module settings if desired
  return null;
}

/**
 * Return the default audience selection from settings.
 */
function defaultAudienceFromSettings() {
  return game.settings.get("cinematic-reveal", "audienceDefault") ?? "gm";
}
