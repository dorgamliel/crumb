import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/heebo/index.css";
import "@fontsource/frank-ruhl-libre/400.css";
import "@fontsource/frank-ruhl-libre/500.css";
import "@fontsource/frank-ruhl-libre/700.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
