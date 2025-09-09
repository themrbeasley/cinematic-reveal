import { api } from "./api.js";
import { EFFECTS, runEffectPreview } from "./effects.js";

/**
 * Open the reveal dialog for a given document UUID.
 * Renders the audience/effect dialog and wires up event handlers.
 * @param {string} uuid The document UUID to reveal
 */
export async function openRevealDialog(uuid) {
  const doc = await fromUuid(uuid);
  const users = game.users.map(u => ({ id: u.id, name: u.name, checked: !u.isGM }));
  const effects = Object.values(EFFECTS).map(e => ({ id: e.id, label: e.label }));
  const html = await renderTemplate("modules/cinematic-reveal/templates/audience-dialog.html", {
    users,
    effects
  });
  const dlg = new Dialog({
    title: `Reveal: ${doc.name}`,
    content: html,
    buttons: {},
    render: htmlEl => wireDialog(htmlEl, doc)
  });
  dlg.render(true);
}

function wireDialog(html, doc) {
  const $html = $(html);
  const audienceSelect = $html.find("select[name='audience']");
  const selectedBlock = $html.find(".cr-selected");
  audienceSelect.on("change", ev => {
    selectedBlock.toggle($(ev.currentTarget).val() === "selected");
  });
  // preview button
  $html.find(".cr-preview").on("click", async () => {
    const options = readOptions($html);
    runEffectPreview({ doc, options });
  });
  // run button
  $html.find(".cr-run").on("click", async () => {
    const options = readOptions($html);
    const audience = resolveAudienceFromForm($html);
    await api.reveal(doc, { ...options, audience });
    // close dialog
    $(html).closest(".dialog").find(".close").trigger("click");
  });
  // sound toggle rows
  const sourceSel = $html.find("select[name='soundSource']");
  const fileRow = $html.find(".cr-file");
  const plRow = $html.find(".cr-playlist");
  sourceSel.on("change", () => {
    const v = sourceSel.val();
    fileRow.toggle(v === "file");
    plRow.toggle(v === "playlist");
  });
}

function readOptions($html) {
  return {
    effect: $html.find("select[name='effect']").val(),
    duration: Number($html.find("input[name='duration']").val()),
    easing: $html.find("input[name='easing']").val(),
    mode: $html.find("input[name='mode']:checked").val(),
    pin: $html.find("input[name='pin']").is(":checked"),
    duck: $html.find("input[name='duck']").is(":checked"),
    sound: buildSound($html)
  };
}

function resolveAudienceFromForm($html) {
  const mode = $html.find("select[name='audience']").val();
  if (mode === "everyone") return "everyone";
  if (mode === "gm") return "gm";
  const ids = [];
  $html.find("input[name='user']:checked").each((_i, el) => ids.push(el.value));
  return ids;
}

function buildSound($html) {
  const enabled = $html.find("input[name='soundEnabled']").is(":checked");
  if (!enabled) return { enabled: false };
  const source = $html.find("select[name='soundSource']").val();
  const volume = Number($html.find("input[name='volume']").val());
  if (source === "file") {
    return { enabled: true, path: $html.find("input[name='soundPath']").val(), volume };
  }
  if (source === "playlist") {
    return {
      enabled: true,
      playlist: $html.find("select[name='playlist']").val(),
      sound: $html.find("select[name='sound']").val(),
      volume
    };
  }
  return { enabled: false };
}

// Context menu entries for directory documents
Hooks.on("getJournalDirectoryEntryContext", (html, items) => {
  items.push({
    name: "Reveal with Animation…",
    icon: '<i class="fa-solid fa-sparkles"></i>',
    callback: li => openRevealDialog(li.data("documentId"))
  });
});

["Actor","Item","Cards","RollTable","Scene","Journal"].forEach(docType => {
  const hook = `get${docType}DirectoryEntryContext`;
  if (Hooks.events[hook]) {
    Hooks.on(hook, (html, items) => {
      items.push({
        name: "Reveal with Animation…",
        icon: '<i class="fa-solid fa-sparkles"></i>',
        callback: li => openRevealDialog(li.data("documentId"))
      });
    });
  }
});

// Header buttons for sheets
function addHeaderButton(sheet, buttons) {
  buttons.unshift({
    label: "Reveal…",
    class: "cinematic-reveal-btn",
    icon: "fa-solid fa-sparkles",
    onclick: () => openRevealDialog(sheet.document.uuid)
  });
}
Hooks.on("getJournalSheetHeaderButtons", addHeaderButton);
Hooks.on("getActorSheetHeaderButtons", addHeaderButton);
Hooks.on("getItemSheetHeaderButtons", addHeaderButton);

// Hotkey to replay last reveal
Hooks.on("ready", () => {
  game.keybindings.register("cinematic-reveal", "replay-last", {
    name: "Replay last reveal",
    editable: [{ key: "KeyR", modifiers: ["Alt"] }],
    onDown: () => api.replayLast()
  });
});
