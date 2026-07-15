/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario } from '../types';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
  RefreshCw,
  TrendingUp,
  UserCog,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
  colaboradoresCount: number;
  tarefasPendentesCount: number;
  currentUser: Usuario | null;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onReset,
  colaboradoresCount,
  tarefasPendentesCount,
  currentUser,
  onLogout,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users, badge: colaboradoresCount },
    { id: 'usuarios', label: 'Gerenciar Usuários', icon: UserCog },
    { id: 'tarefas', label: 'Tarefas de Liderança', icon: CheckSquare, badge: tarefasPendentesCount },
    { id: 'analytics', label: 'Analytics & PDIs', icon: BarChart3 },
    { id: 'config', label: 'Configuração Banco', icon: Settings },
  ];

  return (
    <aside id="sidebar-container" className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 text-slate-900 font-bold p-1.5 rounded-lg flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Gestão360</span>
        </div>
        <p className="text-xs text-slate-400">Liderança Pro</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-semibold shadow-lg shadow-teal-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-100'} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-slate-950 text-teal-400 font-bold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Footer */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-teal-400 shrink-0">
            {currentUser?.nome ? currentUser.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate">{currentUser?.nome || 'Usuário'}</h4>
            <p className="text-[10px] text-slate-500 truncate">{currentUser?.email || 'email@empresa.com'}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/35 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-bold transition duration-150 cursor-pointer justify-center uppercase tracking-wider"
        >
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
