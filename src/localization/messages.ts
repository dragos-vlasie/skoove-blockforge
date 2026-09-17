export type LocalizationMessages = {
  mainNavigation: string;
  mobileNavigation: string;
  footerNavigation: string;
  menu: string;
  home: string;
  page: string;
};

const defaultMessages: LocalizationMessages = {
  mainNavigation: "Main navigation",
  mobileNavigation: "Mobile navigation",
  footerNavigation: "Footer navigation",
  menu: "Menu",
  home: "Home",
  page: "Page",
};

export type LocalizationMessageCatalog = Record<string, Partial<LocalizationMessages>>;

export const resolveLocalizationMessages = (
  locale: string,
  catalog: LocalizationMessageCatalog = {},
): LocalizationMessages => {
  const language = locale.split("-")[0]?.toLowerCase() ?? locale.toLowerCase();
  return {
    ...defaultMessages,
    ...(catalog[language] ?? {}),
    ...(catalog[locale] ?? catalog[locale.toLowerCase()] ?? {}),
  };
};
