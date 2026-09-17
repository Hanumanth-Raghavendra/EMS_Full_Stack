import {
    createAsyncThunk,
    createSlice,
} from '@reduxjs/toolkit'
import api from '../api/axios'

const storedToken = localStorage.getItem('jwt')
const storedUsername = localStorage.getItem('username')
const storedRole = localStorage.getItem('role')
const storedEmployeeId = localStorage.getItem('employeeId')

const initialState = {
    token: storedToken || null,
    username: storedUsername || null,
    role: storedRole || null,
    employeeId: storedEmployeeId ? Number(storedEmployeeId) : null,
    isAuthenticated: Boolean(storedToken),
    loading: false,
    error: null,
}

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ username, password }, thunkAPI) => {
        try {
            const response = await api.post(
                '/api/auth/login',
                {
                    username,
                    password,
                }
            )

            return response.data
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ||
                'Unable to login. Please check your credentials.'
            )
        }
    }
)

const authSlice = createSlice({
    name: 'auth',

    initialState,

    reducers: {
        login: (state, action) => {
            const {
                token,
                username,
                role,
                employeeId,
            } = action.payload

            state.token = token
            state.username = username
            state.role = role
            state.employeeId = employeeId || null
            state.isAuthenticated = true
            state.error = null

            localStorage.setItem('jwt', token)

            if (username) {
                localStorage.setItem(
                    'username',
                    username
                )
            }

            if (role) {
                localStorage.setItem(
                    'role',
                    role
                )
            }

            if (employeeId != null) {
                localStorage.setItem(
                    'employeeId',
                    String(employeeId)
                )
            }
        },

        logout: (state) => {
            state.token = null
            state.username = null
            state.role = null
            state.employeeId = null
            state.isAuthenticated = false
            state.loading = false
            state.error = null

            localStorage.removeItem('jwt')
            localStorage.removeItem('username')
            localStorage.removeItem('role')
            localStorage.removeItem('employeeId')
        },

        clearAuthError: (state) => {
            state.error = null
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(
                loginUser.pending,
                (state) => {
                    state.loading = true
                    state.error = null
                }
            )

            .addCase(
                loginUser.fulfilled,
                (state, action) => {
                    const {
                        token,
                        username,
                        role,
                        employeeId,
                    } = action.payload

                    state.loading = false
                    state.token = token
                    state.username = username
                    state.role = role
                    state.employeeId = employeeId || null
                    state.isAuthenticated = true
                    state.error = null

                    localStorage.setItem(
                        'jwt',
                        token
                    )

                    localStorage.setItem(
                        'username',
                        username
                    )

                    localStorage.setItem(
                        'role',
                        role
                    )

                    if (employeeId != null) {
                        localStorage.setItem(
                            'employeeId',
                            String(employeeId)
                        )
                    }
                }
            )

            .addCase(
                loginUser.rejected,
                (state, action) => {
                    state.loading = false
                    state.isAuthenticated = false
                    state.error =
                        action.payload ||
                        'Login failed.'
                }
            )
    },
})

export const {
    login,
    logout,
    clearAuthError,
} = authSlice.actions

export default authSlice.reducer