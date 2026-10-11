"use client"

import { createContext, useContext } from "react"

export const DEFAULT_LOGO = "/landing/logo.webp"
export const ALT_LOGO = "/landing/logo-alt.webp"

export const LogoContext = createContext<string>(DEFAULT_LOGO)

export function useLogoSrc() {
  return useContext(LogoContext)
}
