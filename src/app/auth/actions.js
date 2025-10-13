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


    const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                username: data.username,
            },
        },
    })
    if (error) {
        return error
    }

    revalidatePath('/', 'layout')
    redirect('/')
}