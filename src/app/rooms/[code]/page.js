'use client'
import { useEffect, useState, use } from 'react';
import { useGameLobby } from '@/hooks/UseGameLobby';
import { changeTeam, getUserId, startGame } from '@/utils/gamesManager';
import { IconArrowLeft } from '@tabler/icons-react';
import Button from '@/components/Button';

export default function Page({ params }) {
    const { code } = use(params);
    const { lobby } = useGameLobby(code);
    const [loadingTeam, setLoadingTeam] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        getUserId().then(setUserId).catch(console.error);
    }, []);

    if (!lobby) return <p className="text-white">Cargando lobby...</p>;

    const handleJoinTeam = async (team) => {
        if (loadingTeam !== null || lobby.freeSlots[team] <= 0) return;
        try {
            setLoadingTeam(team);
            await changeTeam(lobby.id, team);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTeam(null);
        }
    };

    const handleStartGame = async () => {
        try {
            await startGame(lobby.id);
        } catch (err) {
            console.error(err);
        }
    };

    const imOwner = userId === lobby.created_by_uuid;
    const isPlaying = lobby.status === 'playing';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            <div className="w-full max-w-2xl">
                <h2 className='text-center font-bold text-5xl mb-12'>{code}</h2>
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl p-6">
                    <a href='/'>
                        <IconArrowLeft />
                    </a>
                    <h1 className='text-3xl font-bold'>Partida de {lobby.created_by}</h1>
                    <p className='my-4'>
                        Este es el Lobby de la sala, deberás seleccionar tu equipo y esperar a que se inicie la partida.
                    </p>

                    <div className='grid grid-cols-2 gap-4'>
                        {[1, 2].map((teamNumber) => (
                            <div key={teamNumber} className="bg-slate-800/40 p-4 rounded-xl">
                                <h2 className="text-xl font-semibold mb-2">
                                    Equipo {teamNumber} (libres: {lobby.freeSlots[teamNumber]})
                                </h2>
                                <ul>
                                    {lobby.teams[teamNumber].length > 0 ? (
                                        lobby.teams[teamNumber].map((p) => (
                                            <li key={p.id} className={`p-1 my-1 rounded ${p.id === userId ? 'bg-green-900' : ''}`}>
                                                {p.username}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="italic text-slate-400">Vacío</li>
                                    )}
                                </ul>
                                <Button
                                    text={
                                        loadingTeam === teamNumber
                                            ? "Cargando..."
                                            : lobby.freeSlots[teamNumber] > 0
                                                ? "Unirse"
                                                : "Sin espacio"
                                    }
                                    type="button"
                                    onClick={() => handleJoinTeam(teamNumber)}
                                    disabled={lobby.freeSlots[teamNumber] <= 0 || loadingTeam !== null}
                                />
                            </div>
                        ))}
                    </div>

                    {imOwner && (
                        <div className='mt-6'>

                            <Button
                                text="Comenzar partida"
                                type="button"
                                onClick={() => handleStartGame()}
                                disabled={isPlaying}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
