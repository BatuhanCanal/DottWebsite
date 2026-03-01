/* ========================================
   Gazi DOTT — Shared Tailwind Config
   Single source of truth for all pages.
   ======================================== */

tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#f48c25",
                "background-light": "#f8f7f5",
                "background-dark": "#231a10",
                "card-dark": "#342618",
                "border-dark": "#493622",
                "text-muted": "#cbad90"
            },
            fontFamily: {
                display: ["Space Grotesk", "sans-serif"],
                sans: ["Space Grotesk", "sans-serif"]
            },
        },
    },
}
