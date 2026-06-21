import { THEME_STORAGE_KEY } from "@/config/theme";

/** Applies saved theme before paint to prevent flash (FOUC). */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=document.documentElement;if(t==="dark"){d.classList.add("dark");}else if(t==="system"){if(window.matchMedia("(prefers-color-scheme: dark)").matches)d.classList.add("dark");else d.classList.remove("dark");}else{d.classList.remove("dark");}}catch(e){}})();`;
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}
