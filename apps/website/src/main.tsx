import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { StoreProvider } from "@/data/store";
import { LangProvider, startLang } from "@/lib/lang";
import { startTheme } from "@/lib/theme";
import App from "./App";

startTheme();
// The page's language (from its address) is fetched before the first render.
void startLang().then(() => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </LangProvider>
  </StrictMode>,
));
