"use client"

import Button from "@/components/Button";
import { Input } from "@/components/Input";
import Modal from "@/components/Modal"
import PendingGames from "@/components/PendingGames";
import PlayOptionCard from "@/components/PlayOptionCard"
import CreateLobby from "@/sections/CreateLobby";
import JoinLobby from "@/sections/JoinLobby";
import { getPendingGames } from "@/utils/gamesManager";
import { useEffect, useState } from "react";

export default function HomePage() {
  const menuOptions = [

    {
      title: "Jugar contra Terceros",
      description: "Encuentra oponentes aleatorios en línea",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      gradient: "from-orange-500 to-red-500",
    },
  ]

  const [pendingGames, setPendingGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingGames = async () => {
      try {
        const data = await getPendingGames()
        setPendingGames(data);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo juegos pendientes:', error);
        setLoading(false);
      }
    };

    fetchPendingGames();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Burako Online</h1>
          <button className="px-4 py-2 text-lg text-slate-400 hover:text-white transition-colors">Cerrar Sesión</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4 ">
            Bienvenido
          </h2>
          <p className="text-xl text-slate-400">Selecciona una opción para comenzar a jugar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <CreateLobby />
          <JoinLobby />
          {menuOptions.map((option, index) => (
            <PlayOptionCard key={index} option={option} index={index} onClick={() => setOpen(true)} />
          ))}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-200 mt-12">
            Juegos Pendientes:
          </h2>
          {
            loading ? <p>Cargando...</p> :
              <ul className="grid grid-cols-3 gap-6 py-6">
                {
                  pendingGames.map((game) => (
                    <PendingGames key={game.id} game={game} />
                  ))
                }
              </ul>}
        </div>

      </main>
    </div>
  )
}
