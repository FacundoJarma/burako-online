import React from 'react'

function Button({ text, type, onClick, disabled = false }) {
    return (
        <button
            disabled={disabled}
            type={type}
            onClick={type === 'submit' ? undefined : onClick}
            className="hover:cursor-pointer text-lg w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all"
        >
            {text}
        </button>)
}

export default Button