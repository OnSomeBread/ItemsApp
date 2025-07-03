import axios from 'axios'

const api = axios.create({
    // the backend server location which could be made into an environment var
    baseURL: 'https://localhost:8000'
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if(token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config

    },
    (error) => {return Promise.reject(error)})

export default api