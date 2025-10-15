import Button from '@/components/Button';
import { Input } from '@/components/Input';
import Modal from '@/components/Modal';
import PlayOptionCard from '@/components/PlayOptionCard';
import { createGame } from '@/utils/gamesManager';
import React, { useState } from 'react'

function CreateLobby() {

    const [open, setOpen] = useState(false);
    const [participants, setParticipants] = useState(2);
    const [points, setPoints] = useState(3000);

    const option = {
        title: "Crear Sala",
        description: "Para crear un juego privado",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        gradient: "from-purple-500 to-pink-500",
    }

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const { code } = await createGame(participants, points);
            window.location.href = `/rooms/${code}`
        } catch (error) {
            console.error("Error creando el juego:", error);
        }
    }

    return (
        <>
            <Modal open={open} setOpen={setOpen} >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Crear Sala</h1>
                    <p className="text-slate-200">Rellena los datos para poder empezar a jugar.</p>
                </div>
                <form className="space-y-6" onSubmit={handleCreate}>

                    <Input id="participants" label="# Participantes" value={participants} type="number" onChange={(e) => {
                        if (e.target.value == "2" || e.target.value == "4" || e.target.value == "") {
                            setParticipants(e.target.value)
                        }
                    }
                    } />
                    <Input id="points" label="Puntos máximos" value={points} type="number" onChange={(e) => setPoints(e.target.value)} />
                    <Button text="Crear sala" type="submit" />
                </ form >
            </Modal>

            <PlayOptionCard option={option} onClick={() => setOpen(true)} />
        </>
    )
}

export default CreateLobby