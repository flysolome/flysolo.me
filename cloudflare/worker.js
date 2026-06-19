const LANGUAGE_COOKIE = "flysolo_lang";
const DUTCH_COUNTRY = "NL";
const DUTCH_PREFIX = "/nl";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
