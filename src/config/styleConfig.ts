export interface StyleConfig {
  id: string;
  name: string;
  multiplier: number;
}

export const DEFAULT_STYLE_CONFIGS: StyleConfig[] = [
  { id: 'trunk', name: 'Trunk', multiplier: 45 },
  { id: 'easy-shorts', name: 'Easy Shorts', multiplier: 32 },
  { id: 'lenin-pant', name: 'Lenin Pant', multiplier: 23 },
  { id: 'ankle-pants', name: 'Ankle Pants', multiplier: 23 },
];

const STORAGE_KEY = 'production_style_configs';

export const loadStyleConfigs = (): StyleConfig[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_STYLE_CONFIGS;

    const parsed = JSON.parse(saved) as StyleConfig[];
    if (!Array.isArray(parsed)) return DEFAULT_STYLE_CONFIGS;

    return parsed.filter(
      (style) =>
        typeof style?.id === 'string' &&
        typeof style?.name === 'string' &&
        style.name.trim().length > 0 &&
        Number.isFinite(Number(style.multiplier)) &&
        Number(style.multiplier) >= 0,
    );
  } catch {
    return DEFAULT_STYLE_CONFIGS;
  }
};

export const saveStyleConfigs = (configs: StyleConfig[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
};

export const getStyleMultiplier = (styleName: string, configs: StyleConfig[]): number => {
  const normalizedName = styleName.trim().toLowerCase();
  const style = configs.find((item) => item.name.trim().toLowerCase() === normalizedName);
  return style ? Number(style.multiplier) : 0;
};
