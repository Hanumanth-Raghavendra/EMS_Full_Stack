import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi } from '../api/endpoints'
import { getErrorMessage } from '../api/client'
import { loadSession } from './session'

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
    try {
        return await authApi.login(credentials)
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Unable to sign in. Please try again.'))
    }
})

export function buildInitialState(session = loadSession()) {
    return {
        token: session?.token ?? null,
        expiresAt: session?.expiresAt ?? null,
        user: session?.user ?? null,
        status: 'idle',
        error: null,
        signedOutReason: null,
        // Who was signed in before the last sign-out; decides whether the next
        // sign-in may return to the page that person was on.
        previousUsername: null,
    }
}

const authSlice = createSlice({
    name: 'auth',
    initialState: buildInitialState,
    reducers: {
        /** A new token + profile (e.g. after changing the password). */
        sessionStarted(state, action) {
            state.token = action.payload.token
            state.expiresAt = action.payload.expiresAt
            state.user = action.payload.user
            state.error = null
            state.signedOutReason = null
        },
        userUpdated(state, action) {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }
            }
        },
        signedOut(state, action) {
            state.previousUsername = state.user?.username ?? state.previousUsername ?? null
            state.token = null
            state.expiresAt = null
            state.user = null
            state.status = 'idle'
            state.error = null
            state.signedOutReason = action.payload ?? null
        },
        clearAuthMessages(state) {
            state.error = null
            state.signedOutReason = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading'
                state.error = null
                state.signedOutReason = null
            })
            .addCase(login.fulfilled, (state, action) => {
                state.status = 'idle'
                state.token = action.payload.token
                state.expiresAt = action.payload.expiresAt
                state.user = action.payload.user
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'idle'
                state.error = action.payload || 'Unable to sign in.'
            })
    },
})

export const { sessionStarted, userUpdated, signedOut, clearAuthMessages } = authSlice.actions

export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => Boolean(state.auth.token && state.auth.user)

export default authSlice.reducer
