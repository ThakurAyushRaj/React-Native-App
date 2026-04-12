import { ReactNode } from "react";
import {
    ColorMatrix,
    concatColorMatrices,
    contrast,
    Grayscale,
    saturate,
    Sepia,
} from "react-native-color-matrix-image-filters";

export type FilterPreset = "none" | "grayscale" | "sepia" | "vivid" | "muted";

type FilterWrapperProps = {
  filter: FilterPreset;
  children: ReactNode;
};

export function FilterWrapper({ filter, children }: FilterWrapperProps) {
  if (filter === "grayscale") {
    return <Grayscale>{children}</Grayscale>;
  }

  if (filter === "sepia") {
    return <Sepia>{children}</Sepia>;
  }

  if (filter === "vivid") {
    return (
      <ColorMatrix matrix={concatColorMatrices(saturate(1.35), contrast(1.08))}>
        {children}
      </ColorMatrix>
    );
  }

  if (filter === "muted") {
    return (
      <ColorMatrix matrix={concatColorMatrices(saturate(0.72), contrast(0.95))}>
        {children}
      </ColorMatrix>
    );
  }

  return <>{children}</>;
}
