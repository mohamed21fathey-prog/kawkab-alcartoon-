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

    actions.append(editButton, exportButton, deleteButton);
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
