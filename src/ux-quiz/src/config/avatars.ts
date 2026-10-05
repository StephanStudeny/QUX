import beaver from "@/assets/3d/avatar-beaver.webp"
import cat from "@/assets/3d/avatar-cat.webp"
import chameleon from "@/assets/3d/avatar-chameleon.webp"
import fox from "@/assets/3d/avatar-fox.webp"
import frog from "@/assets/3d/avatar-frog.webp"
import octopus from "@/assets/3d/avatar-octopus.webp"
import owl from "@/assets/3d/avatar-owl.webp"
import panda from "@/assets/3d/avatar-panda.webp"
import penguin from "@/assets/3d/avatar-penguin.webp"
import raccoon from "@/assets/3d/avatar-raccoon.webp"
import sloth from "@/assets/3d/avatar-sloth.webp"
import squirrel from "@/assets/3d/avatar-squirrel.webp"

/** 12 зверей-дизайнеров (R / Avatar), порядок — как в сетке 4×3 шторки 1.6. */
export const AVATARS = {
  cat,
  owl,
  fox,
  sloth,
  raccoon,
  frog,
  panda,
  penguin,
  octopus,
  squirrel,
  chameleon,
  beaver,
} as const

export type AvatarId = keyof typeof AVATARS
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[]

export const isAvatarId = (v: string | null): v is AvatarId => v !== null && v in AVATARS
