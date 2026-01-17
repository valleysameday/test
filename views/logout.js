export function init() {
  if (!document.getElementById("logoutCSS")) {
    const css = document.createElement("link");
    css.id = "logoutCSS";
    css.rel = "stylesheet";
    css.href = "/views/logout.css";
    document.head.appendChild(css);
  }

  console.log("Logout view loaded");
}
