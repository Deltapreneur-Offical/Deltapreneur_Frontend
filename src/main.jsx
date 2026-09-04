import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import './styles/search-glow.css'
import './index.css'
import './styles/professional-ui.css'
import './styles/listing-card-glow.css'
import './styles/listing-cards-unified.css'
import './styles/creator-profile-card.css'
import './styles/home-preview-cards.css'
import './styles/home-section-themes.css'
import './styles/home-features-section.css'
import './styles/listing-card-stats-footer.css'
import './i18n/index';
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { LanguageProvider } from './context/LanguageContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { CategoryProvider } from './context/CategoryContext'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <LanguageProvider>
      <CurrencyProvider>
        <CategoryProvider>
          <App />
        </CategoryProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </ErrorBoundary>,
)
