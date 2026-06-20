/** Inline script to apply saved density before paint (avoids layout flash). */
export function UiDensityScript() {
  const script = `(function(){try{var d=localStorage.getItem("feldops-ui-density");if(d==="compact")document.documentElement.dataset.density="compact";}catch(e){}})();`;
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}
