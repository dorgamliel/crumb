import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/heebo/index.css";
import "@fontsource-variable/rubik/index.css";
import "./styles.css";
import { loadIndex } from "./lib/content";

const root = createRoot(document.getElementById("root")!);

// The topic index must be in memory before the router and screens read it.
async function start() {
  try {
    await loadIndex();
  } catch {
    root.render(
      <div className="boot-error" role="alert">
        <p className="wordmark" lang="en" dir="ltr">
          crumb
        </p>
        <p>לא הצלחנו לטעון את התוכן. בדקו את החיבור לאינטרנט ונסו שוב.</p>
        <button type="button" className="pill-button" onClick={() => location.reload()}>
          לנסות שוב
        </button>
      </div>,
    );
    return;
  }
  const { App } = await import("./App");
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

start();
