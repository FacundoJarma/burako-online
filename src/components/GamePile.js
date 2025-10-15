import React from 'react'
import Tile from './Tile'
import Button from './Button'

function GamePile({ turnStep, isMyTurn, handleDraw }) {

    return (
        <div >
            <div className='border border-slate-700 p-2 rounded-2xl gap-2 bg-slate-800'>

                <div className='w-20 h-40 bg-slate-900 rounded-2xl text-6xl grid place-content-center'>
                    ?
                </div>

            </div>
            {
                isMyTurn && turnStep === 'choose_draw' && (
                    <button
                        onClick={() => handleDraw("deck")}
                        className="mt-4 hover:cursor-pointer text-sm w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all"
                    >
                        Agarrar
                    </button>
                )
            }
        </div >
    )
}

export default GamePile