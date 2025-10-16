import React from 'react'
import * as motion from "motion/react-client"

function GamePile({ turnStep, isMyTurn, handleDraw, centralPileLength }) {

    // Estilo personalizado para simular la profundidad del mazo usando box-shadow
    const deckShadowStyle = {
        boxShadow:
            // Sombra para el grosor lateral y superior
            '-2px 2px 0 0 #334155, -4px 4px 0 0 #334155, -6px 6px 0 0 #334155, -8px 8px 0 0 #1E293B',
        // Añade una sombra de elevación
        // '0 10px 20px rgba(0, 0, 0, 0.5)'
    };


    const containerClasses =
        'ml-12 w-24 h-40 bg-black/20 rounded-lg text-6xl grid place-content-center border-2 border-slate-700 ' +
        'transform-gpu origin-center rotate-x-[25deg] rotate-z-[-5deg] ';

    return (
        <motion.div
            whileHover={{ scale: 1.1 }
            }
            whileTap={{ scale: 0.8 }}
            className='flex flex-col items-center hover:cursor-pointer hover:scale-105 ' style={{ perspective: '800px' }}>

            {/* Contenedor del mazo: aplicamos la sombra de volumen y la rotación 3D */}
            < div
                className={containerClasses}
                style={deckShadowStyle}
            >
                {centralPileLength}
            </div >

            {/* Botón de acción */}
            {
                isMyTurn && turnStep === 'choose_draw' && (
                    <button
                        onClick={() => handleDraw("deck")}
                        className="mt-12 hover:cursor-pointer text-sm w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all"
                    >
                        Agarrar
                    </button>
                )
            }
        </motion.div >
    )
}

export default GamePile