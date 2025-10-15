import React from 'react'

function PlayOptionCard({ option, index, onClick }) {
    return (
        <button
            onClick={onClick}
            key={index}
            className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8
             hover:border-slate-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10
             hover:cursor-pointer"
        >
            <div
                className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}
            />

            <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div
                    className={`p-4 bg-gradient-to-br ${option.gradient} rounded-xl text-white group-hover:scale-110 transition-transform duration-300`}
                >
                    {option.icon}
                </div>
                <h3 className="text-2xl font-bold text-white">{option.title}</h3>
                <p className="text-slate-400 leading-relaxed">{option.description}</p>
            </div>

        </button>)
}

export default PlayOptionCard