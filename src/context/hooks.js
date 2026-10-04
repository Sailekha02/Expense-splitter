import { useContext } from "react";
import { UIContext, AuthContext, SettingsContext, DataContext } from "./contexts.js";

const need = (ctx, name) => {
  if (!ctx) throw new Error(`${name} must be used inside its provider`);
  return ctx;
};

export const useUI = () => need(useContext(UIContext), "useUI");
export const useAuth = () => need(useContext(AuthContext), "useAuth");
export const useSettings = () => need(useContext(SettingsContext), "useSettings");
export const useData = () => need(useContext(DataContext), "useData");
