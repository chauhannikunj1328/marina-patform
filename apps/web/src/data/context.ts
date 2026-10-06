import { createContext } from "react";

// Kept in its own module so the context object survives hot reloads of store.tsx during development.
export const StoreContext = createContext<unknown>(null);
