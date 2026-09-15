"use client";

import { createContext } from "react";

/** True on a real gift page, where "make one" becomes "send one back" to whoever sent it. */
export const ReplyModeContext = createContext(false);
