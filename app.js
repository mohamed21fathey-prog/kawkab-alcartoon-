"use strict";

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "إغلاق القائمة" : "فتح القائمة");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "فتح القائمة");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "فتح القائمة");
      toggle.focus();
    }
  });
}

const ideaForm = document.querySelector("#idea-form");
const result = document.querySelector("#idea-result");
const projectList = document.querySelector("#saved-project-list");
const projectCount = document.querySelector("#project-count");
const projectImport = document.querySelector("#project-import");
const projectFeedback = document.querySelector("#project-feedback");
const projectName = document.querySelector("#project-name");
const projectType = document.querySelector("#project-type");
const projectIdea = document.querySelector("#project-idea");
const submitButton = ideaForm && ideaForm.querySelector('button[type="submit"]');

const speakProjectButton = document.querySelector("#speak-project-idea");
if (speakProjectButton) {
  speakProjectButton.addEventListener("click", () => {
    const idea = projectIdea?.value.trim();
    const name = projectName?.value.trim();
    if (!idea) { showFeedback("اكتب فكرة المشروع أولًا حتى نستطيع قراءتها باللهجة المصرية.", true); return; }
    const ok = speakEgyptian((name ? name + ". " : "") + idea, (message) => showFeedback(message, true));
    if (ok) showFeedback("معاينة باللهجة المصرية عند توفر صوت ar-EG على جهازك؛ هذه ليست ملفًا صوتيًا.", false);
  });
}

const STORAGE_KEY = "kawkab-cartoon-projects-v1";
const MAX_PROJECTS = 30;
const MAX_IMPORT_BYTES = 1024 * 1024;
let projects = [];
let editingProjectId = null;

function showFeedback(message, isError) {
  if (!projectFeedback) return;
  projectFeedback.textContent = message;
  projectFeedback.classList.toggle("is-error", Boolean(isError));
}

function isValidProject(item) {
  return Boolean(
    item && typeof item === "object" &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    item.name.length <= 80 &&
    typeof item.type === "string" && item.type.length <= 60 &&
    typeof item.idea === "string" && item.idea.trim().length > 0 &&
    item.idea.length <= 600
  );
}

function normalizeProject(item) {
  return {
    id: typeof item.id === "string" && item.id.length <= 100
      ? item.id
      : makeId(),
    name: item.name.trim(),
    type: item.type,
    idea: item.idea.trim(),
    updatedAt: item.updatedAt && !Number.isNaN(Date.parse(item.updatedAt))
      ? new Date(item.updatedAt).toISOString()
      : new Date().toISOString(),
    status: "مسودة",
    storyboard: normalizeStoryboard(item.storyboard)
  };
}

function makeId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function readProjects() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter(isValidProject).map(normalizeProject).slice(0, MAX_PROJECTS)
      : [];
  } catch (error) {
    return [];
  }
}

function persistProjects() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    return false;
  }
}

function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (project.name || "kawkab-project")
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim()
    .replace(/\s+/g, "-") + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createStoryboard(project) {
  const idea = project.idea.trim();
  const sentences = idea.split(/[.!?؟؛؛\\n]+/).map((part) => part.trim()).filter(Boolean);
  const premise = sentences.join("، ") || idea;

  if (/مغامرة\\s*في\\s*(أعماق\\s*)?المحيط/.test(project.name)) {
    const oceanScenes = [
      {
        title: "صدمة في قلب المحيط",
        action: "يبدأ المشهد بلقطة قريبة لعمر داخل مركبة غوص صغيرة وهو يهبط لاستكشاف عالم جديد. فجأة يهتز الماء بعنف، وتنطفئ أضواء المركبة للحظة، ثم يظهر وميض أزرق هائل خلف جدار من الشعاب المرجانية ويمر ظل ضخم بسرعة أمام النافذة. يعود الضوء وتظهر على الزجاج خدوش غامضة؛ يدرك عمر أن شيئًا مجهولًا يراقبه.",
        visualPrompt: "Cinematic 3D family adventure animation, 16:9. Inside a compact modern underwater exploration pod, Omar, a curious young boy, descends into the deep blue ocean. A sudden powerful underwater shock shakes the pod, lights flicker, a mysterious enormous shadow rushes past the glass behind glowing coral reefs, and an eerie blue light flashes in the abyss. Omar reacts with wide amazed eyes. Dynamic camera push-in, suspenseful but family-friendly, detailed bubbles and volumetric underwater lighting. Keep Omar's face, hair and outfit consistent in every shot. No text, no logos, no watermark."
      },
      {
        title: "قرار النزول إلى العالم الجديد",
        action: "بعد أن يستعيد عمر هدوءه، يراجع أجهزة الغوص ويقرر مواصلة النزول بدل العودة. يتحدث بحماس عن رغبته في اكتشاف أسرار المحيط، ويشغّل مصابيح المركبة.",
        visualPrompt: "Wide cinematic 3D shot of Omar confidently checking the controls of his small underwater exploration pod and choosing to continue descending into the vast deep ocean. Sun rays fade above, schools of tiny fish pass outside, adventurous family-film mood, consistent character design, no text, no logos, no watermark."
      },
      {
        title: "مدينة الشعاب المرجانية",
        action: "يصل عمر إلى منطقة واسعة من الشعاب المرجانية الملونة، ويرى أسماكًا مضيئة وكائنات بحرية لم يشاهدها من قبل. ينسى خوفه للحظات وينشغل بتسجيل الاكتشافات.",
        visualPrompt: "Breathtaking colorful coral reef city deep underwater, luminous fish, graceful sea turtles and unusual harmless marine creatures surrounding Omar's exploration pod. Wonder-filled cinematic 3D family animation, rich blue and turquoise light, consistent Omar design, no text, no logos, no watermark."
      },
      {
        title: "إشارة الاستغاثة",
        action: "يلتقط جهاز عمر إشارة متقطعة قادمة من شق عميق بين الصخور. تتكرر الإشارة ثلاث مرات، ثم يسمع عمر صوت ارتطام مكتومًا من الأعماق.",
        visualPrompt: "Close-up of a sonar screen glowing with a mysterious repeating signal as Omar listens carefully inside the underwater pod; outside, a narrow dark canyon splits the coral reef. Suspenseful cinematic 3D lighting, readable visual storytelling without on-screen text, consistent character design, no logos, no watermark."
      },
      {
        title: "الطريق المحاصر",
        action: "يتبع عمر الإشارة، لكن تيارًا بحريًا قويًا يدفع المركبة نحو ممر ضيق تسقط منه الصخور الصغيرة. عليه أن يقود بحذر حتى لا تعلق المركبة.",
        visualPrompt: "Dynamic underwater action shot: a strong ocean current pushes Omar's small exploration pod toward a narrow rocky passage as small stones tumble around it. Omar carefully steers between the rocks. Exciting but safe family adventure, cinematic 3D animation, no text, no logos, no watermark."
      },
      {
        title: "صاحب الظل الغامض",
        action: "يظهر الكائن الذي كان يراقب عمر، لكنه ليس وحشًا؛ إنه سلحفاة بحرية ضخمة عالقة بخيط صيد قديم قرب الصخور. يفهم عمر سبب الإشارات ويحاول مساعدتها.",
        visualPrompt: "A majestic large sea turtle appears from the blue darkness, gently struggling with an old discarded fishing line caught near a rocky coral ledge. Omar sees the truth and reacts with empathy. Beautiful expressive cinematic 3D family animation, no injury or frightening imagery, no text, no logos, no watermark."
      },
      {
        title: "إنقاذ السلحفاة",
        action: "يستخدم عمر ذراع المركبة الآلية وأداة آمنة لقطع الخيط العالق دون إيذاء السلحفاة. وبعد محاولات دقيقة تتحرر وتسبح حول المركبة في امتنان.",
        visualPrompt: "Omar carefully uses the safe robotic arm of his underwater pod to free a giant sea turtle from discarded fishing line without harming it. The turtle swims freely around the pod as bubbles rise and soft sunbeams illuminate the scene. Heartwarming cinematic 3D family animation, consistent character design, no text, no logos, no watermark."
      },
      {
        title: "سر جديد في الأعماق",
        action: "قبل أن يعود عمر، تقوده السلحفاة إلى كهف بحري تخرج منه أضواء زرقاء جميلة. يلمح في الداخل ممرًا واسعًا مليئًا بآثار عالم قديم، فيقرر تسجيل الموقع والعودة لاستكشافه في مغامرة قادمة.",
        visualPrompt: "Final wide cinematic 3D shot of Omar's exploration pod following the freed sea turtle toward a mysterious underwater cave glowing with blue bioluminescent light. Ancient natural formations and a vast hidden passage are revealed in the distance. Wonder, discovery and a sequel hook, family-friendly, consistent Omar design, no text, no logos, no watermark."
      }
    ];
    const scenes = oceanScenes.map((scene, index) => ({
      number: index + 1,
      title: scene.title,
      action: scene.action,
      visualPrompt: scene.visualPrompt,
      ...createEgyptianDialogue(scene, index, project),
      durationSeconds: 12
    }));
    return {
      version: 2,
      generatedAt: new Date().toISOString(),
      format: "16:9",
      totalDurationSeconds: 96,
      note: "خطة مشاهد نصية مخصصة لقصة مغامرة في المحيط؛ لا تحتوي على صور مولدة أو حركة أو ملف فيديو.",
      scenes
    };
  }

  const beats = [
    ["الافتتاح والخطاف", "افتح بلحظة مفاجئة تلفت الانتباه وتلمّح إلى التحدي الأساسي."],
    ["التعرّف على البطل والعالم", "عرّف المشاهد بالشخصية الرئيسية والمكان الذي تدور فيه المغامرة."],
    ["اكتشاف الهدف", "اكتشف الهدف أو السر الذي يدفع الشخصية إلى بدء الرحلة."],
    ["ظهور العقبة", "ضع الشخصية أمام أول عائق حقيقي يهدد نجاح المهمة."],
    ["تصاعد الخطر", "اجعل المشكلة أكثر صعوبة وأظهر أثرها على الشخصيات."],
    ["الفكرة والحل", "تعاون الشخصيات أو استخدم فكرة ذكية لبدء حل المشكلة."],
    ["الذروة", "اعرض المواجهة أو اللحظة الحاسمة التي يتوقف عليها نجاح المغامرة."],
    ["النهاية والرسالة", "اختم بنتيجة واضحة ورسالة عائلية لطيفة، ويمكن ترك لمحة لمغامرة جديدة."]
  ];
  const sceneSentences = beats.map((beat, index) => {
    if (!sentences.length) return premise;
    return sentences[Math.min(sentences.length - 1, Math.floor(index * sentences.length / beats.length))];
  });
  const scenes = beats.map((beat, index) => ({
    number: index + 1,
    title: beat[0],
    action: beat[1] + " تفاصيل مرتبطة بالقصة: " + sceneSentences[index],
    visualPrompt: "Cinematic 3D family animation. " + beat[1] + " Story context: " + premise + ". Keep character appearance consistent across shots, expressive faces, clear staging, polished lighting, no text, no logos, no watermark.",
    ...createEgyptianDialogue({ title: beat[0], action: beat[1] + " " + sceneSentences[index] }, index, project),
    durationSeconds: 12
  }));
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    format: "16:9",
    totalDurationSeconds: 96,
    note: "خطة مشاهد نصية محلية قابلة للتعديل؛ لا تحتوي على صور مولدة أو حركة أو ملف فيديو.",
    scenes
  };
}

function createEgyptianDialogue(scene, index, project) {
  const title = String(scene.title || "المغامرة").replace(/[.!؟]+$/g, "").trim();
  const action = String(scene.action || "").replace(/[.!؟]+$/g, "").trim();
  const shortAction = action.length > 230 ? action.slice(0, 227).replace(/\s+\S*$/, "") + "..." : action;
  const openings = ["يا جماعة، ركزوا معايا! ","استنوا بس، إيه اللي بيحصل هنا؟ ","بصوا يا أبطال، ","يا نهار أبيض! ","يلا نشوف هنعمل إيه دلوقتي. ","واضح إن الموضوع محتاج شوية شجاعة. ","الحمد لله، بدأنا نلاقي الحل. ","ودي كانت مغامرة مش هنتنسي بسهولة! "];
  return {
    speaker: /عمر/.test(project.name + " " + project.idea) ? "عمر" : "الراوي",
    dialogue: (openings[index % openings.length] + (shortAction || title)).slice(0, 500)
  };
}

function getEgyptianVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^ar[-_]eg$/i.test(voice.lang)) ||
    voices.find((voice) => /^ar[-_]/i.test(voice.lang)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("ar")) || null;
}

function speakEgyptian(text, onError) {
  if (!text || !("speechSynthesis" in window)) {
    if (onError) onError("ميزة القراءة الصوتية غير متاحة في هذا المتصفح.");
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-EG";
  utterance.rate = 0.94;
  utterance.pitch = 1;
  const voice = getEgyptianVoice();
  if (voice) utterance.voice = voice;
  utterance.onerror = () => { if (onError) onError("تعذرت معاينة الصوت. تحقق من وجود صوت عربي مثبت على جهازك."); };
  window.speechSynthesis.speak(utterance);
  return true;
}

function normalizeStoryboard(storyboard) {
  if (!storyboard) return null;
  const source = Array.isArray(storyboard)
    ? storyboard
    : (Array.isArray(storyboard.scenes) ? storyboard.scenes : []);
  if (!source.length) return null;
  const scenes = source.slice(0, 20).map((scene, index) => ({
    number: index + 1,
    title: String(scene.title || ("المشهد " + (index + 1))).slice(0, 120),
    action: String(scene.action || "").slice(0, 2000),
    visualPrompt: String(scene.visualPrompt || scene.prompt || "").slice(0, 3000),
    speaker: String(scene.speaker || "الراوي").slice(0, 80),
    dialogue: String(scene.dialogue || "").slice(0, 1000),
    durationSeconds: Math.max(1, Math.min(600, Number.parseInt(scene.durationSeconds, 10) || 12))
  }));
  return {
    version: 2,
    generatedAt: storyboard.generatedAt || new Date().toISOString(),
    format: storyboard.format || "16:9",
    totalDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    note: "خطة مشاهد نصية محلية قابلة للتعديل؛ لا تحتوي على صور مولدة أو حركة أو ملف فيديو.",
    scenes
  };
}

function downloadProductionPack(project) {
  const pack = {
    platform: "كوكب الكرتون",
    project: project,
    exportType: "storyboard-production-plan",
    disclaimer: "هذا ملف خطة إنتاج نصية وليس فيديو أو رسومًا متحركة."
  };
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (project.name || "kawkab-production")
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim().replace(/\s+/g, "-") + "-production.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function beginEditing(project) {
  editingProjectId = project.id;
  projectName.value = project.name;
  projectType.value = project.type;
  projectIdea.value = project.idea;
  submitButton.textContent = "حفظ التعديلات";
  showFeedback("أنت تعدّل الآن: " + project.name, false);
  ideaForm.scrollIntoView({ behavior: "smooth", block: "center" });
  projectName.focus();
}

function cancelEditing() {
  editingProjectId = null;
  ideaForm.reset();
  submitButton.textContent = "أنشئ مخطط مشروعي ←";
  showFeedback("تم إلغاء التعديل. لم يتم حذف أي مشروع.", false);
}

function renderProjects() {
  if (!projectList || !projectCount) return;
  projectCount.textContent = projects.length + (projects.length === 1 ? " مشروع" : " مشروعات");
  projectList.replaceChildren();

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-projects";
    empty.textContent = "لا توجد مشاريع محفوظة حتى الآن.";
    projectList.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "saved-project-card";

    const details = document.createElement("div");
    details.className = "saved-project-details";
    const title = document.createElement("strong");
    title.textContent = project.name;
    const meta = document.createElement("span");
    meta.textContent = project.type + " • " + new Date(project.updatedAt).toLocaleDateString("ar-EG");
    details.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "saved-project-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "mini-action";
    editButton.textContent = "فتح وتعديل";
    editButton.addEventListener("click", () => beginEditing(project));

    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "mini-action";
    exportButton.textContent = "تصدير";
    exportButton.addEventListener("click", () => downloadProject(project));

    const storyboardButton = document.createElement("button");
    storyboardButton.type = "button";
    storyboardButton.className = "mini-action storyboard-action";
    storyboardButton.textContent = project.storyboard ? "إعادة إعداد المشاهد" : "إعداد المشاهد";
    storyboardButton.addEventListener("click", () => {
      project.storyboard = createStoryboard(project);
      project.status = "تم تجهيز مخطط المشاهد";
      project.updatedAt = new Date().toISOString();
      if (!persistProjects()) {
        showFeedback("تعذر حفظ مخطط المشاهد على هذا الجهاز.", true);
        return;
      }
      renderProjects();
      showFeedback("تم إعداد 8 مشاهد مرتبطة بملخص القصة وحفظها محليًا. يمكنك تعديلها الآن؛ هذا ليس فيديو متحركًا.", false);
    });

    const exportStoryboardButton = document.createElement("button");
    exportStoryboardButton.type = "button";
    exportStoryboardButton.className = "mini-action";
    exportStoryboardButton.textContent = "تصدير خطة الإنتاج";
    exportStoryboardButton.disabled = !project.storyboard;
    exportStoryboardButton.addEventListener("click", () => {
      if (project.storyboard) downloadProductionPack(project);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "mini-action danger";
    deleteButton.textContent = "حذف";
    deleteButton.addEventListener("click", () => {
      if (!window.confirm("هل تريد حذف مسودة «" + project.name + "» من هذا الجهاز؟")) return;
      const previousProjects = projects;
      projects = projects.filter((item) => item.id !== project.id);
      if (editingProjectId === project.id) cancelEditing();
      if (persistProjects()) {
        renderProjects();
        showFeedback("تم حذف المسودة من هذا الجهاز.", false);
      } else {
        projects = previousProjects;
        showFeedback("تعذر تحديث التخزين المحلي. لم يتم تأكيد الحذف.", true);
      }
    });

    actions.append(storyboardButton, exportStoryboardButton, editButton, exportButton, deleteButton);

    if (project.storyboard && Array.isArray(project.storyboard.scenes)) {
      const scenePanel = document.createElement("details");
      scenePanel.className = "storyboard-panel";
      const summary = document.createElement("summary");
      summary.textContent = "خطة المشاهد (" + project.storyboard.scenes.length + ") — " + project.storyboard.totalDurationSeconds + " ثانية";
      scenePanel.appendChild(summary);

      const fields = [];
      project.storyboard.scenes.forEach((scene, index) => {
        const sceneCard = document.createElement("section");
        sceneCard.className = "storyboard-scene";
        const heading = document.createElement("strong");
        heading.textContent = "المشهد " + (index + 1);
        const titleLabel = document.createElement("label");
        titleLabel.textContent = "عنوان المشهد";
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.maxLength = 120;
        titleInput.value = scene.title;
        titleLabel.appendChild(titleInput);

        const actionLabel = document.createElement("label");
        actionLabel.textContent = "ما يحدث في المشهد";
        const actionInput = document.createElement("textarea");
        actionInput.rows = 3;
        actionInput.maxLength = 2000;
        actionInput.value = scene.action;
        actionLabel.appendChild(actionInput);

        const speakerLabel = document.createElement("label");
        speakerLabel.textContent = "اسم المتحدث";
        const speakerInput = document.createElement("input");
        speakerInput.type = "text";
        speakerInput.maxLength = 80;
        speakerInput.value = scene.speaker || "الراوي";
        speakerLabel.appendChild(speakerInput);

        const dialogueLabel = document.createElement("label");
        dialogueLabel.textContent = "الحوار باللهجة المصرية";
        const dialogueInput = document.createElement("textarea");
        dialogueInput.rows = 3;
        dialogueInput.maxLength = 1000;
        dialogueInput.value = scene.dialogue || "";
        dialogueLabel.appendChild(dialogueInput);

        const listenDialogueButton = document.createElement("button");
        listenDialogueButton.type = "button";
        listenDialogueButton.className = "mini-action";
        listenDialogueButton.textContent = "🔊 استمع للحوار المصري";
        listenDialogueButton.addEventListener("click", () => {
          if (!dialogueInput.value.trim()) { showFeedback("اكتب الحوار أولًا.", true); return; }
          speakEgyptian(dialogueInput.value.trim(), (message) => showFeedback(message, true));
        });

        const visualLabel = document.createElement("label");
        visualLabel.textContent = "الوصف البصري (بالإنجليزية)";
        const visualInput = document.createElement("textarea");
        visualInput.rows = 3;
        visualInput.maxLength = 3000;
        visualInput.value = scene.visualPrompt;
        visualLabel.appendChild(visualInput);

        const durationLabel = document.createElement("label");
        durationLabel.textContent = "المدة بالثواني";
        const durationInput = document.createElement("input");
        durationInput.type = "number";
        durationInput.min = "1";
        durationInput.max = "600";
        durationInput.step = "1";
        durationInput.value = String(scene.durationSeconds);
        durationLabel.appendChild(durationInput);

        sceneCard.append(heading, titleLabel, actionLabel, speakerLabel, dialogueLabel, listenDialogueButton, visualLabel, durationLabel);
        scenePanel.appendChild(sceneCard);
        fields.push({ scene, titleInput, actionInput, speakerInput, dialogueInput, visualInput, durationInput });
      });

      const saveScenesButton = document.createElement("button");
      saveScenesButton.type = "button";
      saveScenesButton.className = "mini-action storyboard-action";
      saveScenesButton.textContent = "حفظ تعديلات المشاهد";
      saveScenesButton.addEventListener("click", () => {
        for (const field of fields) {
          const duration = Number.parseInt(field.durationInput.value, 10);
          if (!field.titleInput.value.trim() || !field.actionInput.value.trim() ||
              !field.visualInput.value.trim() || !Number.isInteger(duration) || duration < 1 || duration > 600) {
            showFeedback("راجع بيانات كل مشهد: العنوان والوصف والمدة من 1 إلى 600 ثانية مطلوبة.", true);
            return;
          }
        }
        fields.forEach((field, index) => {
          field.scene.number = index + 1;
          field.scene.title = field.titleInput.value.trim();
          field.scene.action = field.actionInput.value.trim();
          field.scene.speaker = field.speakerInput.value.trim() || "الراوي";
          field.scene.dialogue = field.dialogueInput.value.trim();
          field.scene.visualPrompt = field.visualInput.value.trim();
          field.scene.durationSeconds = Number.parseInt(field.durationInput.value, 10);
        });
        project.storyboard.totalDurationSeconds = fields.reduce((sum, field) => sum + field.scene.durationSeconds, 0);
        project.updatedAt = new Date().toISOString();
        if (!persistProjects()) {
          showFeedback("تعذر حفظ التعديلات محليًا. حاول تصدير المشروع كنسخة احتياطية.", true);
          return;
        }
        renderProjects();
        showFeedback("تم حفظ تعديلات المشاهد والمدة الإجمالية محليًا.", false);
      });
      scenePanel.appendChild(saveScenesButton);
      card.appendChild(scenePanel);
    }

    card.append(details, actions);
    projectList.appendChild(card);
  });
}


if (ideaForm && result && projectList && projectCount) {
  projects = readProjects();
  persistProjects();
  renderProjects();

  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = projectName.value.trim();
    const type = projectType.value;
    const idea = projectIdea.value.trim();
    if (!name || !idea) return;

    const previous = editingProjectId
      ? projects.find((item) => item.id === editingProjectId)
      : null;

    const project = {
      id: previous ? previous.id : makeId(),
      name,
      type,
      idea,
      updatedAt: new Date().toISOString(),
      status: previous ? previous.status : "مسودة",
      // Keep the user's edited storyboard when only the project brief changes.
      storyboard: previous ? previous.storyboard : null
    };

    const previousProjects = projects;
    projects = [project, ...projects.filter((item) => item.id !== project.id)]
      .slice(0, MAX_PROJECTS);

    if (!persistProjects()) {
      projects = previousProjects;
      showFeedback("لم نتمكن من الحفظ على هذا الجهاز. لم نرسل بياناتك لأي خادم، ولم نفقد النسخة السابقة.", true);
      renderProjects();
      return;
    }

    editingProjectId = null;
    ideaForm.reset();
    submitButton.textContent = "أنشئ مخطط مشروعي ←";

    const heading = document.createElement("h3");
    heading.textContent = previous ? "تم تحديث مشروعك: " + name : "تم حفظ مخطط مشروعك: " + name;
    const summary = document.createElement("p");
    summary.textContent = "نوع المشروع: " + type + " — ملخص الفكرة: " + idea;
    const note = document.createElement("p");
    note.textContent = "المشروع محفوظ محليًا على هذا الجهاز فقط. يمكنك تصديره للاحتفاظ بنسخة احتياطية.";
    result.replaceChildren(heading, summary, note);
    result.hidden = false;
    renderProjects();
    showFeedback("تم الحفظ بنجاح على هذا الجهاز.", false);
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  if (projectImport) {
    projectImport.addEventListener("change", async () => {
      const file = projectImport.files && projectImport.files[0];
      if (!file) return;
      projectImport.value = "";

      if (file.size > MAX_IMPORT_BYTES) {
        showFeedback("الملف أكبر من الحد المسموح (1 ميجابايت).", true);
        return;
      }

      try {
        const parsed = JSON.parse(await file.text());
        // Accept both a plain project export and the production-pack wrapper.
        const incoming = Array.isArray(parsed)
          ? parsed
          : [parsed && parsed.project && typeof parsed.project === "object" ? parsed.project : parsed];
        const valid = incoming.filter(isValidProject).map(normalizeProject);

        if (!valid.length) {
          showFeedback("الملف لا يحتوي على مشروع صالح من كوكب الكرتون.", true);
          return;
        }

        const merged = [...valid, ...projects];
        const unique = [];
        const seen = new Set();
        merged.forEach((item) => {
          const key = item.id || item.name;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });

        projects = unique.slice(0, MAX_PROJECTS);
        if (!persistProjects()) {
          showFeedback("تعذر حفظ المشروع المستورد. قد تكون مساحة المتصفح ممتلئة.", true);
          return;
        }

        renderProjects();
        showFeedback("تم استيراد " + Math.min(valid.length, MAX_PROJECTS) + " مشروع/مشروعات إلى هذا الجهاز.", false);
      } catch (error) {
        showFeedback("تعذر قراءة الملف. تأكد أنه ملف JSON سليم.", true);
      }
    });
  }
}

// Local storyboard planning is a text-only pre-production aid; it does not render video.
