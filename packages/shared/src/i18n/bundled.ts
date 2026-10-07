// Puts every translation in the app up front instead of downloading it when chosen. The phone app
// uses this: it works offline, and Metro's development server can't serve on-demand files from
// outside apps/mobile. Import it once, before any language is set.
import { addLang } from "./index";
import { es } from "./es";
import { ar } from "./ar";

addLang("es", es);
addLang("ar", ar);
