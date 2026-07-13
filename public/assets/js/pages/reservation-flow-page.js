(function () {
  "use strict";

  const steps = document.querySelectorAll("#stepper .step");
  const panels = document.querySelectorAll(".step-panel");

  function go(step) {
    steps.forEach((item) => {
      const index = Number(item.dataset.step);
      item.classList.toggle("active", index === step);
      item.classList.toggle("done", index < step);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("d-none", Number(panel.dataset.panel) !== step);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll(".next-step").forEach((button) => {
    button.addEventListener("click", () => go(Number(button.dataset.next)));
  });

  document.querySelectorAll(".prev-step").forEach((button) => {
    button.addEventListener("click", () => go(Number(button.dataset.prev)));
  });

  document.querySelectorAll(".chip-grid").forEach((grid) => {
    grid.addEventListener("click", (event) => {
      const chip = event.target.closest(".chip-select");
      if (!chip || chip.classList.contains("disabled")) return;

      [...grid.children].forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  const dateGrid = document.getElementById("dateGrid");
  const today = new Date();
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let index = 1; index <= 14; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    const item = document.createElement("div");
    item.className = `chip-select${index === 1 ? " active" : ""}${date.getDay() === 1 ? " disabled" : ""}`;
    item.innerHTML = `${date.getDate()}<small>${days[date.getDay()]} · ${months[date.getMonth()]}</small>`;
    dateGrid?.appendChild(item);
  }
})();
