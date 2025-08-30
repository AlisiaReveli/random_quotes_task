export const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_TIME) || 60 * 60 * 12
export const normalize = (s: string) => s.trim().toLowerCase()