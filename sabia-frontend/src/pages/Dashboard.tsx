import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo ao Sabiá!
        </h1>
        <p className="text-gray-600 mt-1">
          Seu assistente inteligente de suporte com base de conhecimento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Perfil */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-semibold text-indigo-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          {user && 'profile' in user && (user as any).profile && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              (user as any).profile.role === 'gestor'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {(user as any).profile.role === 'gestor' ? 'Gestor' : 'Operador'}
            </span>
          )}
        </div>

        {/* Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Status do Sistema</h3>
          <div className="space-y-2">
            <p className="text-sm flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Conectado
            </p>
            <p className="text-sm text-gray-600">
              API: {import.meta.env.VITE_API_URL || 'localhost:8000'}
            </p>
            <p className="text-sm text-gray-600">
              Supabase PostgreSQL
            </p>
          </div>
        </div>

        {/* Próximos Passos */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Próximos Passos</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Autenticação configurada</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Base de conhecimento</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-gray-300">○</span>
              <span>Configurar provedor de IA</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-gray-300">○</span>
              <span>Criar primeiros artigos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
