import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import './index.css'
import './styles/professional-ui.css'
import './styles/listing-card-glow.css'
import './styles/listing-cards-unified.css'
import './styles/creator-profile-card.css'
import './styles/home-preview-cards.css'
import './styles/home-features-section.css'
import './styles/listing-card-stats-footer.css'
import './styles/domain-ticker.css'
import './i18n/index';
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
