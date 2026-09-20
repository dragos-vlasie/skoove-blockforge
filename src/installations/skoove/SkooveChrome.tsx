import type { ReactNode } from "react";
import { getCategoryPath, getEntryPath, getPublishedEntries } from "../../lib/cms/routing";
import { getContentLocale, getLocaleDirection } from "../../localization/registry";
import { PublicImage } from "../../ui/PublicImage";

export const getSkooveHomePath = (locale: string) => locale === "en" ? "/blog/" : `/blog/${locale.toLowerCase()}/`;

const copy: Record<string, Record<string, string>> = {
  en: { magazine: "Magazine", menu: "Menu", start: "Start Now", premium: "Go Premium", navigation: "Navigation", company: "Company", legal: "Legal", language: "Language", tagline: "Piano lessons that work", login: "Login", signup: "Sign up", home: "Home", faq: "FAQ", changeLanguage: "Change language", follow: "Follow us" },
  de: { magazine: "Magazin", menu: "Menü", start: "Jetzt starten", premium: "Premium", navigation: "Navigation", company: "Unternehmen", legal: "Rechtliches", language: "Sprache", tagline: "Klavierunterricht, der funktioniert", login: "Anmelden", signup: "Registrieren", home: "Startseite", faq: "FAQ", changeLanguage: "Sprache ändern", follow: "Folge uns" },
  fr: { magazine: "Magazine", menu: "Menu", start: "Commencer", premium: "Premium", navigation: "Navigation", company: "Entreprise", legal: "Mentions légales", language: "Langue", tagline: "Des cours de piano qui fonctionnent", login: "Connexion", signup: "S'inscrire", home: "Accueil", faq: "FAQ", changeLanguage: "Changer de langue", follow: "Suivez-nous" },
  es: { magazine: "Revista", menu: "Menú", start: "Empezar", premium: "Premium", navigation: "Navegación", company: "Empresa", legal: "Legal", language: "Idioma", tagline: "Clases de piano que funcionan", login: "Iniciar sesión", signup: "Registrarse", home: "Inicio", faq: "FAQ", changeLanguage: "Cambiar idioma", follow: "Síguenos" },
  ja: { magazine: "マガジン", menu: "メニュー", start: "今すぐ始める", premium: "プレミアム", navigation: "ナビゲーション", company: "会社", legal: "法的情報", language: "言語", tagline: "効果を実感できるピアノレッスン", login: "ログイン", signup: "登録", home: "ホーム", faq: "FAQ", changeLanguage: "言語を変更", follow: "フォロー" },
  ko: { magazine: "매거진", menu: "메뉴", start: "지금 시작", premium: "프리미엄", navigation: "탐색", company: "회사", legal: "법률", language: "언어", tagline: "효과적인 피아노 레슨", login: "로그인", signup: "가입", home: "홈", faq: "FAQ", changeLanguage: "언어 변경", follow: "팔로우" },
  "zh-Hans": { magazine: "钢琴杂志", menu: "菜单", start: "立即开始", premium: "高级版", navigation: "导航", company: "公司", legal: "法律信息", language: "语言", tagline: "真正有效的钢琴课程", login: "登录", signup: "注册", home: "首页", faq: "常见问题", changeLanguage: "更改语言", follow: "关注我们" },
  "zh-Hant": { magazine: "鋼琴雜誌", menu: "選單", start: "立即開始", premium: "進階版", navigation: "導覽", company: "公司", legal: "法律資訊", language: "語言", tagline: "真正有效的鋼琴課程", login: "登入", signup: "註冊", home: "首頁", faq: "常見問題", changeLanguage: "更改語言", follow: "關注我們" },
};

const trialCopy: Record<string, { title: string; note?: string; body: string; button: string; features: string[] }> = {
  en: { title: "Start a 7 day trial", note: "no credit card required", body: "From classical to pop, choose from 1000+ interactive lessons!", button: "Start my free trial", features: ["Personalized feedback", "Expert teachers", "Added motivation", "Technique"] },
  de: { title: "Bereit Klavier zu spielen?", body: "Von Klassik bis Pop – wähle aus über 1000 interaktiven Lektionen!", button: "Jetzt starten", features: ["Klassisch", "Hits", "Improvisation", "Technik"] },
  fr: { title: "Prêt(e) à jouer du piano ?", body: "Du classique à la pop, choisissez parmi plus de 1000 leçons interactives !", button: "Commencer l’essai gratuit", features: ["Classique", "Hits", "Improvisation", "Technique"] },
  es: { title: "¿Listo para tocar el piano?", body: "Desde música clásica hasta pop, elige entre más de 1000 lecciones interactivas.", button: "Comienza tu prueba gratis", features: ["Clásica", "Éxitos", "Improvisación", "Técnica"] },
  ja: { title: "ピアノを弾く準備はできましたか？", body: "クラシックからポップまで、1,000以上のインタラクティブなレッスン。", button: "無料トライアルを始める", features: ["クラシック", "ヒット曲", "即興演奏", "テクニック"] },
  ko: { title: "피아노를 연주할 준비가 되셨나요?", body: "클래식부터 팝까지 1,000개 이상의 인터랙티브 레슨을 만나보세요.", button: "무료 체험 시작", features: ["클래식", "히트", "즉흥 연주", "테크닉"] },
  "zh-Hans": { title: "准备好弹钢琴了吗？", body: "从古典到流行，探索 1000 多节互动课程。", button: "开启免费试用", features: ["经典", "流行", "即兴创作", "技巧"] },
  "zh-Hant": { title: "準備好彈鋼琴了嗎？", body: "從古典到流行，探索 1000 多堂互動課程。", button: "開啟免費試用", features: ["經典", "流行", "即興創作", "技巧"] },
};

const ignoredCategorySlugs = new Set([
  "geen-categorie",
  "non-classifiee",
  "sin-categorizar",
  "unkategorisiert",
  "uncategorized",
  "outbrain",
  "skoove",
]);

const englishCategoryOrder = [
  "piano-fundamentals",
  "piano-tips-tricks",
  "music-theory",
  "cat-best-piano-songs",
  "piano-technique",
];

const englishMenuChildren: Record<string, Array<[string, string]>> = {
  "piano-fundamentals": [["piano-chords", "Piano chords"], ["how-to-remember-piano-notes", "Piano notes"], ["piano-keys", "Piano keys"], ["how-to-play-piano", "How to play piano"], ["piano-scales", "Piano scales"]],
  "piano-tips-tricks": [["best-piano-apps", "Best piano apps"], ["digital-piano-vs-keyboard", "Digital piano vs keyboard"], ["how-to-label-piano-keys", "Labeling piano keys"], ["history-of-the-piano", "History of the piano"], ["piano-music-theory", "Piano and music theory"]],
  "music-theory": [["time-signatures-explained", "Time signatures"], ["bass-clef-notes-on-piano", "Bass clef"], ["what-are-quarter-half-and-whole-notes", "Quarter, half & whole notes"], ["treble-clef-notes", "Treble clef"], ["musical-modes", "Musical modes"]],
  "cat-best-piano-songs": [["best-piano-rock-songs", "Rock songs on piano"], ["best-classical-piano-songs", "Classical songs on piano"], ["best-piano-pop-songs", "Pop songs on piano"], ["best-piano-love-songs", "Love songs on piano"], ["best-piano-bar-songs", "Bar songs on piano"]],
  "piano-technique": [["chord-progressions-on-piano", "Chord progressions"], ["piano-exercises-for-your-hands", "Piano finger positions"], ["piano-exercises-for-your-hands", "Piano hand exercises"], ["jazz-chords-piano", "Jazz chords"], ["running-and-jumping-scales-and-arpeggios", "Scales and arpeggios"]],
};

const trialImages = [
  "https://www.skoove.com/blog/wp-content/uploads/2024/09/optimized/Hits-240.webp",
  "https://www.skoove.com/blog/wp-content/uploads/2024/09/optimized/Hits-1-240.webp",
  "https://www.skoove.com/blog/wp-content/uploads/2024/09/optimized/Hits-2-240.webp",
  "https://www.skoove.com/blog/wp-content/uploads/2024/09/optimized/Hits-3-240.webp",
];

const englishCategoryLabels: Record<string, string> = {
  "piano-fundamentals": "Piano fundamentals",
  "piano-tips-tricks": "Piano tips & tricks",
  "music-theory": "Music theory",
  "cat-best-piano-songs": "Piano songs",
  "piano-technique": "Piano technique",
};

const categoryLabel = (category: any) =>
  englishCategoryLabels[category.slug]
  ?? String(category.name || "").replace(/^Cat\s+/i, "").replace(/\s+/g, " ");

const categoryRank = (category: any) => {
  const exact = englishCategoryOrder.indexOf(category.slug);
  if (exact >= 0) return exact;
  const name = String(category.name || "").toLowerCase();
  if (name.includes("fundament") || name.includes("grundlagen")) return 0;
  if (name.includes("tip") || name.includes("astuce") || name.includes("trick")) return 1;
  if (name.includes("theor") || name.includes("teor")) return 2;
  if (name.includes("song") || name.includes("chanson") || name.includes("cancion")) return 3;
  if (name.includes("tech") || name.includes("tecn")) return 4;
  return 20;
};

const trialHref = (locale: string) => {
  const localePath = locale === "en" ? "" : `/${locale === "zh-Hans" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale}`;
  return `https://www.skoove.com${localePath}/auth/register_promotion?coupon=7d-blog-npd&utm_source=blog&utm_medium=atf&utm_campaign=7d-blog-npd`;
};

const menuChildren = (category: any, graph: any, locale: string) => {
  if (locale === "en" && englishMenuChildren[category.slug]) {
    return englishMenuChildren[category.slug].map(([slug, label]) => {
      const entry = graph.entries.find((candidate: any) => candidate.slug === slug && getContentLocale(candidate, graph.site) === locale);
      const owner = entry ? graph.collectionDefinitions.find((definition: any) => definition.id === entry.collectionId) : null;
      return { label, href: entry && owner ? getEntryPath(entry, owner, graph) : `/blog/${slug}/` };
    });
  }

  return getPublishedEntries(graph, locale)
    .filter((entry: any) => entry.categoryIds?.includes(category.id))
    .slice(0, 5)
    .map((entry: any) => {
      const owner = graph.collectionDefinitions.find((definition: any) => definition.id === entry.collectionId);
      return { label: entry.title, href: getEntryPath(entry, owner, graph) };
    });
};

function BrandLogo({ graph }: { graph: any }) {
  return graph.site.logo
    ? <img className="h-auto w-[9.5rem] object-contain" src={graph.site.logo} alt="Skoove" width="180" height="54" />
    : <span className="text-3xl font-black tracking-tight">Skoove</span>;
}

function TrialBanner({ locale }: { locale: string }) {
  const labels = trialCopy[locale] ?? trialCopy.en;
  return <aside className="relative overflow-hidden border-b border-[#00524f]/10 bg-[linear-gradient(115deg,#e4ffee_0%,#f1fff6_52%,#d5f9e7_100%)] text-[#103133]" aria-label={labels.title}>
    <span className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border-[3rem] border-white/30" aria-hidden="true" />
    <span className="pointer-events-none absolute -bottom-24 left-[18%] size-48 rounded-full bg-[#2ec39f]/10 blur-2xl" aria-hidden="true" />
    <div className="relative mx-auto grid w-full max-w-[80rem] items-center gap-6 px-5 py-7 sm:px-8 lg:min-h-[18rem] lg:grid-cols-[minmax(12.5rem,0.85fr)_minmax(0,2.25fr)_minmax(13rem,0.85fr)] lg:gap-7 lg:py-6 xl:grid-cols-[minmax(14.5rem,0.9fr)_minmax(0,2.35fr)_minmax(17rem,0.9fr)] xl:gap-8">
      <div className="max-w-xl self-center lg:max-w-[16rem]">
        <p className="mb-3 mt-0 text-xs font-black uppercase tracking-[0.18em] text-[#008f79]">Skoove</p>
        <h2 className="m-0 text-[clamp(1.85rem,3vw,2.35rem)] font-black leading-[1.04] tracking-[-0.025em]">{labels.title}</h2>
        <p className="mb-0 mt-4 max-w-lg text-base leading-[1.35] text-[#315d5c] lg:max-w-[15rem]">{labels.body}</p>
        {labels.note && <p className="mb-0 mt-4 inline-flex items-center gap-2 rounded-full border border-[#00524f]/10 bg-white/65 px-3 py-2 text-sm font-bold text-[#00524f] shadow-sm"><span className="grid size-5 place-items-center rounded-full bg-[#2ec39f] text-xs text-white" aria-hidden="true">✓</span>{labels.note}</p>}
      </div>
      <div className="hidden grid-cols-4 gap-3 sm:grid lg:gap-2 xl:gap-4">
        {labels.features.map((feature, index) => <div className="group grid min-w-0 content-start justify-items-center gap-3 rounded-[1.25rem] border border-white/70 bg-white/40 px-2 pb-4 pt-3 text-center shadow-[0_10px_30px_rgba(0,82,79,0.06)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/65 hover:shadow-[0_16px_34px_rgba(0,82,79,0.12)]" key={feature}>
          <PublicImage className="h-auto w-full max-w-[7.5rem] transition duration-300 group-hover:scale-[1.03] xl:max-w-[8.5rem]" src={trialImages[index]} alt="" width={240} height={240} sizes="(max-width: 1279px) 112px, 136px" loading="lazy" />
          <span className="max-w-[9rem] text-sm font-black leading-[1.2] xl:text-[0.95rem]">{feature}</span>
        </div>)}
      </div>
      <a className="group inline-flex min-h-[5.25rem] w-full max-w-sm items-center justify-between gap-4 justify-self-start rounded-[1.15rem] bg-[#e97c43] px-5 text-left text-white no-underline shadow-[0_14px_30px_rgba(185,76,28,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d86b34] hover:shadow-[0_18px_34px_rgba(185,76,28,0.28)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#00524f] lg:max-w-none lg:justify-self-stretch" href={trialHref(locale)}>
        <span className="text-lg font-black leading-tight xl:whitespace-nowrap xl:text-xl">{labels.button}</span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-xl text-[#d86b34] transition group-hover:translate-x-1" aria-hidden="true">→</span>
      </a>
    </div>
  </aside>;
}

export function SkooveChrome({ graph, subject, children }: { graph: any; subject: any; children: ReactNode }) {
  const locale = getContentLocale(subject, graph.site);
  const labels = copy[locale] ?? copy.en;
  const homePath = getSkooveHomePath(locale);
  const categories = graph.categories
    .filter((category: any) => category.publicIndex && getContentLocale(category, graph.site) === locale && !ignoredCategorySlugs.has(category.slug))
    .sort((a: any, b: any) => categoryRank(a) - categoryRank(b) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 5);
  const locales = (graph.site.locales ?? []).filter((item: any) => item.enabled !== false);
  const isArticle = Boolean(subject.collectionId);

  return <div className="min-h-screen bg-white font-[var(--font-body)] text-[#103133]" data-site-theme="skoove-magazine" lang={locale} dir={getLocaleDirection(graph.site, locale)}>
    <header className="relative z-50 bg-[#00524f] text-white">
      <div className="mx-auto flex min-h-[5.5rem] w-full max-w-[80rem] items-center justify-between gap-5 px-5 sm:px-8">
        <details className="group relative z-[70] min-w-[8rem]">
          <summary className="relative z-[72] flex min-h-11 w-fit cursor-pointer list-none items-center gap-3 text-sm font-bold marker:hidden group-open:fixed group-open:left-7 group-open:top-6 [&::-webkit-details-marker]:hidden">
            <span className="relative block size-7" aria-hidden="true"><i className="absolute left-0 top-[0.3rem] h-0.5 w-7 bg-white transition group-open:top-3 group-open:rotate-45" /><i className="absolute left-0 top-3 h-0.5 w-7 bg-white transition group-open:opacity-0" /><i className="absolute left-0 top-[1.2rem] h-0.5 w-7 bg-white transition group-open:top-3 group-open:-rotate-45" /></span>
            <span>{labels.menu}</span>
          </summary>
          <div className="pointer-events-none fixed inset-0 z-[60] hidden bg-black/30 group-open:block" />
          <nav className="fixed inset-y-0 left-0 z-[61] hidden w-[min(22rem,88vw)] flex-col overflow-y-auto bg-[#00524f] px-8 pb-10 pt-28 shadow-2xl group-open:flex" aria-label={labels.menu}>
            <div className="grid gap-1 text-lg">
              <a className="px-2 py-3 font-bold text-[#2ec39f] no-underline" href={`https://www.skoove.com/${locale === "en" ? "" : locale.toLowerCase()}`}>{labels.login}</a>
              <a className="px-2 py-3 font-bold text-[#2ec39f] no-underline" href={trialHref(locale)}>{labels.signup}</a>
              <a className="mt-5 px-2 py-3 font-bold text-[#2ec39f] no-underline" href="https://www.skoove.com/">{labels.home}</a>
              <a className="px-2 py-3 font-bold text-[#2ec39f] no-underline" href={homePath}>{labels.magazine}</a>
              <a className="px-2 py-3 font-bold text-[#2ec39f] no-underline" href="https://help.skoove.com/">{labels.faq}</a>
            </div>
            <div className="mt-5 border-t border-white/15 pt-5">
              <p className="m-0 text-base font-black">{labels.changeLanguage}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">{locales.map((item: any) => <a className="py-1 text-sm text-[#2ec39f] no-underline" href={getSkooveHomePath(item.code)} key={item.code} hrefLang={item.hreflang || item.code}>{item.label}</a>)}</div>
            </div>
            <div className="mt-7 border-t border-white/15 pt-5"><p className="m-0 text-base font-black">{labels.follow}</p><div className="mt-4 flex flex-wrap gap-3 text-sm font-black text-[#2ec39f]"><a className="text-inherit no-underline" href="https://www.facebook.com/SkoovePiano">Facebook</a><a className="text-inherit no-underline" href="https://www.instagram.com/skoove_piano/">Instagram</a><a className="text-inherit no-underline" href="https://www.linkedin.com/company/skoove/">LinkedIn</a><a className="text-inherit no-underline" href="https://www.youtube.com/@SkoovePiano">YouTube</a></div></div>
          </nav>
        </details>
        <a className="shrink-0 text-white no-underline" href={homePath} aria-label={`Skoove ${labels.magazine}`}><BrandLogo graph={graph} /></a>
        <div className="flex min-w-[8rem] items-center justify-end gap-2 sm:min-w-[16rem]">
          <a className="hidden min-h-10 items-center justify-center border border-white px-4 text-sm font-black text-white no-underline transition hover:bg-white hover:text-[#00524f] sm:inline-flex" href="https://www.skoove.com/register">{labels.start}</a>
          <a className="inline-flex min-h-10 items-center justify-center bg-[#2ec39f] px-4 text-sm font-black text-[#103133] no-underline transition hover:bg-white" href="https://www.skoove.com/account">{labels.premium}</a>
        </div>
      </div>
      <nav className="hidden border-t border-[#2ec39f] lg:block" aria-label={labels.navigation}>
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[80rem] items-stretch justify-center px-8">
          <a className="inline-flex items-center px-6 text-base font-bold text-[#2ec39f] no-underline hover:text-white" href={homePath}>{labels.magazine}</a>
          {categories.map((category: any) => {
            const active = subject.id === category.id || subject.categoryIds?.includes(category.id);
            const children = menuChildren(category, graph, locale);
            return <div className="group relative flex" key={category.id}>
              <a className={`inline-flex items-center border-b-2 px-6 text-base font-bold no-underline transition ${active ? "border-[#2ec39f] text-white" : "border-transparent text-[#2ec39f] hover:text-white"}`} href={getCategoryPath(category, graph)}>{categoryLabel(category)}</a>
              {children.length > 0 && <div className="absolute left-1/2 top-full z-50 hidden w-[25rem] -translate-x-1/2 gap-1 bg-[#00524f] px-8 py-6 shadow-2xl group-hover:grid group-focus-within:grid">{children.map((item: any, index: number) => <a className="border-b border-white/10 px-2 py-3 text-lg text-[#2ec39f] no-underline hover:text-white" href={item.href} key={`${item.href}-${index}`}>{item.label}</a>)}</div>}
            </div>;
          })}
        </div>
      </nav>
    </header>

    {isArticle && <TrialBanner locale={locale} />}
    <main aria-label={subject.title ?? subject.name}>{children}</main>

    <footer className="mt-20 bg-[#00524f] text-white">
      <div className="mx-auto grid w-full max-w-[70rem] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1.1fr]">
        <div><BrandLogo graph={graph} /><p className="mt-5 max-w-xs text-lg font-bold leading-7">{labels.tagline}</p><p className="mt-8 text-sm text-white/65">© {new Date().getFullYear()} Learnfield GmbH</p></div>
        <div><h2 className="text-sm font-black uppercase tracking-[0.12em]">{labels.navigation}</h2><div className="mt-5 grid gap-3 text-sm"><a className="text-white/80 no-underline hover:text-white" href={homePath}>{labels.magazine}</a>{categories.slice(0, 4).map((category: any) => <a className="text-white/80 no-underline hover:text-white" href={getCategoryPath(category, graph)} key={category.id}>{categoryLabel(category)}</a>)}</div></div>
        <div><h2 className="text-sm font-black uppercase tracking-[0.12em]">{labels.company}</h2><div className="mt-5 grid gap-3 text-sm"><a className="text-white/80 no-underline hover:text-white" href="https://www.skoove.com/">Skoove</a><a className="text-white/80 no-underline hover:text-white" href="https://www.skoove.com/en/about">About</a><a className="text-white/80 no-underline hover:text-white" href="https://www.skoove.com/en/contact">Contact</a><a className="text-white/80 no-underline hover:text-white" href="https://help.skoove.com/">FAQ</a></div></div>
        <div><h2 className="text-sm font-black uppercase tracking-[0.12em]">{labels.legal}</h2><div className="mt-5 grid gap-3 text-sm"><a className="text-white/80 no-underline hover:text-white" href="/blog/terms/">Terms &amp; Conditions</a><a className="text-white/80 no-underline hover:text-white" href="/blog/privacy/">Privacy</a><a className="text-white/80 no-underline hover:text-white" href="/blog/imprint/">Imprint</a></div>{locales.length > 1 && <details className="group mt-8 border-t border-white/20 pt-5"><summary className="cursor-pointer list-none text-sm font-black marker:hidden [&::-webkit-details-marker]:hidden">{labels.language}: {locales.find((item: any) => item.code === locale)?.label ?? locale} +</summary><div className="mt-4 grid grid-cols-2 gap-2">{locales.map((item: any) => <a className="text-sm text-white/75 no-underline hover:text-white" href={getSkooveHomePath(item.code)} key={item.code} hrefLang={item.hreflang || item.code}>{item.label}</a>)}</div></details>}</div>
      </div>
    </footer>
  </div>;
}
