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
    status: "مسودة"
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
  const beats = [
    { title: "الافتتاح والخطاف", action: "ابدأ بلحظة مشوقة تكشف مشكلة أو مفاجأة مرتبطة بفكرة القصة: " + idea, visual: "لقطة سينمائية واسعة للعالم والشخصية الرئيسية، حركة كاميرا بطيئة، إضاءة درامية، من دون كتابة أو شعارات." },
    { title: "بداية المغامرة", action: "تظهر الشخصية الرئيسية وتكتشف أن عليها خوض مغامرة لحل ما بدأ في الافتتاح.", visual: "لقطة متوسطة للشخصية وهي تتحرك داخل البيئة الرئيسية، تعبير وجه واضح وخلفية غنية بالتفاصيل." },
    { title: "العقبة الأولى", action: "تواجه الشخصية عائقًا غير متوقع يجعل المهمة أصعب ويزيد التشويق.", visual: "لقطات قريبة لردود الفعل ثم لقطة حركة توضح العقبة، مع الحفاظ على ثبات تصميم الشخصية." },
    { title: "الحل والشجاعة", action: "تستخدم الشخصية فكرة ذكية أو مساعدة صديق لتجاوز العقبة والتقدم نحو الهدف.", visual: "حركة واضحة ومتتابعة، تفاعل بين الشخصيات، إضاءة أكثر دفئًا وإحساس بالأمل." },
    { title: "النهاية والتمهيد", action: "تصل المغامرة إلى نتيجة مُرضية، مع لمحة أخيرة تفتح الباب لحكاية جديدة.", visual: "لقطة ختامية واسعة، الشخصيات في تكوين واضح، نهاية عاطفية مناسبة لجميع أفراد الأسرة." }
  ];
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    format: "16:9",
    totalDurationSeconds: 100,
    note: "خطة مشاهد نصية محلية؛ لا تحتوي على صور مولدة أو حركة أو ملف فيديو.",
    scenes: beats.map((beat, index) => ({
      number: index + 1,
      title: beat.title,
      action: beat.action,
      visualPrompt: beat.visual + " موضوع القصة: " + idea + "؛ أسلوب رسوم ثلاثية الأبعاد سينمائي عائلي، اتساق بصري للشخصيات، بلا نصوص أو شعارات أو علامات مائية.",
      durationSeconds: 20
    }))
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

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "mini-action danger";
    deleteButton.textContent = "حذف";
    deleteButton.addEventListener("click", () => {
      projects = projects.filter((item) => item.id !== project.id);
      if (editingProjectId === project.id) cancelEditing();
      if (persistProjects()) {
        renderProjects();
        showFeedback("تم حذف المسودة من هذا الجهاز.", false);
      } else {
        showFeedback("تعذر تحديث التخزين المحلي. تأكد من وجود مساحة متاحة.", true);
      }
    });

    const storyboardButton = document.createElement("button");
    storyboardButton.type = "button";
    storyboardButton.className = "mini-action storyboard-action";
    storyboardButton.textContent = project.storyboard ? "تحديث المشاهد" : "إعداد المشاهد";
    storyboardButton.addEventListener("click", () => {
      project.storyboard = createStoryboard(project);
      project.status = "تم تجهيز مخطط المشاهد";
      project.updatedAt = new Date().toISOString();
      if (!persistProjects()) {
        showFeedback("تعذر حفظ مخطط المشاهد على هذا الجهاز.", true);
        return;
      }
      renderProjects();
      showFeedback("تم إعداد 5 مشاهد وحفظها محليًا. هذا مخطط إنتاج وليس فيديو متحركًا.", false);
    });

    const exportStoryboardButton = document.createElement("button");
    exportStoryboardButton.type = "button";
    exportStoryboardButton.className = "mini-action";
    exportStoryboardButton.textContent = "تصدير خطة الإنتاج";
    exportStoryboardButton.disabled = !project.storyboard;
    exportStoryboardButton.addEventListener("click", () => {
      if (project.storyboard) downloadProductionPack(project);
    });

    actions.append(storyboardButton, exportStoryboardButton);
    if (project.storyboard && Array.isArray(project.storyboard.scenes)) {
      const scenePanel = document.createElement("details");
      scenePanel.className = "storyboard-panel";
      const summary = document.createElement("summary");
      summary.textContent = "خطة المشاهد (" + project.storyboard.scenes.length + ")";
      scenePanel.appendChild(summary);
      project.storyboard.scenes.forEach((scene) => {
        const sceneCard = document.createElement("section");
        sceneCard.className = "storyboard-scene";
        const sceneTitle = document.createElement("strong");
        sceneTitle.textContent = scene.number + ". " + scene.title;
        const sceneAction = document.createElement("p");
        sceneAction.textContent = scene.action;
        const sceneVisual = document.createElement("p");
        sceneVisual.textContent = "الوصف البصري: " + scene.visualPrompt;
        const sceneTime = document.createElement("small");
        sceneTime.textContent = "المدة المقترحة: " + scene.durationSeconds + " ثانية";
        sceneCard.append(sceneTitle, sceneAction, sceneVisual, sceneTime);
        scenePanel.appendChild(sceneCard);
      });
      card.appendChild(scenePanel);
    }

    const sb = document.createElement("button"); sb.type="button"; sb.className="mini-action"; sb.textContent="إعداد المشاهد"; sb.addEventListener("click",()=>makeStoryboard(project));
    actions.append(editButton, exportButton, sb, deleteButton);
    card.append(details, actions);
    projectList.appendChild(card);
  });
}


function makeStoryboard(project) {
 const scenes = [
 ["الاستعداد للرحلة","يقف عمر بجوار غواصة صفراء ويرتدي بدلة غوص زرقاء.","عمر: اليوم سأكتشف أسرار أعماق البحار!","Cinematic 3D family animation, young boy Omar in blue diving suit beside a small yellow submarine on ocean surface, no text, 16:9."],
 ["النزول إلى الأعماق","تغوص الغواصة بين أسراب الأسماك ويخفت ضوء الشمس تدريجيًا.","عمر: يا له من عالم رائع!","3D animated yellow mini submarine descending into deep blue ocean, colorful fish and sun rays, no text, 16:9."],
 ["حديقة المرجان","يشاهد عمر الشعاب المرجانية والأسماك الملونة وقناديل البحر المضيئة.","عمر: لم أتخيل أن يكون البحر بهذا الجمال!","Beautiful underwater coral garden, tropical fish and glowing jellyfish, cinematic 3D cartoon, no text, 16:9."],
 ["نداء الاستغاثة","تقترب سلحفاة صغيرة من الغواصة وتطلب المساعدة.","السلحفاة: أرجوك ساعدني في العثور على صديقتي!","Friendly sea turtle asking a young boy in a yellow submarine for help, underwater 3D animation, no text, 16:9."],
 ["السفينة الغارقة","تقود السلحفاة عمر إلى سفينة قديمة تستقر في قاع المحيط.","عمر: سنبحث عنها معًا، لا تقلقي.","Mysterious old shipwreck on ocean floor, sea plants swaying, yellow submarine approaching, 3D cartoon, no text, 16:9."],
 ["حل اللغز","يكتشف عمر شبكة صيد قديمة علقت بها السلحفاة الصغيرة.","عمر: وجدتها! سأحررها بحذر.","Tiny sea turtle caught in abandoned fishing net near shipwreck, careful rescue, cinematic 3D animation, no text, 16:9."],
 ["إنقاذ الصديقة","يحرر عمر السلحفاة وتسبح مع صديقتها حول الغواصة بسعادة.","السلحفاة: شكرًا لك يا عمر!","Two happy sea turtles swimming beside yellow submarine, joyful bubbles and coral, 3D family cartoon, no text, 16:9."],
 ["العودة إلى السطح","تصعد الغواصة ويلوح عمر لأصدقائه ويتذكر أهمية حماية البحر.","عمر: يجب أن نحافظ على البحر وكل كائناته.","Yellow submarine rising toward bright ocean surface, boy waving to sea turtles, uplifting 3D animation, no text, 16:9."]
 ];
 let panel=document.querySelector("#storyboard-panel");
 if(!panel){ panel=document.createElement("section"); panel.id="storyboard-panel"; panel.className="storyboard-panel"; panel.innerHTML='<h3 id="storyboard-title"></h3><p>مخطط نصي فقط؛ لا ينتج صورًا أو أنيميشن أو فيديو.</p><div id="storyboard-scenes"></div><button type="button" id="storyboard-export" class="mini-action">تصدير المشاهد JSON</button>'; result.after(panel); }
 project.storyboard=scenes.map((s,i)=>({number:i+1,title:s[0],action:s[1],dialogue:s[2],prompt:s[3],duration:"8 ثوانٍ"}));
 if(!persistProjects()){showFeedback("تعذر حفظ المشاهد على هذا الجهاز.",true);return;}
 document.querySelector("#storyboard-title").textContent=project.name+" — مخطط المشاهد";
 const list=document.querySelector("#storyboard-scenes"); list.replaceChildren();
 project.storyboard.forEach(s=>{const card=document.createElement("article");card.className="storyboard-scene";const h=document.createElement("h4");h.textContent="المشهد "+s.number+": "+s.title;const a=document.createElement("p");a.textContent="الحركة: "+s.action;const d=document.createElement("p");d.textContent="الحوار: "+s.dialogue;const p=document.createElement("p");p.textContent="الوصف البصري: "+s.prompt;card.append(h,a,d,p);list.append(card);});
 document.querySelector("#storyboard-export").onclick=()=>{const blob=new Blob([JSON.stringify({title:project.name,synopsis:project.idea,scenes:project.storyboard},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="kawkab-storyboard.json";a.click();URL.revokeObjectURL(url);};
 panel.scrollIntoView({behavior:"smooth",block:"start"});
 showFeedback("تم إعداد 8 مشاهد وحفظها. هذا تخطيط نصي وليس توليد فيديو.",false);
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
      status: "مسودة"
    };

    const withoutCurrent = projects.filter((item) =>
      item.id !== project.id && item.name !== project.name
    );
    projects = [project, ...withoutCurrent].slice(0, MAX_PROJECTS);

    if (!persistProjects()) {
      showFeedback("لم نتمكن من الحفظ على هذا الجهاز. لم نرسل بياناتك لأي خادم.", true);
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
        const incoming = Array.isArray(parsed) ? parsed : [parsed];
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
