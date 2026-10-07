import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { StoreProvider } from "@/data/store";
import App from "./App";
import { LangProvider } from "@/lib/lang";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
);
