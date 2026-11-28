"use strict";

const input = document.querySelector("#video-files");
const list = document.querySelector("#clip-list");
const summary = document.querySelector("#file-summary");
const preview = document.querySelector("#clip-preview");
const previewCaption = document.querySelector("#preview-caption");
const loadButton = document.querySelector("#load-engine");
const mergeButton = document.querySelector("#merge-videos");
const status = document.querySelector("#editor-status");
const progressWrap = document.querySelector("#progress-wrap");
const progressBar = document.querySelector("#progress-bar");
const progressLabel = document.querySelector("#progress-label");
const mergedPreview = document.querySelector("#merged-preview");
const downloadLink = document.querySelector("#download-merged");

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const clips = [];
let ffmpeg = null;
let engineReady = false;
let busy = false;
let mergedUrl = null;
let selectedId = null;
let lastProgressUpdate = 0;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}
function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " كيلوبايت";
  return (bytes / (1024 * 1024)).toFixed(1) + " ميجابايت";
}
function revokeClip(clip) {
  if (clip.url) URL.revokeObjectURL(clip.url);
}
function updateSummary() {
  const total = clips.reduce((sum, clip) => sum + clip.file.size, 0);
  summary.textContent = clips.length
    ? clips.length + " مقاطع • " + formatBytes(total) + " من 150 ميجابايت"
    : "لم تتم إضافة مقاطع بعد.";
  mergeButton.disabled = !engineReady || clips.length < 2 || busy;
}
function renderClips() {
  list.replaceChildren();
  clips.forEach((clip, index) => {
    const item = document.createElement("li");
    item.className = "clip-item";
    const thumb = document.createElement("video");
    thumb.className = "clip-thumb";
    thumb.src = clip.url;
    thumb.muted = true;
    thumb.preload = "metadata";
    const info = document.createElement("div");
    info.className = "clip-info";
    const name = document.createElement("strong");
    name.textContent = (index + 1) + ". " + clip.file.name;
    const meta = document.createElement("small");
    meta.textContent = formatBytes(clip.file.size) + (Number.isFinite(clip.duration) ? " • " + Math.round(clip.duration) + " ثانية" : "");
    info.append(name, meta);
    const controls = document.createElement("div");
    controls.className = "clip-controls";
    const play = document.createElement("button");
    play.type = "button";
    play.textContent = "معاينة";
    play.addEventListener("click", () => {
      selectedId = clip.id;
      preview.src = clip.url;
      previewCaption.textContent = "معاينة: " + clip.file.name;
      preview.load();
    });
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.setAttribute("aria-label", "تحريك المقطع لأعلى");
    up.disabled = index === 0 || busy;
    up.addEventListener("click", () => moveClip(index, -1));
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.setAttribute("aria-label", "تحريك المقطع لأسفل");
    down.disabled = index === clips.length - 1 || busy;
    down.addEventListener("click", () => moveClip(index, 1));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "حذف";
    remove.className = "remove-clip";
    remove.disabled = busy;
    remove.addEventListener("click", () => removeClip(index));
    controls.append(play, up, down, remove);
    item.append(thumb, info, controls);
    list.appendChild(item);
  });
  updateSummary();
}
function moveClip(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= clips.length || busy) return;
  [clips[index], clips[target]] = [clips[target], clips[index]];
  renderClips();
}
function removeClip(index) {
  if (busy) return;
  const [removed] = clips.splice(index, 1);
  revokeClip(removed);
  if (selectedId === removed.id) {
    selectedId = null;
    preview.removeAttribute("src");
    preview.load();
    previewCaption.textContent = "اختر مقطعًا من القائمة لمعاينته.";
  }
  renderClips();
}
function getDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("تعذر قراءة مدة أحد المقاطع."));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("أحد الملفات ليس فيديو صالحًا أو أن تنسيقه غير مدعوم في هذا المتصفح."));
    };
    video.src = url;
  });
}
input.addEventListener("change", async () => {
  if (busy) return;
  const incoming = Array.from(input.files || []);
  input.value = "";
  if (!incoming.length) return;
  for (const file of incoming) {
    if (clips.length >= MAX_FILES) {
      setStatus("الحد الأقصى خمسة مقاطع في هذه النسخة.", true);
      break;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus("تم تجاهل " + file.name + " لأن حجمه أكبر من 100 ميجابايت.", true);
      continue;
    }
    if (clips.reduce((sum, clip) => sum + clip.file.size, 0) + file.size > MAX_TOTAL_BYTES) {
      setStatus("تم الوصول إلى الحد الإجمالي 150 ميجابايت.", true);
      break;
    }
    try {
      const duration = await getDuration(file);
      const clip = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(), file, url: URL.createObjectURL(file), duration };
      clips.push(clip);
      if (!selectedId) {
        selectedId = clip.id;
        preview.src = clip.url;
        previewCaption.textContent = "معاينة: " + clip.file.name;
      }
      renderClips();
      setStatus("تمت إضافة المقطع: " + file.name);
    } catch (error) {
      setStatus(error.message, true);
    }
  }
  renderClips();
});

async function loadEngine() {
  if (engineReady || busy) return;
  busy = true;
  loadButton.disabled = true;
  loadButton.textContent = "جارٍ تحميل المحرك...";
  setStatus("يتم الآن تحميل مكتبة الدمج وملفاتها لأول مرة. لا تغلق الصفحة.");
  progressWrap.hidden = false;
  progressLabel.textContent = "تحميل محرك الدمج...";
  progressBar.style.width = "4%";
  try {
    const [{ FFmpeg: FFmpegClass }, { toBlobURL }] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"),
      import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js")
    ]);
    ffmpeg = new FFmpegClass();
    ffmpeg.on("progress", ({ progress }) => {
      const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
      progressBar.style.width = percent + "%";
      progressLabel.textContent = "تقدم المعالجة: " + percent + "%";
    });
    ffmpeg.on("log", ({ message }) => {
      const match = message.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (match) {
        const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        const total = clips.reduce((sum, clip) => sum + clip.duration, 0);
        const percent = total ? Math.min(99, Math.round(seconds / total * 100)) : 0;
        progressBar.style.width = percent + "%";
        progressLabel.textContent = "جارٍ الدمج والتصدير: " + percent + "%";
      }
    });
    const coreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(coreBase + "/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL(coreBase + "/ffmpeg-core.wasm", "application/wasm"),
      classWorkerURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js", "text/javascript")
    });
    engineReady = true;
    loadButton.textContent = "تم تحميل محرك الدمج";
    loadButton.disabled = true;
    setStatus("المحرك جاهز. يمكنك الآن دمج المقاطع.");
  } catch (error) {
    loadButton.disabled = false;
    loadButton.textContent = "إعادة محاولة تحميل المحرك";
    setStatus("تعذر تحميل المحرك. تحقق من الاتصال بالإنترنت ثم حاول مجددًا. " + (error.message || ""), true);
  } finally {
    busy = false;
    updateSummary();
  }
}
loadButton.addEventListener("click", loadEngine);

async function hasAudioTrack(filename) {
  const messages = [];
  const handler = ({ message }) => messages.push(message);
  ffmpeg.on("log", handler);
  try {
    await ffmpeg.exec(["-i", filename]);
  } catch (_) {
    // ffmpeg prints stream metadata and exits with a non-zero code because no output was requested.
  } finally {
    ffmpeg.off("log", handler);
  }
  return messages.some((message) => /Stream #\d+:\d+.*Audio:/i.test(message));
}
function safeExtension(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  return ["mp4", "mov", "webm", "mkv"].includes(extension) ? extension : "mp4";
}
async function mergeClips() {
  if (!engineReady || clips.length < 2 || busy) return;
  busy = true;
  mergeButton.disabled = true;
  loadButton.disabled = true;
  downloadLink.hidden = true;
  mergedPreview.hidden = true;
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
  setStatus("جارٍ تجهيز المقاطع. اترك الصفحة مفتوحة حتى ينتهي التصدير.");
  const inputNames = [];
  try {
    const silenceInputs = [];
    const audioIndexes = [];
    for (let index = 0; index < clips.length; index++) {
      const clip = clips[index];
      const extension = safeExtension(clip.file);
      const filename = "input_" + index + "." + extension;
      inputNames.push(filename);
      const bytes = new Uint8Array(await clip.file.arrayBuffer());
      await ffmpeg.writeFile(filename, bytes);
      progressLabel.textContent = "تجهيز المقطع " + (index + 1) + " من " + clips.length;
      const hasAudio = await hasAudioTrack(filename);
      audioIndexes.push(hasAudio ? index : null);
      if (!hasAudio) silenceInputs.push({ clipIndex: index, duration: clip.duration });
    }
    const args = [];
    inputNames.forEach((name) => args.push("-i", name));
    silenceInputs.forEach((entry) => {
      entry.inputIndex = inputNames.length + silenceInputs.indexOf(entry);
      args.push("-f", "lavfi", "-t", String(entry.duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    });
    const silenceByClip = new Map(silenceInputs.map((entry) => [entry.clipIndex, entry.inputIndex]));
    const graph = [];
    clips.forEach((clip, index) => {
      graph.push("[" + index + ":v:0]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v" + index + "]");
      const audioInput = audioIndexes[index] === null ? silenceByClip.get(index) : index;
      graph.push("[" + audioInput + ":a:0]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=" + clip.duration.toFixed(3) + ",asetpts=PTS-STARTPTS[a" + index + "]");
    });
    const concatInputs = clips.map((_, index) => "[v" + index + "][a" + index + "]").join("");
    graph.push(concatInputs + "concat=n=" + clips.length + ":v=1:a=1[outv][outa]");
    args.push("-filter_complex", graph.join(";"), "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "25", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "kawkab-merged.mp4");
    progressLabel.textContent = "جارٍ دمج المقاطع وتصدير MP4...";
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error("لم يكتمل الدمج. قد يكون أحد المقاطع بترميز غير مدعوم.");
    const output = await ffmpeg.readFile("kawkab-merged.mp4");
    const blob = new Blob([output.buffer], { type: "video/mp4" });
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    mergedUrl = URL.createObjectURL(blob);
    mergedPreview.src = mergedUrl;
    mergedPreview.hidden = false;
    downloadLink.href = mergedUrl;
    downloadLink.download = "kawkab-cartoon-merged.mp4";
    downloadLink.hidden = false;
    progressBar.style.width = "100%";
    progressLabel.textContent = "اكتمل التصدير.";
    setStatus("تم دمج " + clips.length + " مقاطع بنجاح. يمكنك معاينة الفيديو وتنزيله.");
  } catch (error) {
    setStatus("تعذر إكمال الدمج: " + (error.message || "خطأ غير معروف") + " — جرّب مقاطع أقصر أو أصغر حجمًا.", true);
    progressLabel.textContent = "لم يكتمل التصدير.";
  } finally {
    for (const name of inputNames) {
      try { await ffmpeg.deleteFile(name); } catch (_) {}
    }
    try { await ffmpeg.deleteFile("kawkab-merged.mp4"); } catch (_) {}
    busy = false;
    loadButton.disabled = engineReady;
    updateSummary();
    renderClips();
  }
}
mergeButton.addEventListener("click", mergeClips);
window.addEventListener("beforeunload", () => {
  clips.forEach(revokeClip);
  if (mergedUrl) URL.revokeObjectURL(mergedUrl);
});
