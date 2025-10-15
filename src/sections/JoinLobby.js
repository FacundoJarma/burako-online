import Button from '@/components/Button';
import { Input } from '@/components/Input';
import Modal from '@/components/Modal';
import PlayOptionCard from '@/components/PlayOptionCard';
import { joinGame } from '@/utils/gamesManager';
import { redirect } from 'next/navigation';
import React, { useState } from 'react'

function JoinLobby() {

    const [open, setOpen] = useState(false);

    const option = {
        title: "Unirse a Sala",
        description: "Ingresa el código de una sala",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
            </svg>
        ),
        gradient: "from-blue-500 to-cyan-500",
    }

    const [code, setCode] = useState("");

    const handleJoin = async (e) => {
        e.preventDefault();
        try {
            await joinGame(code);
            setOpen(false);
            window.location.replace("/rooms/" + code);
        } catch (error) {
            console.error("Error uniendose al juego:", error);
        }
    }

    return (
        <>
            <Modal open={open} setOpen={setOpen} >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Unirse a una Sala</h1>
                    <p className="text-slate-200">Rellena los datos para poder empezar a jugar.</p>
                </div>
                <form className="space-y-6" onSubmit={handleJoin}>

                    <Input id="gameCode" label="Codigo" value={code} type="text" onChange={(e) => setCode(e.target.value)} />
                    <Button text="Unirse sala" type="submit" />
                </ form >
            </Modal>

            <PlayOptionCard option={option} onClick={() => setOpen(true)} />
        </>
    )
}

export default JoinLobby