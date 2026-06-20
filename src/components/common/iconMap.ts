import {
  IconRobot,
  IconMail,
  IconNews,
  IconChartBar,
  IconSearch,
  IconCalendar,
  IconFileText,
  IconBolt,
  IconMessage,
  IconBriefcase,
  IconBulb,
  IconWand,
  IconBrandGoogle,
  IconBrandWindows,
  IconApps,
  type Icon,
} from "@tabler/icons-react";

const ICONS: Record<string, Icon> = {
  IconRobot,
  IconMail,
  IconNews,
  IconChartBar,
  IconSearch,
  IconCalendar,
  IconFileText,
  IconBolt,
  IconMessage,
  IconBriefcase,
  IconBulb,
  IconWand,
};

/** Resolve a stored icon name to a Tabler icon component, with a fallback. */
export function resolveIcon(name: string | undefined): Icon {
  return (name && ICONS[name]) || IconApps;
}

const BRAND_ICONS: Record<string, Icon> = {
  google: IconBrandGoogle,
  microsoft: IconBrandWindows,
};

export function resolveBrandIcon(brand: string | undefined): Icon {
  return (brand && BRAND_ICONS[brand]) || IconApps;
}
