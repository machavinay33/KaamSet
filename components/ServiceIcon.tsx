import { Sparkles, Wrench, Zap, Droplets, Hammer, Snowflake, WashingMachine, Paintbrush, Bug, KeyRound, Sofa, Wind, type LucideIcon } from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, wrench: Wrench, zap: Zap, droplets: Droplets, hammer: Hammer, snowflake: Snowflake,
  'washing-machine': WashingMachine, paintbrush: Paintbrush, bug: Bug, key: KeyRound, sofa: Sofa, wind: Wind,
};
export const ICON_KEYS = Object.keys(ICONS);

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
