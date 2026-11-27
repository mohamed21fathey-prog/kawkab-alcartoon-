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
const STORAGE_KEY = "kawkab-cartoon-projects-v1";
let projects = [];

function readProjects() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((item) =>
      item && typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.type === "string" &&
      typeof item.idea === "string"
    ) : [];
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
      if (persistProjects()) renderProjects();
      else window.alert("تعذر تحديث التخزين المحلي. تأكد من وجود مساحة متاحة في المتصفح.");
    });

    actions.append(exportButton, deleteButton);
    card.append(details, actions);
    projectList.appendChild(card);
  });
}

if (ideaForm && result) {
  projects = readProjects();
  renderProjects();

  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const type = document.querySelector("#project-type").value;
    const name = document.querySelector("#project-name").value.trim();
    const idea = document.querySelector("#project-idea").value.trim();

    if (!name || !idea) return;

    const project = {
      id: (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2),
      name,
      type,
      idea,
      updatedAt: new Date().toISOString(),
      status: "مسودة"
    };

    projects = [project, ...projects.filter((item) => item.name !== name)].slice(0, 30);
    if (!persistProjects()) {
      window.alert("لم نتمكن من الحفظ على هذا الجهاز. يمكنك تصدير بيانات المشروع يدويًا بعد إعادة المحاولة.");
      return;
    }

    const heading = document.createElement("h3");
    heading.textContent = "تم حفظ مخطط مشروعك: " + name;

    const summary = document.createElement("p");
    summary.textContent = "نوع المشروع: " + type + " — ملخص الفكرة: " + idea;

    const note = document.createElement("p");
    note.textContent = "المشروع محفوظ محليًا على هذا الجهاز فقط. استخدم زر «تصدير» للاحتفاظ بنسخة خارج المتصفح.";

    result.replaceChildren(heading, summary, note);
    result.hidden = false;
    renderProjects();
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
