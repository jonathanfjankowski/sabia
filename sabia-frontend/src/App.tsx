import { Routes, Route } from 'react-router-dom'

// Páginas (serão criadas)
// import Login from './pages/Login'
// import Chat from './pages/Chat'
// import KnowledgeBase from './pages/KnowledgeBase'
// import Admin from './pages/Admin'

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🦜 Sabiá v3.0</h1>
      <p>Chatbot Inteligente com Base de Conhecimento</p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => alert('Rota /chat será implementada')}>
          💬 Chat Direto
        </button>
        <button onClick={() => alert('Rota /kb será implementada')}>
          📚 Base de Conhecimento
        </button>
        <button onClick={() => alert('Rota /admin será implementada')}>
          ⚙️ Painel Admin
        </button>
      </div>
      <footer style={{ marginTop: '3rem', fontSize: '0.9rem', opacity: 0.7 }}>
        <p>Stack: Laravel + React + Vite + PostgreSQL (pgvector)</p>
      </footer>
    </div>
  )
}

export default App
