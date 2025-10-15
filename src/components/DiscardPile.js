import React from 'react'
import Tile from './Tile'

function DiscardPile({ discardPile, turnStep, isMyTurn, handleDraw, handleDiscard }) {

    return (
        <div>

            <button


                className={`
            ${isMyTurn && turnStep === 'choose_draw' || turnStep === 'melds' ? 'hover:cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
            grid grid-cols-4 grid-rows-4 w-[10em] min-h-48 border border-slate-800 p-2 rounded-2xl gap-2`}

                onClick={
                    isMyTurn &&
                        turnStep === 'melds' ? () => handleDiscard() :
                        turnStep === 'choose_draw' ? () => handleDraw('discard') : () => { }
                }
            >
                {
                    discardPile.map((tile, index) => (
                        <Tile key={index} card={tile} />
                    ))
                }
            </button>

        </div >
    )
}

export default DiscardPile