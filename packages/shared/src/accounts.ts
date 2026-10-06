// Prototype sign-in shared by every app. Passwords are stored only as SHA-256 hashes.
// Replace with a real auth provider before launch.
import type { SystemUser } from "./types";
import { today } from "./date";

export const PASSWORD_HASHES: Record<string, string> = {
  "admin@marina.com": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
  "manager@marina.com": "866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5",
  "staff@marina.com": "10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6",
  "chauhan.nikunj1328@gmail.com": "22b1ef6bfcd16329eb678346e6409561d2f3b46e9010a5226e552a4ddf3b1bba",
};

/** Accounts that must always exist, even in data saved before they were added. */
export const BUILT_IN_USERS = (): SystemUser[] => [
  { id: "u-owner", name: "Nikunj Chauhan", email: "chauhan.nikunj1328@gmail.com", role: "admin", marinaIds: [], lastActive: today(), status: "active" },
];

export const SIGN_IN_ERROR = "That email and password don't match. Try again.";
