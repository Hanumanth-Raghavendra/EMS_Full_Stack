import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt')

        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization =
                `Bearer ${token}`
        }

        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jwt')
            localStorage.removeItem('username')
            localStorage.removeItem('role')
            localStorage.removeItem('employeeId')

            window.dispatchEvent(
                new Event('auth:logout')
            )
        }

        return Promise.reject(error)
    }
)

export default api