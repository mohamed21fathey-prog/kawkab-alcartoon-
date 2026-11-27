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
      toggle.focus();
    }
  });
}

const ideaForm = document.querySelector("#idea-form");
const result = document.querySelector("#idea-result");

if (ideaForm && result) {
  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const type = document.querySelector("#project-type").value;
    const name = document.querySelector("#project-name").value.trim();
    const idea = document.querySelector("#project-idea").value.trim();

    if (!name || !idea) return;

    const heading = document.createElement("h3");
    heading.textContent = "مخطط مشروعك: " + name;

    const summary = document.createElement("p");
    summary.textContent = "نوع المشروع: " + type + " — ملخص الفكرة: " + idea;

    const listTitle = document.createElement("strong");
    listTitle.textContent = "خطوات مقترحة للتطوير:";

    const list = document.createElement("ul");
    [
      "حدّد الشخصيات أو العناصر الرئيسية.",
      "قسّم الفكرة إلى بداية وحدث رئيسي ونهاية.",
      "اكتب وصفًا بصريًا مستقلًا لكل مشهد.",
      "راجع النص والمشاهد قبل إنتاج النسخة النهائية."
    ].forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    result.replaceChildren(heading, summary, listTitle, list);
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}