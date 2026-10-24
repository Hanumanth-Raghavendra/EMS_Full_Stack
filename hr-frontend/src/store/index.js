import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import { setTokenReader } from '../api/client'
import { saveSession } from './session'

const rootReducer = combineReducers({ auth: authReducer })

export function createStore(preloadedState) {
    const store = configureStore({ reducer: rootReducer, preloadedState })

    let lastToken = store.getState().auth.token
    let lastUser = store.getState().auth.user
    store.subscribe(() => {
        const { token, expiresAt, user } = store.getState().auth
        if (token !== lastToken || user !== lastUser) {
            lastToken = token
            lastUser = user
            saveSession(token ? { token, expiresAt, user } : null)
        }
    })

    setTokenReader(() => store.getState().auth.token)
    return store
}

const store = createStore()

export default store
