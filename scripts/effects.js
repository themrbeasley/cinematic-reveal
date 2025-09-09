export const EFFECTS = {};

/**
 * Register a new cinematic reveal effect.
 * Each effect should provide a `run` function and optional `label` and `preview`.
 * @param {string} id Unique effect identifier
 * @param {Object} impl Implementation object
 */
export function registerEffect(id, impl) {
  EFFECTS[id] = {
    id,
    label: impl.label ?? id,
    run: impl.run,
    preview: impl.preview ?? impl.run
  };
}

// Utility: determine if we should reduce motion based on settings or system preference
function shouldReduce(options) {
  if (options.reduced) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Play an optional sound configuration. Supports raw file paths or playlist sounds.
async function playSound(opt) {
  if (!opt?.enabled) return;
  if (opt.path) return AudioHelper.play({ src: opt.path, volume: opt.volume ?? 0.6 }, true);
  if (opt.playlist && opt.sound) {
    const playlist = game.playlists.getName(opt.playlist) ?? game.playlists.get(opt.playlist);
    const sound = playlist?.sounds.getName(opt.sound) ?? playlist?.sounds.get(opt.sound);
    if (sound) return playlist.playSound(sound, { volume: opt.volume ?? 0.6 });
  }
}

// Overlay application for over-scene reveals
class CROverlay extends Application {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "cr-overlay",
    classes: ["cr-overlay"],
    popOut: false,
    template: null
  });
  async _render(force = false, options = {}) {
    await super._render(force, options);
    if (!this.element?.length) {
      this.element = $(`<section class=\"cr-overlay-root\"></section>`).appendTo(document.body);
    }
    return this.element;
  }
}
let overlayApp = null;
async function getOverlayRoot() {
  if (!overlayApp) overlayApp = new CROverlay();
  await overlayApp.render(true);
  return overlayApp.element;
}

// Wrap a sheet element in a container for in-sheet animations
function wrapSheetEl(el) {
  const $el = $(el);
  if ($el.closest(".cr-wrap").length) return $el.closest(".cr-wrap");
  const wrap = $(`<div class=\"cr-wrap\"></div>`);
  $el.wrap(wrap);
  return $el.closest(".cr-wrap");
}

// Retrieve the root element of a sheet for a document
function sheetRootForDoc(doc) {
  const app = doc?._sheet ?? doc?.sheet;
  return app?.element?.[0] ?? null;
}

// Mount document content into a target element. Use a payload if provided.
async function mountDocContent($target, doc, payload) {
  if (payload?.html) {
    $target.html(payload.html);
  } else if (payload?.src) {
    $target.html(`<img src=\"${payload.src}\" alt=\"${doc?.name ?? "image"}\">`);
  } else {
    const sheet = doc?._sheet ?? doc?.sheet ?? await doc.getSheetClass?.create?.(doc);
    if (!sheet?.element?.length) await sheet?.render(true);
    const $el = sheet?.element?.clone(true, true);
    if ($el?.length) $target.append($el);
    else $target.append(`<div>${doc?.name ?? ""}</div>`);
  }
}

// Helper to animate an element via CSS classes and return a promise that resolves when done
function animateCSS(el, { duration = 1.6, easing = "ease", name }) {
  return new Promise(resolve => {
    el.style.setProperty("--cr-duration", `${duration}s`);
    el.style.setProperty("--cr-easing", easing);
    el.classList.add(name);
    const end = () => {
      el.removeEventListener("animationend", end);
      resolve();
    };
    el.addEventListener("animationend", end);
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Run an effect preview locally (no network) for the given document and options.
 */
export function runEffectPreview({ doc, options }) {
  const impl = EFFECTS[options.effect] ?? EFFECTS["simple"];
  return impl.run({ doc, options, payload: null });
}

// ====== Built-in effect implementations ======

// Simple fade/slide effect
registerEffect("simple", {
  label: "Simple Fade/Slide",
  run: async ({ doc, options, payload }) => {
    const reduced = shouldReduce(options);
    if (options.mode === "overlay") {
      const root = await getOverlayRoot();
      const frame = $(`<div class=\"cr-card cr-simple\"><div class=\"cr-content\"></div></div>`);
      root.append(frame);
      await mountDocContent(frame.find(".cr-content"), doc, payload);
      await playSound(options.sound);
      if (!reduced) await animateCSS(frame[0], { duration: options.duration, easing: options.easing, name: "cr-fade-slide-in" });
      if (!options.pin) {
        await sleep(options.duration * 1000 + 200);
        frame.remove();
      }
    } else {
      const rootEl = sheetRootForDoc(doc);
      if (!rootEl) return;
      const wrap = wrapSheetEl(rootEl);
      await playSound(options.sound);
      if (!reduced) await animateCSS(wrap[0], { duration: options.duration, easing: options.easing, name: "cr-fade-slide-in" });
    }
  }
});

// Scroll Unfurl effect
registerEffect("scroll", {
  label: "Scroll Unfurl",
  run: async ({ doc, options, payload }) => {
    const reduced = shouldReduce(options);
    const root = options.mode === "overlay" ? await getOverlayRoot() : $(sheetRootForDoc(doc) ?? document.body);
    const card = $(`<div class=\"cr-card cr-scroll\"><div class=\"cr-scroll-mask\"><div class=\"cr-content\"></div></div></div>`);
    root.append(card);
    await mountDocContent(card.find(".cr-content"), doc, payload);
    await playSound(options.sound);
    if (!reduced) await animateCSS(card[0], { duration: options.duration, easing: options.easing, name: "cr-unfurl" });
    if (options.mode === "overlay" && !options.pin) {
      await sleep(options.duration * 1000 + 200);
      card.remove();
    }
  }
});

// Parchment Tack effect
registerEffect("tack", {
  label: "Parchment Tack",
  run: async ({ doc, options, payload }) => {
    const root = await getOverlayRoot();
    const card = $(`<div class=\"cr-card cr-tack\">
      <div class=\"cr-pin pin-left\"></div>
      <div class=\"cr-pin pin-right\"></div>
      <div class=\"cr-content\"></div>
    </div>`);
    root.append(card);
    await mountDocContent(card.find(".cr-content"), doc, payload);
    await playSound(options.sound);
    await animateCSS(card[0], { duration: options.duration, easing: options.easing, name: "cr-tack-pop" });
    if (!options.pin) {
      await sleep(options.duration * 1000 + 200);
      card.remove();
    }
  }
});

// Card Flip effect
registerEffect("flip", {
  label: "Card Flip",
  run: async ({ doc, options, payload }) => {
    const root = await getOverlayRoot();
    const card = $(`<div class=\"cr-card cr-flip\"><div class=\"cr-content\"></div></div>`);
    root.append(card);
    await mountDocContent(card.find(".cr-content"), doc, payload);
    await playSound(options.sound);
    await animateCSS(card[0], { duration: options.duration, easing: options.easing, name: "cr-yflip" });
    if (!options.pin) {
      await sleep(options.duration * 1000 + 200);
      card.remove();
    }
  }
});

// Spotlight Fade effect
registerEffect("spotlight", {
  label: "Spotlight Fade",
  run: async ({ doc, options, payload }) => {
    const root = await getOverlayRoot();
    const card = $(`<div class=\"cr-card cr-spot\">
      <div class=\"cr-vignette\"></div>
      <div class=\"cr-content\"></div>
    </div>`);
    root.append(card);
    await mountDocContent(card.find(".cr-content"), doc, payload);
    await playSound(options.sound);
    await animateCSS(card[0], { duration: options.duration, easing: options.easing, name: "cr-spot-reveal" });
    if (!options.pin) {
      await sleep(options.duration * 1000 + 200);
      card.remove();
    }
  }
});
