import axios from 'axios'
import { SERVER_ADDRESS } from './constants'

const api = axios.create({
    baseURL: SERVER_ADDRESS
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