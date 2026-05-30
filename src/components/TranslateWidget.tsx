import React, { useEffect, useState } from "react";

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

const LANGUAGES = [
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "as", label: "অসমীয়া (Assamese)" },
  { code: "en", label: "English" },
];

export default function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("en");

  const translatePage = (langCode: string) => {
    setSelected(langCode);

    // Use Google Translate cookie method
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
    document.cookie = `googtrans=/en/${langCode}; path=/`;

    // If google translate is loaded, trigger it
    const select = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
    } else {
      // fallback: reload with cookie set
      window.location.reload();
    }
  };

  useEffect(() => {
    // Inject hidden Google Translate element (required for translation to work)
    if (!document.getElementById("google-translate-script")) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages:
              "hi,ta,te,bn,kn,ml,gu,mr,pa,or,as,ur,en",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      };

      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    // Hide Google's default UI but keep it functional
    const style = document.createElement("style");
    style.innerHTML = `
      .goog-te-banner-frame { display: none !important; }
      body { top: 0 !important; }
      #google_translate_element { display: none !important; }
      .goog-te-gadget { display: none !important; }
      .skiptranslate { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: "none" }} />

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(249,115,22,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 6px 25px rgba(249,115,22,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 4px 20px rgba(249,115,22,0.5)";
        }}
        title="Translate"
      >
        🌐
      </button>

      {/* Language Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "86px",
            right: "24px",
            zIndex: 9998,
            background: "#1a1a1a",
            borderRadius: "16px",
            padding: "16px",
            width: "220px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(249,115,22,0.3)",
            animation: "fadeUp 0.2s ease",
            maxHeight: "380px",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              🌐
            </div>
            <span
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              SELECT LANGUAGE
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "rgba(249,115,22,0.2)",
              marginBottom: "10px",
            }}
          />

          {/* Language List */}
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                translatePage(lang.code);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "9px 12px",
                marginBottom: "4px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "13px",
                fontWeight: selected === lang.code ? 700 : 400,
                background:
                  selected === lang.code
                    ? "linear-gradient(135deg, #f97316, #ea580c)"
                    : "rgba(255,255,255,0.05)",
                color: selected === lang.code ? "#fff" : "#ccc",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selected !== lang.code)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(249,115,22,0.15)";
              }}
              onMouseLeave={(e) => {
                if (selected !== lang.code)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.05)";
              }}
            >
              {lang.label}
            </button>
          ))}

          {/* Footer */}
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "10px",
              color: "#555",
              textAlign: "center",
            }}
          >
            Powered by Google Translate
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}