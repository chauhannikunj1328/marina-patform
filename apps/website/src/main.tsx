import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { StoreProvider } from "@/data/store";
import { LangProvider, startLang } from "@/lib/lang";
import { startTheme } from "@/lib/theme";
import App from "./App";

startTheme();
// The saved language (if not English) is fetched before the first render.
void startLang().then(() => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
));
