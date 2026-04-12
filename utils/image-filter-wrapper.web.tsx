import { ReactNode } from "react";

export type FilterPreset = "none" | "grayscale" | "sepia" | "vivid" | "muted";

type FilterWrapperProps = {
  filter: FilterPreset;
  children: ReactNode;
};

export function FilterWrapper({ children }: FilterWrapperProps) {
  return <>{children}</>;
}
