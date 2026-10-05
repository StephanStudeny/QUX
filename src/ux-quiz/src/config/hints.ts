import eraser from "@/assets/3d/hint-eraser.webp"
import fifty from "@/assets/3d/hint-fifty.webp"
import skip from "@/assets/3d/hint-skip.webp"
import type { HintType } from "./game"

/** 3D-иконки подсказок (Magnific, design/assets/redesign-v1). */
export const HINT_IMAGES: Record<HintType, string> = { fifty, eraser, skip }
