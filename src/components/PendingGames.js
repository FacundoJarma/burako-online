import React from 'react';
import Button from './Button';

function PendingGames({ game }) {
    return (
        <li className="relative duration-300 w-full max-w-md z-20 bg-slate-900 rounded-2xl border-2 border-slate-800 p-6">
            <h3 className="text-2xl font-bold mb-6">
                Creador: <span className="text-slate-400">{game.created_by}</span>
            </h3>

            {
                game.status === 'playing' &&
                <p className="text-lg font-bold mb-4">
                    Tu Equipo: {game.myTeam}, con: {game.teammate?.username || 'Nadie aún'}
                </p>}

            <span className="font-semibold">En el lobby estan:</span>
            <ul className="mb-4">
                {game.players.map((player) => (
                    <li key={player.id} className="text-slate-400">
                        {player.username} {player.id === game.myId ? '(Tú)' : ''}
                    </li>
                ))}
            </ul>

            <div
                className={`absolute top-2 right-2 grid place-content-center py-1 px-3 rounded-full ${game.status === 'waiting' ? 'bg-orange-500' : 'bg-green-500'
                    } inline-block text-white font-semibold`}
            >
                {game.status}
            </div>

            <Button text="Unirse" onClick={() => window.location.href = `/rooms/${game.code}`} />

        </li>
    );
}

export default PendingGames;
