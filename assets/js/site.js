document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");

  const closeNavigation = () => {
    navToggle?.setAttribute("aria-expanded", "false");
    navMenu?.classList.remove("is-open");
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(open));
    navMenu?.classList.toggle("is-open", open);
  });
  navMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  document.querySelectorAll("[data-tabs]").forEach((tabsRoot) => {
    const tabs = [...tabsRoot.querySelectorAll('[role="tab"]')];
    const panels = [...tabsRoot.querySelectorAll('[role="tabpanel"]')];

    const selectTab = (nextTab, moveFocus = false) => {
      tabs.forEach((tab) => {
        const selected = tab === nextTab;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== nextTab.dataset.tab;
      });
      if (moveFocus) nextTab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        selectTab(tabs[nextIndex], true);
      });
    });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = document.querySelectorAll(
    ".fs-home-heading, .fs-home-flow, .fs-home-outcomes__grid, .fs-tour, .fs-home-control__points, .fs-home-price__inner, .fs-home-roadmap__grid, .fs-home-final .fs-shell"
  );

  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    revealTargets.forEach((target) => target.classList.add("fs-reveal"));
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  const form = document.querySelector("[data-beta-form]");
  if (!form) return;

  const startedAt = form.querySelector("[data-started-at]");
  const steps = [...form.querySelectorAll("[data-form-step]")];
  const progress = [...document.querySelectorAll("[data-progress]")];
  const success = document.querySelector("[data-form-success]");
  const error = form.querySelector("[data-form-error]");
  const planInterest = form.querySelector("[data-plan-interest]");
  let currentStep = 1;

  if (startedAt) startedAt.value = String(Date.now());

  const showStep = (step) => {
    currentStep = step;
    steps.forEach((item) => {
      const active = Number(item.dataset.formStep) === step;
      item.classList.toggle("is-active", active);
      item.toggleAttribute("hidden", !active);
    });
    progress.forEach((item) => {
      item.classList.toggle("is-active", Number(item.dataset.progress) <= step);
    });
    steps.find((item) => Number(item.dataset.formStep) === step)?.querySelector("legend")?.focus?.();
  };

  const stepIsValid = (step) => {
    const controls = steps
      .find((item) => Number(item.dataset.formStep) === step)
      ?.querySelectorAll("input, select, textarea") || [];
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }
    return true;
  };

  form.querySelector("[data-next-step]")?.addEventListener("click", () => {
    if (stepIsValid(currentStep)) showStep(2);
  });
  form.querySelector("[data-prev-step]")?.addEventListener("click", () => showStep(1));
  form.addEventListener("submit", () => {
    const submit = form.querySelector("[data-submit-button]");
    if (!submit || !form.checkValidity()) return;
    submit.disabled = true;
    submit.textContent = submit.dataset.submittingLabel;
    form.setAttribute("aria-busy", "true");
  });

  const params = new URLSearchParams(window.location.search);
  if (planInterest && ["starter", "professional", "business"].includes(params.get("plan"))) {
    planInterest.value = params.get("plan");
  }
  if (params.get("submitted") === "1" && success) {
    form.hidden = true;
    document.querySelector(".fs-form-progress")?.setAttribute("hidden", "");
    success.hidden = false;
    success.focus();
  } else if (params.get("error") === "1" && error) {
    showStep(2);
    error.hidden = false;
  } else {
    showStep(1);
  }
});
