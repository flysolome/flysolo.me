document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");

  const closeNavigation = (returnFocus = false) => {
    navToggle?.setAttribute("aria-expanded", "false");
    navMenu?.classList.remove("is-open");
    if (returnFocus) navToggle?.focus();
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(open));
    navMenu?.classList.toggle("is-open", open);
  });
  navMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeNavigation()));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
      closeNavigation(true);
    }
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = document.querySelectorAll(
    ".fs-home-heading, .fs-worked-example, .fs-home-price__inner, .fs-home-final .fs-shell"
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

  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      if (window.tarteaucitron?.userInterface) {
        window.tarteaucitron.userInterface.openPanel();
        return;
      }
      window.location.hash = "tarteaucitron";
    });
  });

  const form = document.querySelector("[data-beta-form]");
  if (!form) return;

  const startedAt = form.querySelector("[data-started-at]");
  const steps = [...form.querySelectorAll("[data-form-step]")];
  const progress = [...document.querySelectorAll("[data-progress]")];
  const success = document.querySelector("[data-form-success]");
  const error = document.querySelector("[data-form-error]");
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
      const itemStep = Number(item.dataset.progress);
      item.classList.toggle("is-current", itemStep === step);
      item.classList.toggle("is-complete", itemStep < step);
      if (itemStep === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
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
  form.addEventListener("submit", async (event) => {
    const submit = form.querySelector("[data-submit-button]");
    if (!submit || !form.checkValidity()) return;
    event.preventDefault();
    const submitLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = submit.dataset.submittingLabel;
    form.setAttribute("aria-busy", "true");
    if (error) error.hidden = true;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("application_not_sent");
      form.hidden = true;
      document.querySelector(".fs-form-progress")?.setAttribute("hidden", "");
      if (success) {
        success.hidden = false;
        success.focus();
      }
    } catch {
      submit.disabled = false;
      submit.textContent = submitLabel;
      form.removeAttribute("aria-busy");
      if (error) {
        error.hidden = false;
        error.focus();
      }
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("submitted") === "1" && success) {
    form.hidden = true;
    document.querySelector(".fs-form-progress")?.setAttribute("hidden", "");
    success.hidden = false;
    success.focus();
  } else if (params.get("error") === "1" && error) {
    showStep(1);
    error.hidden = false;
    error.focus();
  } else {
    showStep(1);
  }
});
