import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { detectPlatform, PlatformProvider } from "./platform"
import { OpenInTelegramScreen } from "./screens/open-in-telegram-screen"

const platform = detectPlatform()
// Боевая сборка вне Telegram — не мок, а переход в бота (dev и однофайловая сборка для проверок — с моком).
const webStub = platform.kind === "browser" && import.meta.env.VITE_TELEGRAM_ONLY === "true"
// Цвета шапки и фона Telegram — под --background / --card темы violet.
platform.init({ header: "#0f0b24", background: "#0f0b24", bottomBar: "#1b1638" })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {webStub ? (
      <OpenInTelegramScreen />
    ) : (
      <PlatformProvider platform={platform}>
        <App />
      </PlatformProvider>
    )}
  </StrictMode>,
)
