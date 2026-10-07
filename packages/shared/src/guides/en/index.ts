import type { GuideBook } from "../types";
import { web } from "./web";
import { site } from "./site";
import { mobile } from "./mobile";

export const en = { ...web, ...site, ...mobile } as GuideBook;
