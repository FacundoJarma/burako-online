'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(data) {
    const supabase = await createClient()


    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return error
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(data) {
    const supabase = await createClient()

    // 1. Crear usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
    })

    if (authError) {
        return authError
    }
    const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id, // usar el id del usuario creado
        username: data.username,
    })

    if (dbError) {
        return dbError
    }

    // 3. Revalidar y redirigir
    revalidatePath('/', 'layout')
    redirect('/')
}