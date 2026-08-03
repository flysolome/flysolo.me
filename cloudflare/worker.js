const LANGUAGE_COOKIE = "flysolo_lang";
const DUTCH_COUNTRY = "NL";
const DUTCH_PREFIX = "/nl";
const BETA_PATH = "/api/beta";
const BETA_ADDRESS = "beta@flysolo.me";
const BETA_SENDER = "website@flysolo.me";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === BETA_PATH) {
      return handleBetaApplication(request, env);
    }

    const explicitLanguage = url.searchParams.get("lang");
    if (explicitLanguage === "en" || explicitLanguage === "nl") {
      url.searchParams.delete("lang");
      const target = explicitLanguage === "nl" ? withDutchPath(url) : withoutDutchPath(url);
      return languageRedirect(target, explicitLanguage);
    }

    if (shouldSkip(url.pathname)) {
      return fetch(request);
    }

    const selectedLanguage = getLanguageCookie(request.headers.get("Cookie"));
    if (selectedLanguage === "nl" && !isDutchPath(url.pathname)) {
      return languageRedirect(withDutchPath(url), "nl");
    }
    if (selectedLanguage === "en" && isDutchPath(url.pathname)) {
      return languageRedirect(withoutDutchPath(url), "en");
    }

    const country = request.headers.get("CF-IPCountry");
    if (!selectedLanguage && country === DUTCH_COUNTRY && isRootPath(url.pathname)) {
      return languageRedirect(withDutchPath(url), "nl", false);
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);
    headers.append("Vary", "CF-IPCountry");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

function getLanguageCookie(cookieHeader) {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${LANGUAGE_COOKIE}=`))
    ?.split("=")[1] || "";
}

function isRootPath(pathname) {
  return pathname === "/" || pathname === "";
}

function isDutchPath(pathname) {
  return pathname === DUTCH_PREFIX || pathname.startsWith(`${DUTCH_PREFIX}/`);
}

function withDutchPath(url) {
  const target = new URL(url);
  if (!isDutchPath(target.pathname)) {
    target.pathname = `${DUTCH_PREFIX}${target.pathname === "/" ? "/" : target.pathname}`;
  }
  return target;
}

function withoutDutchPath(url) {
  const target = new URL(url);
  if (target.pathname === DUTCH_PREFIX) {
    target.pathname = "/";
  } else if (target.pathname.startsWith(`${DUTCH_PREFIX}/`)) {
    target.pathname = target.pathname.slice(DUTCH_PREFIX.length) || "/";
  }
  return target;
}

function languageRedirect(url, language, remember = true) {
  const headers = new Headers({
    Location: url.toString(),
    Vary: "CF-IPCountry",
  });
  if (remember) {
    headers.append(
      "Set-Cookie",
      `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );
  }
  return new Response(null, { status: 302, headers });
}

function shouldSkip(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/css/") ||
    pathname.startsWith("/fonts/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".webmanifest")
  );
}

async function handleBetaApplication(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return betaRedirect("en", "error");
  }

  const language = formValue(form, "language") === "nl" ? "nl" : "en";
  if (formValue(form, "website")) return betaRedirect(language, "submitted");

  const startedAt = Number(formValue(form, "started_at"));
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 1500 || elapsed > 86_400_000) {
    return betaRedirect(language, "error");
  }

  const application = {
    fullName: formValue(form, "full_name"),
    email: formValue(form, "email"),
    phone: formValue(form, "phone"),
    linkedin: formValue(form, "linkedin"),
    businessName: formValue(form, "business_name"),
    businessType: formValue(form, "business_type"),
    specialty: formValue(form, "specialty"),
    country: formValue(form, "country"),
    biggestFriction: formValue(form, "biggest_friction"),
    currentTools: formValue(form, "current_tools"),
    trialGoal: formValue(form, "trial_goal"),
    planInterest: formValue(form, "plan_interest"),
    consent: formValue(form, "consent"),
  };

  if (!isValidApplication(application)) return betaRedirect(language, "error");

  const body = [
    "New FlySolo trial application",
    "",
    `Name: ${application.fullName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone || "Not provided"}`,
    `LinkedIn: ${application.linkedin || "Not provided"}`,
    "",
    `Business: ${application.businessName}`,
    `Business setup: ${application.businessType}`,
    `Specialty: ${application.specialty}`,
    `Country: ${application.country}`,
    `Biggest workflow friction: ${application.biggestFriction}`,
    `Current tools: ${application.currentTools || "Not provided"}`,
    `Plan interest: ${application.planInterest || "Professional"}`,
    "",
    "Trial goal:",
    application.trialGoal,
    "",
    `Preferred language: ${language}`,
    `Submitted: ${new Date().toISOString()}`,
  ].join("\r\n");

  try {
    await env.BETA_EMAIL.send({
      to: BETA_ADDRESS,
      from: { email: BETA_SENDER, name: "FlySolo website" },
      replyTo: application.email,
      subject: "New FlySolo trial application",
      text: body,
    });
    return betaRedirect(language, "submitted");
  } catch {
    return betaRedirect(language, "error");
  }
}

function formValue(form, key) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidApplication(application) {
  const required = [
    application.fullName,
    application.email,
    application.businessName,
    application.businessType,
    application.specialty,
    application.country,
    application.biggestFriction,
    application.trialGoal,
  ];
  if (required.some((value) => !value)) return false;
  if (application.consent !== "yes") return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) return false;
  if (application.fullName.length > 100 || application.email.length > 180) return false;
  if (application.businessName.length > 140 || application.specialty.length > 140) return false;
  if (application.phone.length > 40 || application.linkedin.length > 240) return false;
  if (application.currentTools.length > 240 || application.trialGoal.length > 1200) return false;
  if (!["starter", "professional", "business"].includes(application.planInterest)) return false;
  return !/[\r\n]/.test(application.email);
}

function betaRedirect(language, state) {
  const path = language === "nl" ? "/nl/join/" : "/join/";
  return Response.redirect(`https://flysolo.me${path}?${state}=1`, 303);
}
